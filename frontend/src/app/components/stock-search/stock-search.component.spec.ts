import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { StockSearchComponent } from './stock-search.component';
import { StockSearchService } from '../../services/stock-search.service';
import { ThemeService } from '../../services/theme.service';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

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
  let stockService: FakeStockSearchService;
  let themeService: FakeThemeService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // Import the standalone component instead of declaring it.
      imports: [StockSearchComponent],
      providers: [
        { provide: StockSearchService, useClass: FakeStockSearchService },
        { provide: ThemeService, useClass: FakeThemeService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StockSearchComponent);
    component = fixture.componentInstance;
    stockService = TestBed.inject(StockSearchService) as any;
    themeService = TestBed.inject(ThemeService) as any;

    // Default stub for getWatchlist so ngOnInit can run without errors.
    stockService.getWatchlist.and.returnValue(of([]));
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should call fetchWatchlist on initialization', () => {
    spyOn(component, 'fetchWatchlist');
    fixture.detectChanges(); // triggers ngOnInit
    expect(component.fetchWatchlist).toHaveBeenCalled();
  });

  it('should get the current theme on initialization', () => {
    fixture.detectChanges(); // triggers ngOnInit
    expect(themeService.getCurrentTheme).toHaveBeenCalled();
    expect(component.currentTheme).toBe('light');
  });

  it('should toggle the theme when toggleTheme is called', () => {
    component.toggleTheme();
    expect(themeService.toggleTheme).toHaveBeenCalled();
  });

  describe('#searchStock', () => {
    beforeEach(() => {
      // Provide a default asynchronous stub for getStockData.
      stockService.getStockData.and.returnValue(
        of({ price: 100, change: 2, percent_change: '2%' }).pipe(delay(0))
      );
    });

    it('should not search if stockSymbol is empty', () => {
      component.stockSymbol = '';
      component.searchStock();
      expect(stockService.getStockData).not.toHaveBeenCalled();
    });

    it('should call getStockData and update stockData on success', fakeAsync(() => {
      const mockData = { price: 150, change: 3, percent_change: '2%' };
      component.stockSymbol = 'AAPL';
      stockService.getStockData.and.returnValue(of(mockData).pipe(delay(0)));

      component.searchStock();
      // Immediately after calling searchStock, loading should be true.
      expect(component.loading).toBeTrue();

      tick(); // simulate asynchronous passage of time
      fixture.detectChanges();

      expect(stockService.getStockData).toHaveBeenCalledWith('AAPL');
      expect(component.stockData).toEqual(mockData);
      expect(component.errorMessage).toEqual('');
      // After the observable completes, loading should be false.
      expect(component.loading).toBeFalse();
    }));

    it('should set errorMessage and clear stockData on error', fakeAsync(() => {
      component.stockSymbol = 'AAPL';
      // Return an observable that errors after a 10ms delay.
      stockService.getStockData.and.returnValue(
        throwError(() => new Error('Not found')).pipe(delay(10))
      );

      component.searchStock();

      // Instead of checking the intermediate loading state,
      // simply advance time to let the error be delivered.
      tick(10);
      fixture.detectChanges();

      expect(component.errorMessage).toEqual('Stock not found: AAPL');
      expect(component.stockData).toBeNull();
      // After the error is delivered and finalize runs, loading should be false.
      expect(component.loading).toBeFalse();
    }));
  });

  describe('#fetchWatchlist', () => {
    it('should update the watchlist on success', () => {
      const mockWatchlist = ['AAPL', 'GOOG'];
      stockService.getWatchlist.and.returnValue(of(mockWatchlist));

      component.fetchWatchlist();
      fixture.detectChanges();

      expect(stockService.getWatchlist).toHaveBeenCalled();
      expect(component.watchlist).toEqual(mockWatchlist);
    });

    it('should clear the watchlist on error', () => {
      stockService.getWatchlist.and.returnValue(
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
      stockService.addToWatchlist.and.returnValue(of({}));
      spyOn(component, 'fetchWatchlist');

      component.addToWatchlist(symbol);
      fixture.detectChanges();

      expect(stockService.addToWatchlist).toHaveBeenCalledWith(symbol);
      expect(component.fetchWatchlist).toHaveBeenCalled();
    });

    it('should set errorMessage if adding to watchlist fails', () => {
      const symbol = 'AAPL';
      stockService.addToWatchlist.and.returnValue(
        throwError(() => new Error('Error'))
      );

      component.addToWatchlist(symbol);
      fixture.detectChanges();

      expect(component.errorMessage).toEqual(
        'AAPL is already in the watchlist.'
      );
    });
  });

  describe('#removeFromWatchlist', () => {
    it('should call removeFromWatchlist and then fetchWatchlist on success', () => {
      const symbol = 'AAPL';
      stockService.removeFromWatchlist.and.returnValue(of({}));
      spyOn(component, 'fetchWatchlist');

      component.removeFromWatchlist(symbol);
      fixture.detectChanges();

      expect(stockService.removeFromWatchlist).toHaveBeenCalledWith(symbol);
      expect(component.fetchWatchlist).toHaveBeenCalled();
    });

    it('should set errorMessage if removal fails', () => {
      const symbol = 'AAPL';
      stockService.removeFromWatchlist.and.returnValue(
        throwError(() => new Error('Error'))
      );

      component.removeFromWatchlist(symbol);
      fixture.detectChanges();

      expect(component.errorMessage).toEqual(
        'AAPL was not found in the watchlist.'
      );
    });
  });
});
