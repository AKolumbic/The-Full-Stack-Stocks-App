import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StockApiService {
  private apiUrl = 'http://127.0.0.1:8000/stocks'; // ✅ Update to backend URL

  constructor(private http: HttpClient) {}

  getStockData(symbol: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${symbol}`).pipe(
      catchError((error) => {
        console.error('Error fetching stock data:', error);
        return throwError(() => new Error('Failed to fetch stock data'));
      })
    );
  }
}
