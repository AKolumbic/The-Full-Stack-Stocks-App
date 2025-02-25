import { TestBed } from '@angular/core/testing';
import { ThemeService, Theme } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let matchMediaSpy: jasmine.Spy;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Mock matchMedia
    matchMediaSpy = jasmine.createSpy('matchMedia').and.returnValue({
      matches: false, // Default to light theme preference
      addEventListener: jasmine.createSpy('addEventListener'),
    });
    Object.defineProperty(window, 'matchMedia', {
      value: matchMediaSpy,
      writable: true,
    });

    TestBed.configureTestingModule({
      providers: [ThemeService],
    });

    service = TestBed.inject(ThemeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with light theme by default when system prefers light', () => {
    expect(service.getCurrentTheme()).toBe('light');
  });

  it('should initialize with dark theme when system prefers dark', () => {
    // First, destroy the existing service instance
    TestBed.resetTestingModule();

    // Mock system preference for dark theme before creating service
    matchMediaSpy = jasmine.createSpy('matchMedia').and.returnValue({
      matches: true,
      addEventListener: jasmine.createSpy('addEventListener'),
    });
    Object.defineProperty(window, 'matchMedia', {
      value: matchMediaSpy,
      writable: true,
    });

    // Re-configure testing module and create new service instance
    TestBed.configureTestingModule({
      providers: [ThemeService],
    });
    service = TestBed.inject(ThemeService);

    expect(service.getCurrentTheme()).toBe('dark');
  });

  it('should use saved theme from localStorage if available', () => {
    // Setup localStorage with a saved theme
    localStorage.setItem('theme', 'light');

    // Re-initialize service to read from localStorage
    service = TestBed.inject(ThemeService);

    expect(service.getCurrentTheme()).toBe('light');
  });

  it('should toggle theme from dark to light', () => {
    // Set initial theme to dark
    service.setTheme('dark');
    expect(service.getCurrentTheme()).toBe('dark');

    // Toggle
    service.toggleTheme();

    expect(service.getCurrentTheme()).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('should toggle theme from light to dark', () => {
    // Set initial theme to light
    service.setTheme('light');
    expect(service.getCurrentTheme()).toBe('light');

    // Toggle
    service.toggleTheme();

    expect(service.getCurrentTheme()).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('should emit theme changes through the theme$ Observable', (done) => {
    let emittedValues: Theme[] = [];

    service.theme$.subscribe((theme) => {
      emittedValues.push(theme);

      if (emittedValues.length === 2) {
        expect(emittedValues).toEqual(['light', 'dark']);
        done();
      }
    });

    // Should emit current value on subscription (light by default)
    expect(emittedValues[0]).toBe('light');

    // Toggle to emit new value
    service.toggleTheme();
  });

  it('should save theme preference to localStorage', () => {
    spyOn(localStorage, 'setItem');
    service.toggleTheme();
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });

  it('should apply theme to HTML element', () => {
    const documentSpy = spyOn(document.documentElement, 'setAttribute');
    service.toggleTheme();
    expect(documentSpy).toHaveBeenCalledWith('data-theme', 'dark');
  });
});
