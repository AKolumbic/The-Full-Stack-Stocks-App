import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { StockSearchService } from '../../services/stock-search.service';

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
  watchlist: string[] = [];
  errorMessage: string = '';
  loading: boolean = false; // Added loading state

  constructor(private stockService: StockSearchService) {}

  ngOnInit() {
    this.fetchWatchlist();
  }

  /**
   * Fetch stock data from backend
   */
  searchStock() {
    if (!this.stockSymbol) return;
    this.loading = true; // Show loading

    this.stockService.getStockData(this.stockSymbol).subscribe({
      next: (data) => {
        this.stockData = data;
        this.errorMessage = '';
      },
      error: () => {
        this.errorMessage = `Stock not found: ${this.stockSymbol}`;
        this.stockData = null;
      },
      complete: () => {
        this.loading = false; // Hide loading
      },
    });
  }

  /**
   * Fetch the watchlist from the backend
   */
  fetchWatchlist() {
    this.stockService.getWatchlist().subscribe({
      next: (data) => {
        this.watchlist = data;
      },
      error: () => {
        this.watchlist = [];
      },
    });
  }

  /**
   * Add a stock to the watchlist
   */
  addToWatchlist(symbol: string) {
    this.stockService.addToWatchlist(symbol).subscribe({
      next: () => {
        this.fetchWatchlist();
      },
      error: () => {
        this.errorMessage = `${symbol} is already in the watchlist.`;
      },
    });
  }

  /**
   * Remove a stock from the watchlist
   */
  removeFromWatchlist(symbol: string) {
    this.stockService.removeFromWatchlist(symbol).subscribe({
      next: () => {
        this.fetchWatchlist();
      },
      error: () => {
        this.errorMessage = `${symbol} was not found in the watchlist.`;
      },
    });
  }
}
