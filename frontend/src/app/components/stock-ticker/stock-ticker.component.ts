import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import {
  StockTickerService,
  TickerStock,
} from '../../services/stock-ticker.service';

@Component({
  selector: 'app-stock-ticker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stock-ticker.component.html',
  styleUrls: ['./stock-ticker.component.scss'],
})
export class StockTickerComponent implements OnInit, OnDestroy {
  stocks: TickerStock[] = [];
  loading: boolean = true;
  error: string | null = null;
  private subscription: Subscription | null = null;

  constructor(private stockTickerService: StockTickerService) {}

  ngOnInit(): void {
    this.loading = true;
    this.subscription = this.stockTickerService.getPopularStocks().subscribe({
      next: (data) => {
        this.stocks = data;
        this.loading = false;
        this.error = null;
      },
      error: (err) => {
        console.error('Error loading ticker data:', err);
        this.error = 'Failed to load ticker data';
        this.loading = false;
      },
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  /**
   * Helper function to determine the CSS class based on price change
   */
  getChangeClass(change: number): string {
    return change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
  }
}
