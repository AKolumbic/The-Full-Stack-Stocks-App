import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockApiService } from '../../services/stock-api.service'; // ✅ Import service

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

    this.stockService.getStockData(this.stockSymbol).subscribe({
      next: (data) => {
        this.stockData = data;
        this.errorMessage = '';
      },
      error: (err) => {
        this.errorMessage = `Stock not found: ${this.stockSymbol}`;
        console.error(err);
        this.stockData = null;
      },
    });
  }
}
