import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import {
  StockSearchService,
  StockData,
  HistoricalData,
} from '../../services/stock-search.service';
import { ThemeService, Theme } from '../../services/theme.service';
import { Subscription } from 'rxjs';
import { StockChartComponent } from '../../components/stock-chart/stock-chart.component';
import { ChartData } from '../../services/stock-chart.service';

interface WatchlistItem {
  symbol: string;
  expanded: boolean;
  chartData?: ChartData;
  loading: boolean;
}

@Component({
  selector: 'app-stock-search',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, StockChartComponent],
  templateUrl: './stock-search.component.html',
  styleUrls: ['./stock-search.component.scss'],
})
export class StockSearchComponent implements OnInit, OnDestroy {
  stockSymbol: string = '';
  stockData: StockData | null = null;
  historicalData: HistoricalData | null = null;
  chartData: ChartData | null = null;
  selectedPeriod: string = '1m';
  watchlist: WatchlistItem[] = [];
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
   * Get stock and chart data synchronously
   */
  private getStockWithChartData(symbol: string, period: string = '1m') {
    this.loading = true;
    this.errorMessage = '';

    // First get stock data
    this.stockService
      .getStockData(symbol)
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (data) => {
          console.log('Stock data received:', data);
          this.stockData = data;
          this.errorMessage = '';

          // Then get chart data
          this.getHistoricalData(symbol, period);
        },
        error: (err) => {
          console.error('Error fetching stock data:', err);
          this.errorMessage = `Stock not found: ${symbol}`;
          this.stockData = null;
          this.chartData = null;
        },
      });
  }

  /**
   * Fetch stock data from the backend API
   */
  searchStock() {
    if (!this.stockSymbol) return;

    // Convert symbol to uppercase for consistency
    this.stockSymbol = this.stockSymbol.toUpperCase().trim();

    // Get both stock data and chart data
    this.getStockWithChartData(this.stockSymbol, this.selectedPeriod);
  }

  /**
   * Get historical data for the chart
   */
  getHistoricalData(symbol: string, period: string = '1m') {
    this.stockService.getHistoricalData(symbol, period).subscribe({
      next: (data) => {
        this.historicalData = data;
        this.generateChartData(data);
      },
      error: (err) => {
        console.error('Error fetching historical data:', err);
        this.historicalData = null;
        this.chartData = null;
      },
    });
  }

  /**
   * Generate chart data from historical data
   */
  private generateChartData(data: HistoricalData) {
    const dates = data.data.map((point) => point.date);
    const prices = data.data.map((point) => point.price);

    // Determine if the overall trend is positive or negative
    const startPrice = prices[0];
    const endPrice = prices[prices.length - 1];
    const isPositive = endPrice >= startPrice;

    // Set color based on positive/negative trend
    const lineColor = isPositive
      ? 'rgba(75, 192, 75, 1)'
      : 'rgba(255, 99, 132, 1)';
    const fillColor = isPositive
      ? 'rgba(75, 192, 75, 0.2)'
      : 'rgba(255, 99, 132, 0.2)';

    this.chartData = {
      symbol: data.symbol,
      period: data.period,
      dates,
      prices,
      trend: data.trend,
    };
  }

  /**
   * Change the time period for the chart
   */
  changePeriod(period: string) {
    this.selectedPeriod = period;
    if (this.stockSymbol) {
      this.getHistoricalData(this.stockSymbol, period);
    }
  }

  /**
   * Fetch the watchlist from the backend
   */
  fetchWatchlist() {
    this.stockService.getWatchlist().subscribe({
      next: (data) => {
        // Map strings to WatchlistItem objects
        this.watchlist = data.map((symbol) => ({
          symbol,
          expanded: false,
          loading: false,
        }));
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
    if (this.watchlist.some((item) => item.symbol === symbol)) {
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

  /**
   * Toggle expanded state for a watchlist item
   */
  toggleWatchlistItem(item: WatchlistItem) {
    item.expanded = !item.expanded;

    // Load chart data if expanding and not already loaded
    if (item.expanded && !item.chartData) {
      item.loading = true;
      this.stockService.getHistoricalData(item.symbol, '1m').subscribe({
        next: (data) => {
          // Generate chart data for this watchlist item
          const dates = data.data.map((point) => point.date);
          const prices = data.data.map((point) => point.price);

          // Determine if trend is positive
          const startPrice = prices[0];
          const endPrice = prices[prices.length - 1];
          const isPositive = endPrice >= startPrice;

          // Set color based on trend
          const lineColor = isPositive
            ? 'rgba(75, 192, 75, 1)'
            : 'rgba(255, 99, 132, 1)';
          const fillColor = isPositive
            ? 'rgba(75, 192, 75, 0.2)'
            : 'rgba(255, 99, 132, 0.2)';

          item.chartData = {
            symbol: item.symbol,
            period: '1m',
            dates,
            prices,
            trend: data.trend,
          };
          item.loading = false;
        },
        error: (err) => {
          console.error(`Error fetching chart data for ${item.symbol}:`, err);
          item.loading = false;
        },
      });
    }
  }
}
