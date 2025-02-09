import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { StockSearchService } from './stock-search.service';

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
      const dummyResponse = { price: 150, change: 2, percent_change: '1.33%' };

      service.getStockData(symbol).subscribe((data) => {
        expect(data).toEqual(dummyResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}/stocks/${symbol}`);
      expect(req.request.method).toBe('GET');
      req.flush(dummyResponse);
    });

    it('should propagate error when GET fails', () => {
      const errorMessage = 'Not Found';

      service.getStockData(symbol).subscribe(
        () => fail('expected an error, not stock data'),
        (error) => {
          expect(error.status).toBe(404);
          expect(error.error).toBe(errorMessage);
        }
      );

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

      service.getWatchlist().subscribe(
        () => fail('expected an error, not watchlist data'),
        (error) => {
          expect(error.status).toBe(500);
          expect(error.error).toBe(errorMessage);
        }
      );

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

      service.addToWatchlist(symbol).subscribe(
        () => fail('expected an error, not success'),
        (error) => {
          expect(error.status).toBe(400);
          expect(error.error).toBe(errorMessage);
        }
      );

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

      service.removeFromWatchlist(symbol).subscribe(
        () => fail('expected an error, not success'),
        (error) => {
          expect(error.status).toBe(404);
          expect(error.error).toBe(errorMessage);
        }
      );

      const req = httpMock.expectOne(`${baseUrl}/watchlist/${symbol}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(errorMessage, { status: 404, statusText: 'Not Found' });
    });
  });
});
