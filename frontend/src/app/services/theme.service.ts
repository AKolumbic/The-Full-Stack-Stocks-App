import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private themeSubject = new BehaviorSubject<Theme>(this.getInitialTheme());
  public theme$: Observable<Theme> = this.themeSubject.asObservable();

  constructor() {
    // Apply the initial theme
    this.applyTheme(this.themeSubject.value);

    // Optional: Listen for system preference changes
    this.listenForSystemPreferenceChanges();

    // Log the initial theme for debugging
    console.log(`Initial theme: ${this.themeSubject.value}`);
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme(): void {
    const newTheme = this.themeSubject.value === 'light' ? 'dark' : 'light';
    console.log(`Toggling theme to: ${newTheme}`);
    this.setTheme(newTheme);
  }

  /**
   * Set a specific theme
   */
  setTheme(theme: Theme): void {
    localStorage.setItem('theme', theme);
    this.themeSubject.next(theme);
    this.applyTheme(theme);
    console.log(`Theme set to: ${theme}, localStorage updated`);
  }

  /**
   * Get the current theme
   */
  getCurrentTheme(): Theme {
    return this.themeSubject.value;
  }

  /**
   * Apply the theme to the document element
   */
  private applyTheme(theme: Theme): void {
    // Ensure we're targeting the documentElement (<html> tag)
    document.documentElement.setAttribute('data-theme', theme);
    console.log(`Applied data-theme="${theme}" to HTML element`);
  }

  /**
   * Get the initial theme based on localStorage or system preference
   */
  private getInitialTheme(): Theme {
    // Check if the user has previously selected a theme
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      console.log(`Using saved theme from localStorage: ${savedTheme}`);
      return savedTheme;
    }

    // Otherwise, use the system preference
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;
    console.log(
      `No saved theme, using system preference: ${
        prefersDark ? 'dark' : 'light'
      }`
    );
    return prefersDark ? 'dark' : 'light';
  }

  /**
   * Listen for system preference changes and update the theme accordingly if no user preference is set
   */
  private listenForSystemPreferenceChanges(): void {
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (e) => {
        // Only update if the user hasn't explicitly set a preference
        if (!localStorage.getItem('theme')) {
          const newTheme: Theme = e.matches ? 'dark' : 'light';
          console.log(`System preference changed to: ${newTheme}`);
          this.setTheme(newTheme);
        }
      });
  }
}
