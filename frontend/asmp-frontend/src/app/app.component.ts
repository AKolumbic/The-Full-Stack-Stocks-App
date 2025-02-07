import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { StockSearchComponent } from '../app/components/stock-search/stock-search.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, StockSearchComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'asmp-frontend';
}
