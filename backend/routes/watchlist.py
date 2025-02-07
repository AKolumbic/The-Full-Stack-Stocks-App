from fastapi import APIRouter, HTTPException
from backend.db import watchlist_collection

router = APIRouter()

@router.post("/watchlist/{symbol}")
def add_to_watchlist(symbol: str):
    """
    Add a stock to the user's watchlist.
    """
    existing = watchlist_collection.find_one({"symbol": symbol})
    
    if existing:
        raise HTTPException(status_code=400, detail="Stock already in watchlist")

    watchlist_collection.insert_one({"symbol": symbol})
    return {"message": f"{symbol} added to watchlist"}

@router.get("/watchlist")
def get_watchlist():
    """
    Get all stocks in the user's watchlist.
    """
    watchlist = list(watchlist_collection.find({}, {"_id": 0}))
    return {"watchlist": watchlist}

@router.delete("/watchlist/{symbol}")
def remove_from_watchlist(symbol: str):
    """
    Remove a stock from the watchlist.
    """
    result = watchlist_collection.delete_one({"symbol": symbol})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Stock not found in watchlist")

    return {"message": f"{symbol} removed from watchlist"}