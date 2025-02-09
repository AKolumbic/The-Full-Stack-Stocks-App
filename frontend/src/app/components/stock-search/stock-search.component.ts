import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-stock-search',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './stock-search.component.html',
  styleUrls: ['./stock-search.component.scss'],
})
export class StockSearchComponent {
  stockSymbol: string = '';
  stockData: any = null;
  errorMessage: string = '';

  constructor(private http: HttpClient) {}

  searchStock() {
    if (!this.stockSymbol) return;

    this.http
      .get(`https://api.example.com/stocks/${this.stockSymbol}`)
      .subscribe({
        next: (data) => {
          this.stockData = data;
          this.errorMessage = '';
        },
        error: () => {
          this.errorMessage = `Stock not found: ${this.stockSymbol}`;
          this.stockData = null;
        },
      });
  }
}
