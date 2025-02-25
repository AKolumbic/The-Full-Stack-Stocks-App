import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    provideRouter([
      {
        path: '',
        loadComponent: () =>
          import('./app/components/stock-search/stock-search.component').then(
            (m) => m.StockSearchComponent
          ),
      },
      { path: '**', redirectTo: '' },
    ]),
  ],
}).catch((err) => console.error(err));
