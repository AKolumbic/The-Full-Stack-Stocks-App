import { Component } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { StockSearchComponent } from './components/stock-search/stock-search.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HttpClientModule, StockSearchComponent],
  template: `
    <h1>Stock Search</h1>
    <app-stock-search></app-stock-search>
  `,
})
export class AppComponent {}
