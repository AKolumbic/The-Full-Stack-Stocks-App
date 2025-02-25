import logging
import os
from datetime import datetime, timedelta
import requests
from fastapi import APIRouter, HTTPException, status
from dotenv import load_dotenv
from typing import List, Optional, Dict, Any

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


@router.get("/debug/{symbol}")
async def debug_alpha_vantage(symbol: str, period: str = "1m"):
    """Debug endpoint to get raw Alpha Vantage data."""
    symbol = symbol.upper()
    
    # Define time series function based on period
    if period in ["1d", "1w", "1m"]:
        function = "TIME_SERIES_DAILY"
        outputsize = "compact"
    else:
        function = "TIME_SERIES_DAILY"
        outputsize = "full"
    
    # Make the API request
    try:
        params = {
            "function": function,
            "symbol": symbol,
            "apikey": ALPHA_VANTAGE_API_KEY,
            "outputsize": outputsize,
            "timestamp": datetime.now().timestamp()  # Add cache-busting parameter
        }
        response = session.get(ALPHA_VANTAGE_URL, params=params)
        response.raise_for_status()
        raw_data = response.json()
        
        return {
            "symbol": symbol,
            "period": period,
            "raw_data": raw_data,
            "api_url": ALPHA_VANTAGE_URL,
            "params": {**params, "apikey": "REDACTED"}  # don't expose API key
        }
    
    except requests.RequestException as e:
        logger.error(f"Error fetching debug data from Alpha Vantage: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Error fetching data from provider: {str(e)}"
        )


def _is_cache_valid(cached_data: dict) -> bool:
    """Check if the cached chart data was updated within the last 30 minutes."""
    last_updated = cached_data.get("last_updated")
    if not last_updated:
        return False
    if isinstance(last_updated, str):
        try:
            last_updated = datetime.fromisoformat(last_updated)
        except ValueError:
            logger.warning("Cached last_updated value is not in ISO format: %s", last_updated)
            return False
    now = datetime.now()
    # Cache is valid for 30 minutes
    return now - last_updated < timedelta(minutes=30)


@router.get("/{symbol}")
async def get_chart_data(symbol: str, period: str = "1m"):
    """
    Get chart data for a stock symbol over a specified period.
    
    Parameters:
    - symbol: Stock symbol (e.g., AAPL, MSFT)
    - period: Time period for chart data ("1d", "1w", "1m", "3m", "6m", "1y", "5y")
    
    Returns:
    - Dictionary with dates and prices for charting
    """
    symbol = symbol.upper()  # Alpha Vantage API uses uppercase symbols
    logger.info(f"Fetching chart data for {symbol} with period {period}")
    
    # Check if we have cached data for this symbol and period
    cache_key = f"chart_{symbol}_{period}"
    cached_data = stocks_collection.find_one({"_id": cache_key})
    
    if cached_data and _is_cache_valid(cached_data):
        logger.info(f"Returning cached chart data for {symbol} ({period})")
        # Remove MongoDB _id field and return
        cached_data.pop("_id", None)
        return cached_data
    
    # Define time series function and interval based on period
    if period in ["1d", "1w", "1m"]:
        function = "TIME_SERIES_DAILY"
        key = "Time Series (Daily)"
        outputsize = "compact"  # returns the latest 100 data points
    else:  # 3m, 6m, 1y, 5y
        function = "TIME_SERIES_DAILY"
        key = "Time Series (Daily)"
        outputsize = "full"  # returns up to 20+ years of historical data
    
    # Make the API request
    try:
        params = {
            "function": function,
            "symbol": symbol,
            "apikey": ALPHA_VANTAGE_API_KEY,
            "outputsize": outputsize,
            "timestamp": datetime.now().timestamp()  # Add cache-busting parameter
        }
        logger.info(f"Requesting data from Alpha Vantage for {symbol}")
        response = session.get(ALPHA_VANTAGE_URL, params=params)
        response.raise_for_status()
        data = response.json()
        
        if "Error Message" in data:
            logger.error(f"Alpha Vantage error for {symbol}: {data['Error Message']}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Symbol not found: {symbol}"
            )
        
        if key not in data:
            logger.error(f"Unexpected API response format for {symbol}: {data.keys()}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unexpected API response format"
            )
        
        # Extract time series data
        time_series = data[key]
        logger.info(f"Received {len(time_series)} data points for {symbol}")
        
        # Sort dates in ascending order
        sorted_dates = sorted(time_series.keys())
        
        # Filter out future dates (Alpha Vantage sometimes returns data with future dates)
        current_date = datetime.now().date()
        valid_dates = []
        for date_str in sorted_dates:
            try:
                # Convert string date to datetime object
                date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
                # Only include dates that are not in the future
                if date_obj <= current_date:
                    valid_dates.append(date_str)
            except ValueError:
                # Skip invalid date formats
                logger.warning(f"Skipping invalid date format: {date_str}")
                continue
        
        logger.info(f"Filtered out {len(sorted_dates) - len(valid_dates)} future dates")
        sorted_dates = valid_dates
        
        # Check if we have any valid dates left after filtering
        if not sorted_dates:
            logger.error(f"No valid historical dates found for {symbol}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No valid historical data available for {symbol}"
            )
        
        # Filter dates based on selected period
        now = datetime.now()
        filtered_dates = []
        
        if period == "1d":
            # Only the most recent data point
            filtered_dates = sorted_dates[-1:]
        elif period == "1w":
            # Last 5 trading days
            filtered_dates = sorted_dates[-5:]
        elif period == "1m":
            # Last ~21 trading days (approximately 1 month)
            filtered_dates = sorted_dates[-21:]
        elif period == "3m":
            # Last ~63 trading days (approximately 3 months)
            filtered_dates = sorted_dates[-63:]
        elif period == "6m":
            # Last ~126 trading days (approximately 6 months)
            filtered_dates = sorted_dates[-126:]
        elif period == "1y":
            # Last ~252 trading days (approximately 1 year)
            filtered_dates = sorted_dates[-252:]
        elif period == "5y":
            # Last ~1260 trading days (approximately 5 years)
            filtered_dates = sorted_dates[-1260:]
        else:
            # Default to 1 month
            filtered_dates = sorted_dates[-21:]
        
        logger.info(f"Filtered to {len(filtered_dates)} data points for {period} period")
        
        # Collect dates and closing prices
        dates = []
        prices = []
        for date in filtered_dates:
            dates.append(date)
            # Log the raw value for debugging
            raw_price = time_series[date]["4. close"]
            prices.append(float(raw_price))
            if len(prices) <= 2 or len(prices) >= len(filtered_dates) - 1:
                logger.info(f"Date: {date}, Raw price: {raw_price}, Parsed: {float(raw_price)}")
        
        # Determine trend (up/down/neutral)
        trend = "neutral"
        if len(prices) > 1:
            first_price = prices[0]
            last_price = prices[-1]
            if last_price > first_price:
                trend = "up"
            elif last_price < first_price:
                trend = "down"
        
        # Prepare the response
        result = {
            "symbol": symbol,
            "period": period,
            "dates": dates,
            "prices": prices,
            "trend": trend,
            "last_updated": datetime.now().isoformat()
        }
        
        # Log the first and last price for verification
        if prices:
            logger.info(f"First price: ${prices[0]}, Last price: ${prices[-1]}, Trend: {trend}")
        
        # Cache the result
        stocks_collection.update_one(
            {"_id": cache_key},
            {"$set": result},
            upsert=True
        )
        
        return result
    
    except requests.RequestException as e:
        logger.error(f"Error fetching chart data from Alpha Vantage: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Error fetching data from provider"
        ) 