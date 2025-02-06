import requests
from fastapi import APIRouter, HTTPException
from dotenv import load_dotenv
import os

# Load environment variables from .env
load_dotenv()

router = APIRouter()

# Get API key from environment variable
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")

@router.get("/stocks/{symbol}")
def get_stock_data(symbol: str):
    """
    Fetch stock data for a given symbol from Alpha Vantage API.
    """
    if not ALPHA_VANTAGE_API_KEY:
        raise HTTPException(status_code=500, detail="Alpha Vantage API key is missing")

    url = f"https://www.alphavantage.co/query"
    params = {
        "function": "GLOBAL_QUOTE",
        "symbol": symbol,
        "apikey": ALPHA_VANTAGE_API_KEY
    }

    response = requests.get(url, params=params)
    data = response.json()

    # Check if stock data exists
    if "Global Quote" not in data:
        raise HTTPException(status_code=404, detail="Stock symbol not found")

    quote = data["Global Quote"]
    
    return {
        "symbol": quote["01. symbol"],
        "price": float(quote["05. price"]),
        "change": float(quote["09. change"]),
        "percent_change": quote["10. change percent"]
    }