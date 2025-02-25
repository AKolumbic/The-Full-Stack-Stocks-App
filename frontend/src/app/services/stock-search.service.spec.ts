import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import {
  StockSearchService,
  StockData,
  HistoricalData,
} from './stock-search.service';

describe('StockSearchService', () => {
  let service: StockSearchService;
  let httpMock: HttpTestingController;
  const baseUrl = 'http://127.0.0.1:8000';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [StockSearchService],
    });
    service = TestBed.inject(StockSearchService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Verify that no unmatched requests are outstanding.
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // --- Tests for getStockData ---
  describe('#getStockData', () => {
    const symbol = 'AAPL';
    it('should perform a GET request and return stock data', () => {
      const dummyResponse: StockData = {
        symbol: 'AAPL',
        price: 150,
        change: 2,
        percent_change: '1.33%',
      };

      service.getStockData(symbol).subscribe({
        next: (data) => {
          expect(data).toEqual(dummyResponse);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/stocks/${symbol}`);
      expect(req.request.method).toBe('GET');
      req.flush(dummyResponse);
    });

    it('should propagate error when GET fails', () => {
      const errorMessage = 'Not Found';

      service.getStockData(symbol).subscribe({
        next: () => fail('expected an error, not stock data'),
        error: (error) => {
          expect(error).toBeTruthy();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/stocks/${symbol}`);
      expect(req.request.method).toBe('GET');
      req.flush(errorMessage, { status: 404, statusText: 'Not Found' });
    });
  });

  // --- Tests for getWatchlist ---
  describe('#getWatchlist', () => {
    it('should perform a GET request and return a watchlist', () => {
      const dummyWatchlist = ['AAPL', 'TSLA'];

      service.getWatchlist().subscribe((data) => {
        expect(data).toEqual(dummyWatchlist);
      });

      const req = httpMock.expectOne(`${baseUrl}/watchlist`);
      expect(req.request.method).toBe('GET');
      req.flush(dummyWatchlist);
    });

    it('should propagate error when GET watchlist fails', () => {
      const errorMessage = 'Internal Server Error';

      service.getWatchlist().subscribe({
        next: () => fail('expected an error, not watchlist data'),
        error: (error) => {
          expect(error.status).toBe(500);
          expect(error.error).toBe(errorMessage);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/watchlist`);
      expect(req.request.method).toBe('GET');
      req.flush(errorMessage, {
        status: 500,
        statusText: 'Internal Server Error',
      });
    });
  });

  // --- Tests for addToWatchlist ---
  describe('#addToWatchlist', () => {
    const symbol = 'AAPL';
    it('should perform a POST request to add a stock to the watchlist', () => {
      const dummyResponse = { message: 'AAPL added to watchlist' };

      service.addToWatchlist(symbol).subscribe((data) => {
        expect(data).toEqual(dummyResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}/watchlist/${symbol}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(dummyResponse);
    });

    it('should propagate error when POST fails', () => {
      const errorMessage = 'Bad Request';

      service.addToWatchlist(symbol).subscribe({
        next: () => fail('expected an error, not success'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error).toBe(errorMessage);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/watchlist/${symbol}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(errorMessage, { status: 400, statusText: 'Bad Request' });
    });
  });

  // --- Tests for removeFromWatchlist ---
  describe('#removeFromWatchlist', () => {
    const symbol = 'AAPL';
    it('should perform a DELETE request to remove a stock from the watchlist', () => {
      const dummyResponse = { message: 'AAPL removed from watchlist' };

      service.removeFromWatchlist(symbol).subscribe((data) => {
        expect(data).toEqual(dummyResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}/watchlist/${symbol}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(dummyResponse);
    });

    it('should propagate error when DELETE fails', () => {
      const errorMessage = 'Not Found';

      service.removeFromWatchlist(symbol).subscribe({
        next: () => fail('expected an error, not success'),
        error: (error) => {
          expect(error.status).toBe(404);
          expect(error.error).toBe(errorMessage);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/watchlist/${symbol}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(errorMessage, { status: 404, statusText: 'Not Found' });
    });
  });

  // --- Tests for getHistoricalData ---
  describe('#getHistoricalData', () => {
    const symbol = 'AAPL';
    const period = '1m';

    it('should fetch and convert chart data to historical data format', () => {
      const mockChartData = {
        symbol: 'AAPL',
        period: '1m',
        dates: ['2023-01-01', '2023-01-02', '2023-01-03'],
        prices: [150.25, 151.75, 153.5],
        trend: 'up',
      };

      const expectedHistoricalData: HistoricalData = {
        symbol: 'AAPL',
        period: '1m',
        data: [
          { date: '2023-01-01', price: 150.25 },
          { date: '2023-01-02', price: 151.75 },
          { date: '2023-01-03', price: 153.5 },
        ],
        trend: 'up' as const,
      };

      service.getHistoricalData(symbol, period).subscribe((data) => {
        expect(data).toEqual(expectedHistoricalData);
      });

      const req = httpMock.expectOne(
        `${baseUrl}/chart/${symbol}?period=${period}`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockChartData);
    });

    it('should propagate error when fetching historical data fails', () => {
      service.getHistoricalData(symbol, period).subscribe({
        next: () => fail('expected an error, not historical data'),
        error: (error) => {
          expect(error).toBeTruthy();
        },
      });

      const req = httpMock.expectOne(
        `${baseUrl}/chart/${symbol}?period=${period}`
      );
      expect(req.request.method).toBe('GET');
      req.error(new ErrorEvent('Network error'));
    });
  });

  // --- Tests for debugAlphaVantage ---
  describe('#debugAlphaVantage', () => {
    const symbol = 'AAPL';
    const period = '1m';

    it('should fetch raw Alpha Vantage data', () => {
      const mockDebugData = {
        symbol: 'AAPL',
        period: '1m',
        raw_data: {
          /* mock API response */
        },
        api_url: 'https://www.alphavantage.co/query',
        params: { function: 'TIME_SERIES_DAILY', symbol: 'AAPL' },
      };

      service.debugAlphaVantage(symbol, period).subscribe((data) => {
        expect(data).toEqual(mockDebugData);
      });

      const req = httpMock.expectOne(
        `${baseUrl}/chart/debug/${symbol}?period=${period}`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockDebugData);
    });
  });
});
