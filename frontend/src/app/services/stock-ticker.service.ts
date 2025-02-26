import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, timer } from 'rxjs';
import { catchError, map, switchMap, shareReplay } from 'rxjs/operators';

export interface TickerStock {
  symbol: string;
  price: number;
  change: number;
  percent_change: string;
  last_updated: string;
  source?: string;
}

@Injectable({
  providedIn: 'root',
})
export class StockTickerService {
  private apiUrl = 'http://127.0.0.1:8000'; // Backend URL
  private refreshInterval = 60000; // Refresh every 60 seconds
  private stocksCache$: Observable<TickerStock[]>;

  constructor(private http: HttpClient) {
    // Initialize the cache with auto-refresh
    this.stocksCache$ = this.setupAutoRefresh();
  }

  /**
   * Gets popular stocks for the ticker with automatic refresh
   */
  getPopularStocks(): Observable<TickerStock[]> {
    return this.stocksCache$;
  }

  /**
   * Sets up automatic refreshing of stock data
   */
  private setupAutoRefresh(): Observable<TickerStock[]> {
    return timer(0, this.refreshInterval).pipe(
      switchMap(() => this.fetchPopularStocks()),
      shareReplay(1) // Share the same data with all subscribers
    );
  }

  /**
   * Fetches popular stocks data from the backend
   */
  private fetchPopularStocks(): Observable<TickerStock[]> {
    return this.http
      .get<TickerStock[]>(`${this.apiUrl}/stocks/ticker/popular`)
      .pipe(
        catchError((error) => {
          console.error('Error fetching ticker stocks:', error);
          return of([]);
        })
      );
  }
}
