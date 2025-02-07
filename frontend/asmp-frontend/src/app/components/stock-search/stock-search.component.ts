import { Component } from '@angular/core';
import { StockApiService } from '../../services/stock-api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-stock-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-search.component.html',
  styleUrls: ['./stock-search.component.scss'],
})
export class StockSearchComponent {
  stockSymbol: string = '';
  stockData: any = null;
  errorMessage: string = '';

  constructor(private stockService: StockApiService) {}

  searchStock() {
    if (!this.stockSymbol) return;

    this.stockService.getStockData(this.stockSymbol.toUpperCase()).subscribe({
      next: (data) => {
        this.stockData = data;
        this.errorMessage = '';
      },
      error: (err) => {
        this.errorMessage = `Stock not found: ${this.stockSymbol}`;
        this.stockData = null;
      },
    });
  }

  addToWatchlist() {
    if (!this.stockData) return;

    this.stockService.addToWatchlist(this.stockData.symbol).subscribe({
      next: () => alert(`${this.stockData.symbol} added to watchlist!`),
      error: () =>
        alert(`Failed to add ${this.stockData.symbol} to watchlist.`),
    });
  }
}
