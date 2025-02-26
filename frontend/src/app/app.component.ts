import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockSearchComponent } from './components/stock-search/stock-search.component';
import { StockTickerComponent } from './components/stock-ticker/stock-ticker.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, StockSearchComponent, StockTickerComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'Stock Market Tracker';
}
