import { Component } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HttpClientModule], // ✅ Manually providing HttpClientModule
  template: `<h1>Angular Debugging</h1>`,
})
export class AppComponent {}
