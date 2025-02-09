import requests
from fastapi import APIRouter, HTTPException
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
from backend.db import stocks_collection  # Import MongoDB collection

# Load environment variables
load_dotenv()

router = APIRouter()

# Get API key from environment
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")

# API Base URL
ALPHA_VANTAGE_URL = "https://www.alphavantage.co/query"

@router.get("/{symbol}")
def get_stock_data(symbol: str):
    """
    Fetch stock data with caching to minimize API calls.
    """
    if not ALPHA_VANTAGE_API_KEY:
        raise HTTPException(status_code=500, detail="Alpha Vantage API key is missing")

    # Ensure symbol is uppercase
    symbol = symbol.upper()

    # Check MongoDB for cached stock data
    cached_stock = stocks_collection.find_one({"symbol": symbol})
    
    # If data exists and was updated within the last 5 minutes, return cached data
    if cached_stock:
        last_updated = cached_stock.get("last_updated")

        if last_updated:
            # Convert last_updated from stored format (if necessary)
            if isinstance(last_updated, str):
                last_updated = datetime.fromisoformat(last_updated)

            if datetime.utcnow() - last_updated < timedelta(minutes=5):
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
        response = requests.get(ALPHA_VANTAGE_URL, params=params, timeout=10)
        response.raise_for_status()  # Raises an HTTPError if response is not 200
        data = response.json()
    except requests.RequestException as e:
        print(f"Alpha Vantage API request failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch stock data from Alpha Vantage")

    # Debug: Print API response
    print("Alpha Vantage Response:", data)

    # Validate the response structure
    if "Global Quote" not in data or not data["Global Quote"]:
        raise HTTPException(status_code=404, detail=f"Stock symbol '{symbol}' not found or invalid")

    quote = data["Global Quote"]

    # Handle missing keys safely
    try:
        stock_data = {
            "symbol": quote.get("01. symbol", symbol),  # Use requested symbol as fallback
            "price": float(quote.get("05. price", 0)),  # Convert to float, default 0
            "change": float(quote.get("09. change", 0)),
            "percent_change": quote.get("10. change percent", "0%"),
            "last_updated": datetime.utcnow().isoformat()  # Store in ISO format for MongoDB
        }
    except ValueError:
        raise HTTPException(status_code=500, detail="Invalid response from Alpha Vantage")

    # Store or update stock data in MongoDB
    stocks_collection.update_one(
        {"symbol": stock_data["symbol"]}, 
        {"$set": stock_data}, 
        upsert=True
    )

    return {**stock_data, "source": "Alpha Vantage API"}