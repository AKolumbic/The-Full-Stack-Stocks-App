import { Component } from '@angular/core';
import { StockSearchComponent } from './components/stock-search/stock-search.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [StockSearchComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {}
