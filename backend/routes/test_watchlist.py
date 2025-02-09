import pytest
from fastapi.testclient import TestClient
from fastapi import FastAPI
import backend.routes.watchlist as watchlist_module

# A fake, in-memory collection to simulate MongoDB behavior.
class FakeWatchlistCollection:
    def __init__(self):
        self.data = {}  # key: symbol, value: document

    def find(self, query: dict, projection: dict):
        # For simplicity, ignore the query/projection and return all documents.
        return [{"symbol": symbol} for symbol in self.data]

    def find_one(self, query: dict):
        symbol = query.get("symbol")
        return self.data.get(symbol)

    def insert_one(self, document: dict):
        symbol = document.get("symbol")
        self.data[symbol] = document

    def delete_one(self, query: dict):
        symbol = query.get("symbol")
        if symbol in self.data:
            del self.data[symbol]
            class FakeDeleteResult:
                deleted_count = 1
            return FakeDeleteResult()
        else:
            class FakeDeleteResult:
                deleted_count = 0
            return FakeDeleteResult()

# Patch the watchlist_collection used in the routes module.
@pytest.fixture(autouse=True)
def fake_watchlist_collection(monkeypatch):
    fake_collection = FakeWatchlistCollection()
    monkeypatch.setattr(watchlist_module, "watchlist_collection", fake_collection)
    return fake_collection

# Create a TestClient using a FastAPI app that includes our router.
@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(watchlist_module.router, prefix="/watchlist")
    return TestClient(app)

def test_get_empty_watchlist(client):
    """GET should return an empty list when no symbols are added."""
    response = client.get("/watchlist/")
    assert response.status_code == 200
    assert response.json() == []

def test_add_valid_symbol(client):
    """POST should add a valid symbol and GET should return that symbol."""
    response = client.post("/watchlist/AAPL")
    assert response.status_code == 201
    data = response.json()
    assert data["message"] == "AAPL added to watchlist"

    # Verify that GET returns the newly added symbol.
    response_get = client.get("/watchlist/")
    assert response_get.status_code == 200
    assert response_get.json() == ["AAPL"]

def test_add_duplicate_symbol(client):
    """Adding the same symbol twice (even in different case) should return an error."""
    # Add the symbol the first time.
    response1 = client.post("/watchlist/GOOG")
    assert response1.status_code == 201

    # Attempt to add the same symbol (in lowercase) again.
    response2 = client.post("/watchlist/goog")
    assert response2.status_code == 400
    assert response2.json()["detail"] == "Stock already in watchlist"

def test_invalid_symbol(client):
    """POST should return an error when the symbol contains invalid characters."""
    response = client.post("/watchlist/$$$")
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid stock symbol"

def test_remove_existing_symbol(client):
    """DELETE should remove an existing symbol and return a proper message."""
    # First add a symbol.
    client.post("/watchlist/MSFT")
    # Remove the symbol.
    response = client.delete("/watchlist/MSFT")
    assert response.status_code == 200
    assert response.json()["message"] == "MSFT removed from watchlist"
    # Removing the same symbol again should return a 404 error.
    response2 = client.delete("/watchlist/MSFT")
    assert response2.status_code == 404
    assert response2.json()["detail"] == "Stock not found in watchlist"

def test_symbol_normalization(client):
    """POST should normalize symbols (trimming whitespace and uppercasing)."""
    # Add a symbol with extra whitespace and lowercase letters.
    response = client.post("/watchlist/  amzn  ")
    assert response.status_code == 201
    assert response.json()["message"] == "AMZN added to watchlist"

    # Verify that GET returns the normalized symbol.
    response_get = client.get("/watchlist/")
    assert response_get.status_code == 200
    assert "AMZN" in response_get.json()

def test_get_watchlist_multiple(client):
    """GET should return all added symbols."""
    symbols = ["AAPL", "TSLA", "NFLX"]
    for symbol in symbols:
        response = client.post(f"/watchlist/{symbol}")
        assert response.status_code == 201

    # GET should return all symbols; order may vary so we compare as sets.
    response_get = client.get("/watchlist/")
    assert response_get.status_code == 200
    retrieved = response_get.json()
    assert set(retrieved) == set(symbols)