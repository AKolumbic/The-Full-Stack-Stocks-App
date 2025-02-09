from fastapi import APIRouter, HTTPException
from backend.db import watchlist_collection  # Ensure correct MongoDB connection

router = APIRouter()  # ✅ Removed prefix from routes

@router.get("/")
def get_watchlist():
    """
    Retrieve all stock symbols in the watchlist.
    """
    stocks = watchlist_collection.find({}, {"_id": 0, "symbol": 1})
    return [stock["symbol"] for stock in stocks]

@router.post("/{symbol}")
def add_to_watchlist(symbol: str):
    """
    Add a stock symbol to the watchlist.
    """
    symbol = symbol.upper()  # Normalize symbol case

    # Check if already in watchlist
    existing = watchlist_collection.find_one({"symbol": symbol})
    if existing:
        raise HTTPException(status_code=400, detail="Stock already in watchlist")

    # Add stock to watchlist
    watchlist_collection.insert_one({"symbol": symbol})
    return {"message": f"{symbol} added to watchlist"}

@router.delete("/{symbol}")
def remove_from_watchlist(symbol: str):
    """
    Remove a stock symbol from the watchlist.
    """
    result = watchlist_collection.delete_one({"symbol": symbol})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Stock not found in watchlist")
    return {"message": f"{symbol} removed from watchlist"}