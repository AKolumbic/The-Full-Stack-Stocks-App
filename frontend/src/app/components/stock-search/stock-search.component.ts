import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { StockSearchService } from '../../services/stock-search.service';
import { ThemeService, Theme } from '../../services/theme.service';
import { Subscription } from 'rxjs';

interface StockData {
  price: number;
  change: number;
  percent_change: string;
}

@Component({
  selector: 'app-stock-search',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './stock-search.component.html',
  styleUrls: ['./stock-search.component.scss'],
})
export class StockSearchComponent implements OnInit, OnDestroy {
  stockSymbol: string = '';
  stockData: StockData | null = null;
  watchlist: string[] = [];
  errorMessage: string = '';
  loading: boolean = false;
  currentTheme: Theme;

  private themeSubscription: Subscription | null = null;

  constructor(
    private stockService: StockSearchService,
    private themeService: ThemeService
  ) {
    this.currentTheme = this.themeService.getCurrentTheme();
    console.log(
      `StockSearchComponent initialized with theme: ${this.currentTheme}`
    );
  }

  ngOnInit() {
    this.fetchWatchlist();

    // Subscribe to theme changes
    this.themeSubscription = this.themeService.theme$.subscribe((theme) => {
      console.log(`Theme changed to: ${theme}`);
      this.currentTheme = theme;
    });
  }

  ngOnDestroy() {
    // Clean up subscription when component is destroyed
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  /**
   * Toggle between light and dark mode
   */
  toggleTheme() {
    console.log(`Toggle theme clicked. Current theme: ${this.currentTheme}`);
    this.themeService.toggleTheme();
  }

  /**
   * Fetch stock data from backend
   */
  searchStock() {
    if (!this.stockSymbol) return;

    this.loading = true;
    this.errorMessage = '';

    // Convert symbol to uppercase for consistency
    this.stockSymbol = this.stockSymbol.toUpperCase().trim();

    this.stockService
      .getStockData(this.stockSymbol)
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (data) => {
          this.stockData = data;
          this.errorMessage = '';
        },
        error: (err) => {
          console.error('Error fetching stock data:', err);
          this.errorMessage = `Stock not found: ${this.stockSymbol}`;
          this.stockData = null;
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
      error: (err) => {
        console.error('Error fetching watchlist:', err);
        this.watchlist = [];
      },
    });
  }

  /**
   * Add a stock to the watchlist
   */
  addToWatchlist(symbol: string) {
    // Check if already in watchlist to prevent duplicate API calls
    if (this.watchlist.includes(symbol)) {
      this.errorMessage = `${symbol} is already in the watchlist.`;
      return;
    }

    this.errorMessage = '';
    this.stockService.addToWatchlist(symbol).subscribe({
      next: () => {
        this.fetchWatchlist();
      },
      error: (err) => {
        console.error('Error adding to watchlist:', err);
        this.errorMessage = `${symbol} could not be added to the watchlist.`;
      },
    });
  }

  /**
   * Remove a stock from the watchlist
   */
  removeFromWatchlist(symbol: string) {
    this.errorMessage = '';
    this.stockService.removeFromWatchlist(symbol).subscribe({
      next: () => {
        this.fetchWatchlist();
      },
      error: (err) => {
        console.error('Error removing from watchlist:', err);
        this.errorMessage = `${symbol} was not found in the watchlist.`;
      },
    });
  }
}
