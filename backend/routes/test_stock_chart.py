import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from fastapi.testclient import TestClient
from fastapi import status

from backend.main import app
from backend.routes.stock_chart import _is_cache_valid

client = TestClient(app)

# Mock data for tests
MOCK_ALPHA_VANTAGE_RESPONSE = {
    "Meta Data": {
        "1. Information": "Daily Prices",
        "2. Symbol": "AAPL",
        "3. Last Refreshed": "2023-08-04",
        "4. Output Size": "Compact",
        "5. Time Zone": "US/Eastern"
    },
    "Time Series (Daily)": {
        "2023-08-04": {
            "1. open": "181.9400",
            "2. high": "182.8000",
            "3. low": "181.4000",
            "4. close": "181.9900",
            "5. volume": "44584834"
        },
        "2023-08-03": {
            "1. open": "182.1500",
            "2. high": "182.8000",
            "3. low": "180.6300",
            "4. close": "181.1500",
            "5. volume": "46564162"
        },
        "2023-08-02": {
            "1. open": "183.9600",
            "2. high": "184.1200",
            "3. low": "181.8000",
            "4. close": "182.3000",
            "5. volume": "60120500"
        }
    }
}

MOCK_ERROR_RESPONSE = {
    "Error Message": "Invalid API call. Please retry or visit the documentation."
}


@pytest.fixture
def mock_mongodb_collection():
    """Mock the MongoDB collection for tests"""
    with patch("backend.routes.stock_chart.stocks_collection") as mock_collection:
        yield mock_collection


@pytest.fixture
def mock_session_get():
    """Mock the requests session get method"""
    with patch("backend.routes.stock_chart.session.get") as mock_get:
        yield mock_get


def test_is_cache_valid():
    """Test the cache validity checker function"""
    # Valid cache (updated 10 minutes ago)
    valid_cache = {
        "last_updated": (datetime.now() - timedelta(minutes=10)).isoformat()
    }
    assert _is_cache_valid(valid_cache) is True
    
    # Invalid cache (updated 40 minutes ago)
    invalid_cache = {
        "last_updated": (datetime.now() - timedelta(minutes=40)).isoformat()
    }
    assert _is_cache_valid(invalid_cache) is False
    
    # Invalid format
    bad_cache = {
        "last_updated": "not-a-date"
    }
    assert _is_cache_valid(bad_cache) is False
    
    # Missing last_updated
    empty_cache = {}
    assert _is_cache_valid(empty_cache) is False


def test_get_chart_data_from_cache(mock_mongodb_collection):
    """Test retrieving chart data from cache"""
    # Set up mock cached data
    mock_cached_data = {
        "_id": "chart_AAPL_1m",
        "symbol": "AAPL",
        "period": "1m",
        "dates": ["2023-08-02", "2023-08-03", "2023-08-04"],
        "prices": [182.30, 181.15, 181.99],
        "trend": "neutral",
        "last_updated": datetime.now().isoformat()
    }
    
    # Configure the mock to return our test data
    mock_mongodb_collection.find_one.return_value = mock_cached_data
    
    # Make the request
    with patch("backend.routes.stock_chart._is_cache_valid", return_value=True):
        response = client.get("/chart/AAPL?period=1m")
    
    # Check that we got the expected response
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["symbol"] == "AAPL"
    assert response_data["period"] == "1m"
    assert len(response_data["dates"]) == 3
    assert len(response_data["prices"]) == 3
    assert response_data["trend"] == "neutral"
    
    # Verify the cache was checked
    mock_mongodb_collection.find_one.assert_called_once_with({"_id": "chart_AAPL_1m"})


def test_get_chart_data_from_api(mock_mongodb_collection, mock_session_get):
    """Test retrieving chart data from the Alpha Vantage API"""
    # Configure cache miss
    mock_mongodb_collection.find_one.return_value = None
    
    # Configure mock API response
    mock_response = MagicMock()
    mock_response.json.return_value = MOCK_ALPHA_VANTAGE_RESPONSE
    mock_session_get.return_value = mock_response
    
    # Current date for testing
    test_date = datetime(2023, 8, 5)
    
    # Make the request
    with patch("backend.routes.stock_chart.datetime") as mock_datetime:
        mock_datetime.now.return_value = test_date
        mock_datetime.strptime.side_effect = lambda *args, **kw: datetime.strptime(*args, **kw)
        response = client.get("/chart/AAPL?period=1m")
    
    # Check that we got the expected response
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["symbol"] == "AAPL"
    assert response_data["period"] == "1m"
    assert len(response_data["dates"]) > 0
    assert len(response_data["prices"]) > 0
    assert "trend" in response_data
    
    # Verify the API was called with the correct parameters
    mock_session_get.assert_called_once()
    call_args = mock_session_get.call_args[1]
    assert call_args["params"]["function"] == "TIME_SERIES_DAILY"
    assert call_args["params"]["symbol"] == "AAPL"
    assert call_args["params"]["outputsize"] == "compact"
    assert "timestamp" in call_args["params"]
    
    # Verify results were cached
    mock_mongodb_collection.update_one.assert_called_once()


def test_error_handling_symbol_not_found(mock_mongodb_collection, mock_session_get):
    """Test error handling when a symbol is not found"""
    # Configure cache miss
    mock_mongodb_collection.find_one.return_value = None
    
    # Configure mock API response with error
    mock_response = MagicMock()
    mock_response.json.return_value = MOCK_ERROR_RESPONSE
    mock_session_get.return_value = mock_response
    
    # Make the request
    response = client.get("/chart/INVALID?period=1m")
    
    # Check that we got a 404 error response
    assert response.status_code == 404
    assert "Symbol not found" in response.json()["detail"]


def test_error_handling_no_valid_dates(mock_mongodb_collection, mock_session_get):
    """Test error handling when no valid historical dates are found"""
    # Configure cache miss
    mock_mongodb_collection.find_one.return_value = None
    
    # Configure mock API response with future dates only
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "Time Series (Daily)": {
            "2099-01-01": {
                "4. close": "100.00"
            }
        }
    }
    mock_session_get.return_value = mock_response
    
    # Set current date for testing
    test_date = datetime(2023, 8, 5)
    
    # Make the request
    with patch("backend.routes.stock_chart.datetime") as mock_datetime:
        mock_datetime.now.return_value = test_date
        mock_datetime.strptime.side_effect = lambda *args, **kw: datetime.strptime(*args, **kw)
        response = client.get("/chart/FUTR?period=1m")
    
    # Check that we got a 404 error response
    assert response.status_code == 404
    assert "No valid historical data available" in response.json()["detail"]


def test_debug_alpha_vantage(mock_session_get):
    """Test the debug endpoint"""
    # Configure mock API response
    mock_response = MagicMock()
    mock_response.json.return_value = MOCK_ALPHA_VANTAGE_RESPONSE
    mock_session_get.return_value = mock_response
    
    # Make the request
    response = client.get("/chart/debug/AAPL?period=1m")
    
    # Check that we got the expected response
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["symbol"] == "AAPL"
    assert response_data["period"] == "1m"
    assert "raw_data" in response_data
    assert "api_url" in response_data
    assert "params" in response_data
    assert "REDACTED" in response_data["params"]["apikey"]  # API key should be redacted
    
    # Verify the API was called with the correct parameters
    mock_session_get.assert_called_once()
    call_args = mock_session_get.call_args[1]
    assert call_args["params"]["function"] == "TIME_SERIES_DAILY"
    assert call_args["params"]["symbol"] == "AAPL"
    assert call_args["params"]["outputsize"] == "compact"
    assert "timestamp" in call_args["params"] 