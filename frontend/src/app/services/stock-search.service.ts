import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface StockData {
  symbol: string;
  price: number;
  change: number;
  percent_change: string;
}

export interface HistoricalDataPoint {
  date: string;
  price: number;
}

export interface HistoricalData {
  symbol: string;
  period: string;
  data: HistoricalDataPoint[];
  trend: 'up' | 'down' | 'neutral';
}

@Injectable({
  providedIn: 'root',
})
export class StockSearchService {
  private apiUrl = 'http://127.0.0.1:8000'; // Backend URL

  constructor(private http: HttpClient) {}

  getStockData(symbol: string): Observable<StockData> {
    // For development, return mock data
    // In production, this would call the actual API
    return of(this.getMockStockData(symbol)).pipe(
      catchError((error) => {
        console.error('Error fetching stock data:', error);
        throw new Error('Failed to fetch stock data. Please try again later.');
      })
    );
  }

  getHistoricalData(
    symbol: string,
    period: string = '1m'
  ): Observable<HistoricalData> {
    // For development, return mock data
    // In production, this would call: return this.http.get<HistoricalData>(`${this.apiUrl}/${symbol}/history?period=${period}`);
    return of(this.getMockHistoricalData(symbol, period)).pipe(
      catchError((error) => {
        console.error('Error fetching historical data:', error);
        throw new Error(
          'Failed to fetch historical data. Please try again later.'
        );
      })
    );
  }

  // Fetch watchlist
  getWatchlist(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/watchlist`);
  }

  // Add stock to watchlist
  addToWatchlist(symbol: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/watchlist/${symbol}`, {}); // Must send an empty object `{}` for FastAPI
  }

  // Remove stock from watchlist
  removeFromWatchlist(symbol: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/watchlist/${symbol}`);
  }

  private getMockStockData(symbol: string): StockData {
    // Generate random price and movement for demo purposes
    const basePrice = this.getBasePrice(symbol);
    const change = Math.round((Math.random() * 10 - 5) * 100) / 100;
    const price = Math.round((basePrice + change) * 100) / 100;
    const percentChange = ((change / (price - change)) * 100).toFixed(2) + '%';

    return {
      symbol: symbol.toUpperCase(),
      price,
      change,
      percent_change: percentChange,
    };
  }

  private getMockHistoricalData(
    symbol: string,
    period: string
  ): HistoricalData {
    const dataPoints: HistoricalDataPoint[] = [];
    const basePrice = this.getBasePrice(symbol);
    let currentPrice = basePrice;
    const volatility = this.getVolatility(symbol);

    // Define number of data points based on period
    let days: number;
    switch (period) {
      case '1m':
        days = 30;
        break;
      case '3m':
        days = 90;
        break;
      case '6m':
        days = 180;
        break;
      case '1y':
        days = 365;
        break;
      default:
        days = 30;
    }

    // Generate data points
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) {
        continue;
      }

      // Random price movement based on volatility
      const change = (Math.random() * 2 - 1) * volatility * currentPrice;
      currentPrice = Math.max(0.01, currentPrice + change);
      currentPrice = Math.round(currentPrice * 100) / 100;

      dataPoints.push({
        date: date.toISOString().split('T')[0],
        price: currentPrice,
      });
    }

    // Determine the trend
    const firstPrice = dataPoints[0]?.price || 0;
    const lastPrice = dataPoints[dataPoints.length - 1]?.price || 0;
    let trend: 'up' | 'down' | 'neutral';

    if (lastPrice > firstPrice * 1.01) {
      trend = 'up';
    } else if (lastPrice < firstPrice * 0.99) {
      trend = 'down';
    } else {
      trend = 'neutral';
    }

    return {
      symbol: symbol.toUpperCase(),
      period,
      data: dataPoints,
      trend,
    };
  }

  private getBasePrice(symbol: string): number {
    // Map symbols to base prices for consistency
    const symbolMap: { [key: string]: number } = {
      AAPL: 175.25,
      MSFT: 390.12,
      GOOGL: 155.78,
      AMZN: 180.35,
      META: 480.42,
      TSLA: 190.15,
      NVDA: 830.7,
      NFLX: 630.85,
    };

    return symbolMap[symbol.toUpperCase()] || 50 + Math.random() * 150;
  }

  private getVolatility(symbol: string): number {
    // Map symbols to volatility levels
    const volatilityMap: { [key: string]: number } = {
      AAPL: 0.008,
      MSFT: 0.007,
      GOOGL: 0.009,
      AMZN: 0.012,
      META: 0.015,
      TSLA: 0.025,
      NVDA: 0.02,
      NFLX: 0.018,
    };

    return volatilityMap[symbol.toUpperCase()] || 0.01;
  }
}
