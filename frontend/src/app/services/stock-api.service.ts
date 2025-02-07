import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root', // ✅ Ensures this service is available across the entire app
})
export class StockApiService {
  private apiUrl = 'https://api.example.com/stocks'; // Replace with your API

  constructor(private http: HttpClient) {} // ✅ Inject HttpClient correctly

  getStockData(symbol: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${symbol}`).pipe(
      catchError((error) => {
        console.error('Error fetching stock data:', error);
        return throwError(() => new Error('Failed to fetch stock data'));
      })
    );
  }
}
