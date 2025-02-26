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
  price?: number;
  change?: number;
  percent_change?: string;
  selectedPeriod?: string;
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
  periods: string[] = ['1d', '1w', '1m', '3m', '6m', '1y', '5y'];

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

    // Check if the stock is already in the watchlist
    if (this.watchlist.some((item) => item.symbol === this.stockSymbol)) {
      this.errorMessage = `${this.stockSymbol} is already in your watchlist. Please check the watchlist section below.`;

      // Find the watchlist item and expand it
      const existingItem = this.watchlist.find(
        (item) => item.symbol === this.stockSymbol
      );
      if (existingItem) {
        existingItem.expanded = true;

        // Load chart data if not already loaded
        if (!existingItem.chartData) {
          this.loadWatchlistItemChart(existingItem);
        }

        // Scroll to the watchlist section
        setTimeout(() => {
          const watchlistElement = document.querySelector('.watchlist-section');
          if (watchlistElement) {
            watchlistElement.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }

      return;
    }

    // Clear previous error message
    this.errorMessage = '';

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
        // Map strings to WatchlistItem objects and keep expanded state for existing items
        const existingItems = this.watchlist || [];
        this.watchlist = data.map((symbol) => {
          const existingItem = existingItems.find(
            (item) => item.symbol === symbol
          );
          return {
            symbol,
            expanded: existingItem ? existingItem.expanded : false,
            loading: false,
            chartData: existingItem ? existingItem.chartData : undefined,
            selectedPeriod: existingItem ? existingItem.selectedPeriod : '1m',
          };
        });

        // Fetch stock data for each watchlist item
        this.watchlist.forEach((item) => this.loadWatchlistItemData(item));
      },
      error: (err) => {
        console.error('Error fetching watchlist:', err);
        this.watchlist = [];
      },
    });
  }

  /**
   * Load stock data for a watchlist item
   */
  private loadWatchlistItemData(item: WatchlistItem) {
    this.stockService.getStockData(item.symbol).subscribe({
      next: (data) => {
        item.price = data.price;
        item.change = data.change;
        item.percent_change = data.percent_change;
      },
      error: (err) => {
        console.error(`Error fetching stock data for ${item.symbol}:`, err);
      },
    });
  }

  /**
   * Load chart data for a watchlist item
   */
  private loadWatchlistItemChart(item: WatchlistItem) {
    item.loading = true;
    const period = item.selectedPeriod || '1m';

    this.stockService.getHistoricalData(item.symbol, period).subscribe({
      next: (data) => {
        const dates = data.data.map((point) => point.date);
        const prices = data.data.map((point) => point.price);

        item.chartData = {
          symbol: item.symbol,
          period: period,
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

  /**
   * Change period for a watchlist item chart
   */
  changeWatchlistItemPeriod(item: WatchlistItem, period: string) {
    // Don't reload if the period is the same
    if (item.selectedPeriod === period) {
      return;
    }

    item.selectedPeriod = period;
    this.loadWatchlistItemChart(item);
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
        // Store current stock data for use in the watchlist
        const currentPrice = this.stockData?.price;
        const currentChange = this.stockData?.change;
        const currentPercentChange = this.stockData?.percent_change;

        // Clear current stock data
        this.stockData = null;
        this.chartData = null;
        this.stockSymbol = '';

        // Fetch watchlist and expand the new item
        this.stockService.getWatchlist().subscribe({
          next: (data) => {
            this.watchlist = data.map((sym) => {
              // If this is the newly added symbol, use the data we just fetched
              if (sym === symbol) {
                return {
                  symbol,
                  expanded: true, // Expand the newly added symbol
                  loading: true, // Start loading for the new symbol
                  chartData: undefined,
                  selectedPeriod: '1m',
                  price: currentPrice,
                  change: currentChange,
                  percent_change: currentPercentChange,
                };
              } else {
                // For existing items, preserve their current state
                const existingItem = this.watchlist.find(
                  (item) => item.symbol === sym
                );
                return {
                  symbol: sym,
                  expanded: existingItem ? existingItem.expanded : false,
                  loading: false,
                  chartData: existingItem ? existingItem.chartData : undefined,
                  selectedPeriod: existingItem
                    ? existingItem.selectedPeriod
                    : '1m',
                  price: existingItem?.price,
                  change: existingItem?.change,
                  percent_change: existingItem?.percent_change,
                };
              }
            });

            // Load chart data for the new item
            if (symbol) {
              const newItem = this.watchlist.find(
                (item) => item.symbol === symbol
              );
              if (newItem) {
                this.loadWatchlistItemChart(newItem);

                // If we don't have stock data for the new item yet, fetch it
                if (newItem.price === undefined) {
                  this.loadWatchlistItemData(newItem);
                }
              }
            }

            // Scroll to watchlist section after a short delay to ensure DOM is updated
            setTimeout(() => {
              const watchlistElement =
                document.querySelector('.watchlist-section');
              if (watchlistElement) {
                watchlistElement.scrollIntoView({ behavior: 'smooth' });
              }
            }, 100);
          },
          error: (err) => {
            console.error('Error fetching watchlist:', err);
            this.watchlist = [];
          },
        });
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
      this.loadWatchlistItemChart(item);
    }
  }
}
