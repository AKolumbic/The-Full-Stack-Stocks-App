import requests
from fastapi import APIRouter, HTTPException
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
from backend.db import stocks_collection  # Import MongoDB collection

load_dotenv()
router = APIRouter()

# Get API key from environment
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")

@router.get("/stocks/{symbol}")
def get_stock_data(symbol: str):
    """
    Fetch stock data, with caching to reduce API calls.
    """
    if not ALPHA_VANTAGE_API_KEY:
        raise HTTPException(status_code=500, detail="Alpha Vantage API key is missing")

    # Check MongoDB for cached stock data
    cached_stock = stocks_collection.find_one({"symbol": symbol})
    
    # If data exists and was updated within the last 5 minutes, return cached data
    if cached_stock:
        last_updated = cached_stock.get("last_updated")
        if last_updated and datetime.utcnow() - last_updated < timedelta(minutes=5):
            return {
                "symbol": cached_stock["symbol"],
                "price": cached_stock["price"],
                "change": cached_stock["change"],
                "percent_change": cached_stock["percent_change"],
                "source": "MongoDB Cache"
            }

    # Fetch new stock data from Alpha Vantage
    url = "https://www.alphavantage.co/query"
    params = {
        "function": "GLOBAL_QUOTE",
        "symbol": symbol.upper(),  # Ensure uppercase stock symbols
        "apikey": ALPHA_VANTAGE_API_KEY
    }
    response = requests.get(url, params=params)
    data = response.json()

    # Debug: Print API response
    print("Alpha Vantage Response:", data)

    # Validate the response structure
    if "Global Quote" not in data or not data["Global Quote"]:
        raise HTTPException(status_code=404, detail=f"Stock symbol '{symbol}' not found or invalid")

    quote = data["Global Quote"]

    # Handle missing keys
    stock_data = {
        "symbol": quote.get("01. symbol", symbol),  # Use requested symbol as fallback
        "price": float(quote.get("05. price", 0)),  # Default to 0 if missing
        "change": float(quote.get("09. change", 0)),
        "percent_change": quote.get("10. change percent", "0%"),
        "last_updated": datetime.utcnow()
    }

    # Store or update stock data in MongoDB
    stocks_collection.update_one(
        {"symbol": stock_data["symbol"]}, 
        {"$set": stock_data}, 
        upsert=True
    )

    return {**stock_data, "source": "Alpha Vantage API"}