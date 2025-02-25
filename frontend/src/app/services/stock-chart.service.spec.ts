import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { StockChartService, ChartData } from './stock-chart.service';

describe('StockChartService', () => {
  let service: StockChartService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [StockChartService],
    });

    service = TestBed.inject(StockChartService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get chart data for a given symbol and period', () => {
    const mockSymbol = 'AAPL';
    const mockPeriod = '1m';
    const mockResponse: ChartData = {
      symbol: 'AAPL',
      period: '1m',
      dates: ['2023-01-01', '2023-01-02', '2023-01-03'],
      prices: [150.5, 152.3, 153.8],
      trend: 'up',
    };

    service.getChartData(mockSymbol, mockPeriod).subscribe((response) => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(
      `http://127.0.0.1:8000/chart/${mockSymbol}?period=${mockPeriod}`
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should handle errors when fetching chart data', () => {
    const mockSymbol = 'INVALID';
    const mockPeriod = '1m';

    service.getChartData(mockSymbol, mockPeriod).subscribe((response) => {
      expect(response.error).toBe(true);
      expect(response.errorMessage).toBe('Error Retrieving Chart Data');
      expect(response.symbol).toBe(mockSymbol);
      expect(response.period).toBe(mockPeriod);
    });

    const req = httpMock.expectOne(
      `http://127.0.0.1:8000/chart/${mockSymbol}?period=${mockPeriod}`
    );
    req.error(new ErrorEvent('Network error'));
  });

  it('should log received chart data', () => {
    spyOn(console, 'log');
    const mockSymbol = 'AAPL';
    const mockPeriod = '1m';
    const mockResponse: ChartData = {
      symbol: 'AAPL',
      period: '1m',
      dates: ['2023-01-01', '2023-01-02', '2023-01-03'],
      prices: [150.5, 152.3, 153.8],
      trend: 'up',
    };

    service.getChartData(mockSymbol, mockPeriod).subscribe();

    const req = httpMock.expectOne(
      `http://127.0.0.1:8000/chart/${mockSymbol}?period=${mockPeriod}`
    );
    req.flush(mockResponse);

    expect(console.log).toHaveBeenCalledWith(
      jasmine.stringContaining('Received chart data for AAPL:'),
      jasmine.any(Object)
    );
    expect(console.log).toHaveBeenCalledWith(
      jasmine.stringContaining('First price: $150.5, Last price: $153.8')
    );
  });

  it('should handle error console logging', () => {
    spyOn(console, 'error');
    const mockSymbol = 'ERROR';
    const mockPeriod = '1m';

    service.getChartData(mockSymbol, mockPeriod).subscribe();

    const req = httpMock.expectOne(
      `http://127.0.0.1:8000/chart/${mockSymbol}?period=${mockPeriod}`
    );
    req.error(new ErrorEvent('Network error'));

    expect(console.error).toHaveBeenCalledWith(
      'Error fetching chart data:',
      jasmine.any(Object)
    );
  });
});
