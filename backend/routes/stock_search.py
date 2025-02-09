import logging
import os
from datetime import datetime, timedelta

import requests
from fastapi import APIRouter, HTTPException, status
from dotenv import load_dotenv

from backend.db import stocks_collection  # Import MongoDB collection

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

router = APIRouter()

# Get API key from environment
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")
if not ALPHA_VANTAGE_API_KEY:
    logger.error("Alpha Vantage API key is missing in the environment variables.")

# API Base URL
ALPHA_VANTAGE_URL = "https://www.alphavantage.co/query"

# Create a persistent requests session with retries for improved performance.
session = requests.Session()
retries = requests.adapters.Retry(
    total=3,
    backoff_factor=0.3,
    status_forcelist=[500, 502, 503, 504],
    allowed_methods=["GET"]
)
adapter = requests.adapters.HTTPAdapter(max_retries=retries)
session.mount("https://", adapter)
session.mount("http://", adapter)


def _is_cache_valid(cached_stock: dict) -> bool:
    """Check if the cached stock data was updated within the last 5 minutes."""
    last_updated = cached_stock.get("last_updated")
    if not last_updated:
        return False
    if isinstance(last_updated, str):
        try:
            last_updated = datetime.fromisoformat(last_updated)
        except ValueError:
            logger.warning("Cached last_updated value is not in ISO format: %s", last_updated)
            return False
    return datetime.utcnow() - last_updated < timedelta(minutes=5)


@router.get("/{symbol}")
def get_stock_data(symbol: str):
    """
    Fetch stock data with caching to minimize API calls.
    """
    if not ALPHA_VANTAGE_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Alpha Vantage API key is missing"
        )

    # Normalize the symbol
    symbol = symbol.strip().upper()

    # Check MongoDB for cached stock data
    cached_stock = stocks_collection.find_one({"symbol": symbol})
    if cached_stock and _is_cache_valid(cached_stock):
        return {
            "symbol": cached_stock["symbol"],
            "price": cached_stock["price"],
            "change": cached_stock["change"],
            "percent_change": cached_stock["percent_change"],
            "last_updated": cached_stock["last_updated"],
            "source": "MongoDB Cache"
        }

    # Fetch new stock data from Alpha Vantage
    params = {
        "function": "GLOBAL_QUOTE",
        "symbol": symbol,
        "apikey": ALPHA_VANTAGE_API_KEY
    }
    try:
        response = session.get(ALPHA_VANTAGE_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as e:
        logger.error("Alpha Vantage API request failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch stock data from Alpha Vantage"
        )

    logger.debug("Alpha Vantage Response: %s", data)

    global_quote = data.get("Global Quote")
    if not global_quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock symbol '{symbol}' not found or invalid"
        )

    try:
        stock_data = {
            "symbol": global_quote.get("01. symbol", symbol),
            "price": float(global_quote.get("05. price", 0)),
            "change": float(global_quote.get("09. change", 0)),
            "percent_change": global_quote.get("10. change percent", "0%"),
            "last_updated": datetime.utcnow().isoformat()
        }
    except (ValueError, TypeError) as e:
        logger.error("Error processing Alpha Vantage response: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invalid response from Alpha Vantage"
        )

    # Update the MongoDB cache with the new stock data
    stocks_collection.update_one(
        {"symbol": stock_data["symbol"]},
        {"$set": stock_data},
        upsert=True
    )

    return {**stock_data, "source": "Alpha Vantage API"}