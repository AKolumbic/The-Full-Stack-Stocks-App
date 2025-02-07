import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StockApiService {
  private apiUrl = 'http://localhost:8000/stocks'; // Update if needed

  constructor(private http: HttpClient) {}

  getStockData(symbol: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${symbol}`);
  }

  addToWatchlist(symbol: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/watchlist`, { symbol });
  }
}
