import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StockSearchService {
  private apiUrl = 'http://127.0.0.1:8000'; // Backend URL

  constructor(private http: HttpClient) {}

  // Fetch stock data
  getStockData(symbol: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/stocks/${symbol}`);
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
}
