import pytest
import requests
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from fastapi import FastAPI

# Import the module under test.
import backend.routes.stock_search as stock_search_module


# =============================================================================
# Helpers & Fake Classes
# =============================================================================

class FakeResponse:
    """A fake response class to simulate requests.Response."""
    def __init__(self, status_code, json_data):
        self.status_code = status_code
        self._json = json_data

    def json(self):
        return self._json

    def raise_for_status(self):
        if not (200 <= self.status_code < 300):
            raise requests.HTTPError("Error", response=self)


class FakeStocksCollection:
    """A fake in-memory collection simulating the stocks_collection."""
    def __init__(self):
        self.data = {}  # key: symbol, value: document

    def find_one(self, query: dict):
        symbol = query.get("symbol")
        return self.data.get(symbol)

    def update_one(self, query: dict, update: dict, upsert: bool = False):
        symbol = query.get("symbol")
        # For simplicity, always replace with the new document.
        self.data[symbol] = update["$set"]


# =============================================================================
# Pytest Fixtures
# =============================================================================

@pytest.fixture(autouse=True)
def fake_stocks_collection(monkeypatch):
    """
    Replace the real stocks_collection in the stock_search module with our fake.
    This ensures a clean in-memory store for each test.
    """
    fake_collection = FakeStocksCollection()
    monkeypatch.setattr(stock_search_module, "stocks_collection", fake_collection)
    return fake_collection


@pytest.fixture
def client():
    """
    Create a TestClient instance by mounting the router (with a prefix) on a FastAPI app.
    """
    app = FastAPI()
    app.include_router(stock_search_module.router, prefix="/stock")
    return TestClient(app)


@pytest.fixture(autouse=True)
def reset_api_key(monkeypatch):
    """
    Ensure that a dummy API key is set for tests by default.
    Individual tests (if needed) can override this.
    """
    monkeypatch.setattr(stock_search_module, "ALPHA_VANTAGE_API_KEY", "DUMMY_API_KEY")


# =============================================================================
# Test Cases
# =============================================================================

def test_missing_api_key(monkeypatch, client):
    """
    Test that when the API key is missing, the endpoint returns a 500 error.
    """
    monkeypatch.setattr(stock_search_module, "ALPHA_VANTAGE_API_KEY", None)
    response = client.get("/stock/TEST")
    assert response.status_code == 500
    assert response.json()["detail"] == "Alpha Vantage API key is missing"


def test_valid_cached_data(fake_stocks_collection, client):
    """
    Test that when a valid cached stock exists (updated within 5 minutes),
    the endpoint returns the cached data.
    """
    symbol = "TEST"
    now_iso = datetime.utcnow().isoformat()
    fake_stocks_collection.data[symbol] = {
        "symbol": symbol,
        "price": 123.45,
        "change": 1.23,
        "percent_change": "1.00%",
        "last_updated": now_iso,
    }
    # Pass a lower-case version to test normalization.
    response = client.get(f"/stock/{symbol.lower()}")
    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == symbol
    assert data["price"] == 123.45
    assert data["change"] == 1.23
    assert data["percent_change"] == "1.00%"
    assert data["last_updated"] == now_iso
    assert data["source"] == "MongoDB Cache"


def test_expired_cache(monkeypatch, fake_stocks_collection, client):
    """
    Test that when a cached stock is expired (older than 5 minutes),
    the endpoint fetches new data from the external API.
    """
    symbol = "TEST"
    expired_time = (datetime.utcnow() - timedelta(minutes=10)).isoformat()
    fake_stocks_collection.data[symbol] = {
        "symbol": symbol,
        "price": 123.45,
        "change": 1.23,
        "percent_change": "1.00%",
        "last_updated": expired_time,
    }

    def fake_get(url, params, timeout):
        fake_json = {
            "Global Quote": {
                "01. symbol": params["symbol"],
                "05. price": "200.50",
                "09. change": "3.50",
                "10. change percent": "1.75%"
            }
        }
        return FakeResponse(200, fake_json)

    monkeypatch.setattr(stock_search_module.session, "get", fake_get)

    response = client.get(f"/stock/{symbol}")
    assert response.status_code == 200
    data = response.json()
    # Expect the new data from the external API.
    assert data["symbol"] == symbol
    assert data["price"] == 200.50
    assert data["change"] == 3.50
    assert data["percent_change"] == "1.75%"
    assert data["source"] == "Alpha Vantage API"
    # Verify that the cache was updated.
    cached = fake_stocks_collection.data.get(symbol)
    assert cached["price"] == 200.50


def test_external_api_failure(monkeypatch, client):
    """
    Test that if the external API call fails (raises a RequestException),
    the endpoint returns a 500 error.
    """
    def fake_get(url, params, timeout):
        raise requests.RequestException("API failure")

    monkeypatch.setattr(stock_search_module.session, "get", fake_get)

    response = client.get("/stock/TEST")
    assert response.status_code == 500
    assert response.json()["detail"] == "Failed to fetch stock data from Alpha Vantage"


def test_external_api_invalid_json(monkeypatch, client):
    """
    Test that if the external API returns JSON without a 'Global Quote',
    the endpoint returns a 404 error.
    """
    def fake_get(url, params, timeout):
        return FakeResponse(200, {})  # Missing "Global Quote" key

    monkeypatch.setattr(stock_search_module.session, "get", fake_get)

    response = client.get("/stock/TEST")
    assert response.status_code == 404
    # The detail should mention that the symbol was not found.
    assert "not found" in response.json()["detail"].lower()


def test_external_api_invalid_response(monkeypatch, client):
    """
    Test that if the external API returns data that cannot be processed
    (e.g. non-numeric price), the endpoint returns a 500 error.
    """
    def fake_get(url, params, timeout):
        fake_json = {
            "Global Quote": {
                "01. symbol": params["symbol"],
                "05. price": "invalid",  # Non-numeric value
                "09. change": "invalid",
                "10. change percent": "invalid"
            }
        }
        return FakeResponse(200, fake_json)

    monkeypatch.setattr(stock_search_module.session, "get", fake_get)

    response = client.get("/stock/TEST")
    assert response.status_code == 500
    assert response.json()["detail"] == "Invalid response from Alpha Vantage"


def test_successful_external_api(monkeypatch, fake_stocks_collection, client):
    """
    Test that a successful external API call:
      - Normalizes the stock symbol (trims whitespace and uppercases)
      - Returns the correct data
      - Updates the cache with the new stock data.
    """
    def fake_get(url, params, timeout):
        fake_json = {
            "Global Quote": {
                "01. symbol": params["symbol"],
                "05. price": "150.75",
                "09. change": "2.50",
                "10. change percent": "1.67%"
            }
        }
        return FakeResponse(200, fake_json)

    monkeypatch.setattr(stock_search_module.session, "get", fake_get)

    # Use a symbol with extra whitespace and lowercase letters.
    response = client.get("/stock/  test  ")
    assert response.status_code == 200
    data = response.json()
    # The symbol should be normalized to "TEST"
    assert data["symbol"] == "TEST"
    assert data["price"] == 150.75
    assert data["change"] == 2.50
    assert data["percent_change"] == "1.67%"
    assert data["source"] == "Alpha Vantage API"

    # Check that the cache was updated with the normalized symbol.
    cached = fake_stocks_collection.data.get("TEST")
    assert cached is not None
    assert cached["price"] == 150.75