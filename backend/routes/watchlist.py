import re
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from backend.db import watchlist_collection  # MongoDB collection for watchlist

router = APIRouter()


class MessageResponse(BaseModel):
    message: str


def normalize_symbol(symbol: str) -> str:
    """
    Trim whitespace, convert to uppercase, and ensure the symbol
    contains only alphanumeric characters.
    """
    normalized = symbol.strip().upper()
    if not re.match(r'^[A-Z0-9]+$', normalized):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid stock symbol"
        )
    return normalized


@router.get("/", response_model=list[str])
def get_watchlist():
    """
    Retrieve all stock symbols in the watchlist.
    """
    stocks = watchlist_collection.find({}, {"_id": 0, "symbol": 1})
    return [stock["symbol"] for stock in stocks]


@router.post(
    "/{symbol}",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED
)
def add_to_watchlist(symbol: str):
    """
    Add a stock symbol to the watchlist.
    """
    symbol = normalize_symbol(symbol)

    # Check if the symbol already exists.
    if watchlist_collection.find_one({"symbol": symbol}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stock already in watchlist"
        )

    watchlist_collection.insert_one({"symbol": symbol})
    return MessageResponse(message=f"{symbol} added to watchlist")


@router.delete("/{symbol}", response_model=MessageResponse)
def remove_from_watchlist(symbol: str):
    """
    Remove a stock symbol from the watchlist.
    """
    symbol = normalize_symbol(symbol)
    result = watchlist_collection.delete_one({"symbol": symbol})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stock not found in watchlist"
        )
    return MessageResponse(message=f"{symbol} removed from watchlist")