import { Component } from '@angular/core';
import { StockSearchComponent } from './components/stock-search/stock-search.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [StockSearchComponent],
  template: `<app-stock-search></app-stock-search>`,
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {}
