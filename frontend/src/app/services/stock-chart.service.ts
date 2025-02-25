import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface ChartData {
  symbol: string;
  period: string;
  dates: string[];
  prices: number[];
  trend: 'up' | 'down' | 'neutral';
  last_updated?: string;
  error?: boolean;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root',
})
export class StockChartService {
  private apiUrl = 'http://127.0.0.1:8000'; // Backend URL

  constructor(private http: HttpClient) {}

  /**
   * Get chart data for a stock symbol
   * @param symbol Stock symbol (e.g., AAPL, MSFT)
   * @param period Time period for chart data ("1d", "1w", "1m", "3m", "6m", "1y", "5y")
   * @returns Observable with chart data for the specified stock and period
   */
  getChartData(symbol: string, period: string = '1m'): Observable<ChartData> {
    const url = `${this.apiUrl}/chart/${symbol}?period=${period}`;

    return this.http.get<ChartData>(url).pipe(
      map((data) => {
        console.log(`Received chart data for ${symbol}:`, data);
        // Log the first and last price for easy verification
        if (data.prices && data.prices.length > 0) {
          console.log(
            `First price: $${data.prices[0]}, Last price: $${
              data.prices[data.prices.length - 1]
            }`
          );
        }
        return data;
      }),
      catchError((error) => {
        console.error('Error fetching chart data:', error);

        // Return error state instead of mock data
        return of({
          symbol: symbol,
          period: period,
          dates: ['Error'],
          prices: [0],
          trend: 'neutral' as const,
          error: true,
          errorMessage: 'Error Retrieving Chart Data',
        });
      })
    );
  }
}
