import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockApiService } from '../../services/stock-api.service';

@Component({
  selector: 'app-stock-search',
  standalone: true,
  imports: [CommonModule as unknown as any, FormsModule as unknown as any], // 👈 Workaround for static analysis
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
      error: () => {
        this.errorMessage = `Stock not found: ${this.stockSymbol}`;
        this.stockData = null;
      },
    });
  }
}
