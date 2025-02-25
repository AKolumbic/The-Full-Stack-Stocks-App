import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { StockSearchComponent } from './stock-search.component';
import {
  StockSearchService,
  StockData,
  HistoricalData,
} from '../../services/stock-search.service';
import { ThemeService } from '../../services/theme.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockChartComponent } from '../stock-chart/stock-chart.component';
import { ChartData } from '../../services/stock-chart.service';

// Create a fake StockSearchService with spies for its methods.
class FakeStockSearchService {
  getStockData = jasmine.createSpy('getStockData');
  getWatchlist = jasmine.createSpy('getWatchlist');
  addToWatchlist = jasmine.createSpy('addToWatchlist');
  removeFromWatchlist = jasmine.createSpy('removeFromWatchlist');
}

// Create a fake ThemeService with spies for its methods.
class FakeThemeService {
  getCurrentTheme = jasmine
    .createSpy('getCurrentTheme')
    .and.returnValue('light');
  toggleTheme = jasmine.createSpy('toggleTheme');
  theme$ = of('light');
}

describe('StockSearchComponent', () => {
  let component: StockSearchComponent;
  let fixture: ComponentFixture<StockSearchComponent>;
  let stockServiceSpy: jasmine.SpyObj<StockSearchService>;
  let themeServiceSpy: jasmine.SpyObj<ThemeService>;

  const mockStockData: StockData = {
    symbol: 'AAPL',
    price: 150.25,
    change: 2.75,
    percent_change: '+1.85%',
  };

  const mockHistoricalData: HistoricalData = {
    symbol: 'AAPL',
    period: '1m',
    data: [
      { date: '2023-01-01', price: 148.5 },
      { date: '2023-01-02', price: 149.25 },
      { date: '2023-01-03', price: 150.25 },
    ],
    trend: 'up',
  };

  const mockChartData: ChartData = {
    symbol: 'AAPL',
    period: '1m',
    dates: ['2023-01-01', '2023-01-02', '2023-01-03'],
    prices: [148.5, 149.25, 150.25],
    trend: 'up',
  };

  const mockWatchlistItems = ['AAPL', 'MSFT', 'GOOGL'];

  beforeEach(async () => {
    const stockSpy = jasmine.createSpyObj('StockSearchService', [
      'getStockData',
      'getHistoricalData',
      'getWatchlist',
      'addToWatchlist',
      'removeFromWatchlist',
    ]);

    const themeSpy = jasmine.createSpyObj(
      'ThemeService',
      ['getCurrentTheme', 'toggleTheme'],
      { theme$: of('dark') }
    );

    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, HttpClientTestingModule],
      providers: [
        { provide: StockSearchService, useValue: stockSpy },
        { provide: ThemeService, useValue: themeSpy },
      ],
    }).compileComponents();

    stockServiceSpy = TestBed.inject(
      StockSearchService
    ) as jasmine.SpyObj<StockSearchService>;
    themeServiceSpy = TestBed.inject(
      ThemeService
    ) as jasmine.SpyObj<ThemeService>;

    // Set up default return values
    stockServiceSpy.getStockData.and.returnValue(of(mockStockData));
    stockServiceSpy.getHistoricalData.and.returnValue(of(mockHistoricalData));
    stockServiceSpy.getWatchlist.and.returnValue(of(mockWatchlistItems));
    themeServiceSpy.getCurrentTheme.and.returnValue('dark');
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StockSearchComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with the current theme', () => {
    fixture.detectChanges();
    expect(themeServiceSpy.getCurrentTheme).toHaveBeenCalled();
    expect(component.currentTheme).toBe('dark');
  });

  it('should fetch watchlist on init', () => {
    fixture.detectChanges();
    expect(stockServiceSpy.getWatchlist).toHaveBeenCalled();
    // Check that watchlist items are properly converted to WatchlistItem objects
    expect(component.watchlist.length).toBe(mockWatchlistItems.length);
    expect(component.watchlist[0].symbol).toBe('AAPL');
  });

  it('should toggle theme when toggleTheme is called', () => {
    component.toggleTheme();
    expect(themeServiceSpy.toggleTheme).toHaveBeenCalled();
  });

  it('should search for a stock when searchStock is called', () => {
    component.stockSymbol = 'AAPL';
    component.searchStock();
    expect(stockServiceSpy.getStockData).toHaveBeenCalledWith('AAPL');
    expect(stockServiceSpy.getHistoricalData).toHaveBeenCalledWith(
      'AAPL',
      '1m'
    );
  });

  it('should add a stock to the watchlist', () => {
    stockServiceSpy.addToWatchlist.and.returnValue(of({}));
    component.stockData = mockStockData;
    component.addToWatchlist('AAPL');
    expect(stockServiceSpy.addToWatchlist).toHaveBeenCalledWith('AAPL');
    expect(stockServiceSpy.getWatchlist).toHaveBeenCalled();
  });

  it('should remove a stock from the watchlist', () => {
    stockServiceSpy.removeFromWatchlist.and.returnValue(of({}));
    component.removeFromWatchlist('AAPL');
    expect(stockServiceSpy.removeFromWatchlist).toHaveBeenCalledWith('AAPL');
    expect(stockServiceSpy.getWatchlist).toHaveBeenCalled();
  });

  it('should change chart period', () => {
    component.stockSymbol = 'AAPL';
    stockServiceSpy.getHistoricalData.calls.reset();
    component.changePeriod('3m');
    expect(component.selectedPeriod).toBe('3m');
    expect(stockServiceSpy.getHistoricalData).toHaveBeenCalledWith(
      'AAPL',
      '3m'
    );
  });

  it('should generate chart data from historical data', () => {
    // Use private method accessor to test private method
    (component as any).generateChartData(mockHistoricalData);
    expect(component.chartData).toBeTruthy();
    expect(component.chartData?.symbol).toBe('AAPL');
    expect(component.chartData?.dates.length).toBe(3);
    expect(component.chartData?.prices.length).toBe(3);
  });

  describe('#searchStock', () => {
    beforeEach(() => {
      // Reset component between tests
      component.stockSymbol = '';
      component.stockData = null;
      component.errorMessage = '';
    });

    it('should not call getStockData when stockSymbol is empty', () => {
      component.stockSymbol = '';
      component.searchStock();
      expect(stockServiceSpy.getStockData).not.toHaveBeenCalled();
    });

    it('should call getStockData and update stockData on success', fakeAsync(() => {
      component.stockSymbol = 'AAPL';
      const mockData: StockData = {
        symbol: 'AAPL',
        price: 150,
        change: 3,
        percent_change: '2%',
      };
      stockServiceSpy.getStockData.and.returnValue(of(mockData).pipe(delay(0)));

      component.searchStock();
      tick();
      fixture.detectChanges();

      expect(stockServiceSpy.getStockData).toHaveBeenCalledWith('AAPL');
      expect(component.stockData).toEqual(mockData);
      expect(component.errorMessage).toEqual('');
    }));

    it('should set errorMessage on error', fakeAsync(() => {
      component.stockSymbol = 'AAPL';
      stockServiceSpy.getStockData.and.returnValue(
        throwError(() => new Error('Not found')).pipe(delay(10))
      );

      component.searchStock();
      tick(10);
      fixture.detectChanges();

      expect(component.errorMessage).toContain('not found');
      expect(component.stockData).toBeNull();
    }));
  });

  describe('#fetchWatchlist', () => {
    it('should update the watchlist on success', () => {
      // We need to reset the spies with proper watchlist items
      const mockStockWatchlist = mockWatchlistItems;
      stockServiceSpy.getWatchlist.and.returnValue(of(mockStockWatchlist));

      component.fetchWatchlist();
      fixture.detectChanges();

      expect(stockServiceSpy.getWatchlist).toHaveBeenCalled();
      // We can't directly compare arrays of different types, so check length instead
      expect(component.watchlist.length).toBe(mockStockWatchlist.length);
      // Check a specific property to ensure proper mapping
      expect(component.watchlist[0].symbol).toBe('AAPL');
    });

    it('should clear the watchlist on error', () => {
      stockServiceSpy.getWatchlist.and.returnValue(
        throwError(() => new Error('Error fetching watchlist'))
      );

      component.fetchWatchlist();
      fixture.detectChanges();

      expect(component.watchlist).toEqual([]);
    });
  });

  describe('#addToWatchlist', () => {
    it('should call addToWatchlist and then fetchWatchlist on success', () => {
      const symbol = 'AAPL';
      stockServiceSpy.addToWatchlist.and.returnValue(of({}));
      spyOn(component, 'fetchWatchlist');

      component.addToWatchlist(symbol);
      fixture.detectChanges();

      expect(stockServiceSpy.addToWatchlist).toHaveBeenCalledWith(symbol);
      expect(component.fetchWatchlist).toHaveBeenCalled();
    });

    it('should set errorMessage if adding to watchlist fails', () => {
      const symbol = 'AAPL';
      stockServiceSpy.addToWatchlist.and.returnValue(
        throwError(() => new Error('Error'))
      );

      component.addToWatchlist(symbol);
      fixture.detectChanges();

      expect(component.errorMessage).toContain('could not be added');
    });
  });

  describe('#removeFromWatchlist', () => {
    it('should call removeFromWatchlist and then fetchWatchlist on success', () => {
      const symbol = 'AAPL';
      stockServiceSpy.removeFromWatchlist.and.returnValue(of({}));
      spyOn(component, 'fetchWatchlist');

      component.removeFromWatchlist(symbol);
      fixture.detectChanges();

      expect(stockServiceSpy.removeFromWatchlist).toHaveBeenCalledWith(symbol);
      expect(component.fetchWatchlist).toHaveBeenCalled();
    });

    it('should set errorMessage if removal fails', () => {
      const symbol = 'AAPL';
      stockServiceSpy.removeFromWatchlist.and.returnValue(
        throwError(() => new Error('Error'))
      );

      component.removeFromWatchlist(symbol);
      fixture.detectChanges();

      expect(component.errorMessage).toContain('was not found');
    });
  });
});
