import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StockChartComponent } from './stock-chart.component';
import { StockChartService } from '../../services/stock-chart.service';
import { ChartData } from '../../services/stock-chart.service';
import { CommonModule } from '@angular/common';
import { of } from 'rxjs';
import { ElementRef } from '@angular/core';
import * as ChartJS from 'chart.js/auto';

describe('StockChartComponent', () => {
  let component: StockChartComponent;
  let fixture: ComponentFixture<StockChartComponent>;
  let stockChartServiceSpy: jasmine.SpyObj<StockChartService>;
  let chartConstructorSpy: jasmine.Spy;

  const mockChartInstance: any = {
    destroy: jasmine.createSpy('destroy'),
    config: {
      data: {
        datasets: [
          {
            data: [] as number[],
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            display: true,
          },
        },
      },
    },
  };

  const mockChartData: ChartData = {
    symbol: 'AAPL',
    period: '1m',
    dates: ['2023-01-01', '2023-01-02', '2023-01-03'],
    prices: [150.5, 152.3, 153.8],
    trend: 'up',
  };

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('StockChartService', ['getChartData']);
    spy.getChartData.and.returnValue(of(mockChartData));

    // Create a properly mocked Chart constructor
    chartConstructorSpy = jasmine
      .createSpy('Chart')
      .and.returnValue(mockChartInstance);

    // Create a global Chart constructor spy
    // This approach works because the component uses Chart from 'chart.js/auto'
    // which is resolved to window.Chart at runtime
    (window as any).Chart = chartConstructorSpy;

    await TestBed.configureTestingModule({
      imports: [CommonModule],
      providers: [{ provide: StockChartService, useValue: spy }],
    }).compileComponents();

    stockChartServiceSpy = TestBed.inject(
      StockChartService
    ) as jasmine.SpyObj<StockChartService>;
  });

  beforeEach(() => {
    // Reset spies
    chartConstructorSpy.calls.reset();
    mockChartInstance.destroy.calls.reset();

    // Update mock data
    mockChartInstance.config.data.datasets[0].data = [...mockChartData.prices];

    fixture = TestBed.createComponent(StockChartComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not fetch data if no symbol is provided', () => {
    component.symbol = undefined;
    component.ngOnInit();
    expect(stockChartServiceSpy.getChartData).not.toHaveBeenCalled();
  });

  it('should fetch chart data when a symbol is provided', () => {
    component.symbol = 'AAPL';
    component.period = '1m';
    component.ngOnInit();

    expect(stockChartServiceSpy.getChartData).toHaveBeenCalledWith(
      'AAPL',
      '1m'
    );
    expect(component.chartData).toEqual(mockChartData);
  });

  it('should update chart when period changes', () => {
    component.symbol = 'AAPL';
    component.period = '1m';
    fixture.detectChanges();

    // Reset spy count
    stockChartServiceSpy.getChartData.calls.reset();

    const changes = {
      period: {
        currentValue: '3m',
        previousValue: '1m',
        firstChange: false,
        isFirstChange: () => false,
      },
    };

    component.period = '3m';
    component.ngOnChanges(changes);

    expect(stockChartServiceSpy.getChartData).toHaveBeenCalledWith(
      'AAPL',
      '3m'
    );
  });

  fit('should create a new chart when chartData is provided', () => {
    // Create a mock canvas element
    const mockCanvas = document.createElement('canvas');
    const mockContext = mockCanvas.getContext('2d');

    // Set up the canvas element
    component.chartCanvas = {
      nativeElement: mockCanvas,
    } as ElementRef<HTMLCanvasElement>;
    spyOn(mockCanvas, 'getContext').and.returnValue(mockContext);

    // Set chart data
    component.chartData = mockChartData;

    // Directly call renderChart
    (component as any).renderChart();

    // Verify Chart constructor was called
    expect(chartConstructorSpy).toHaveBeenCalled();
    expect(chartConstructorSpy).toHaveBeenCalledWith(
      mockContext,
      jasmine.any(Object)
    );
    expect(component['chart']).toBeTruthy();
  });

  it('should destroy existing chart when new chartData is provided', () => {
    // Create a mock canvas
    const mockCanvas = document.createElement('canvas');
    component.chartCanvas = {
      nativeElement: mockCanvas,
    } as ElementRef<HTMLCanvasElement>;
    spyOn(mockCanvas, 'getContext').and.returnValue(
      mockCanvas.getContext('2d')
    );

    // Set up initial chart
    component.chartData = mockChartData;
    (component as any).renderChart();
    expect(chartConstructorSpy).toHaveBeenCalled();

    // Reset spy
    chartConstructorSpy.calls.reset();

    // Update with new data
    const newData = {
      ...mockChartData,
      prices: [160.5, 162.3, 163.8],
    };
    component.chartData = newData;

    // Trigger chart update
    component.ngOnChanges({
      chartData: {
        currentValue: newData,
        previousValue: mockChartData,
        firstChange: false,
        isFirstChange: () => false,
      },
    });

    expect(mockChartInstance.destroy).toHaveBeenCalled();
    expect(chartConstructorSpy).toHaveBeenCalledTimes(1);
  });

  it('should adjust chart styling for mini chart mode', () => {
    // Create a mock canvas
    const mockCanvas = document.createElement('canvas');
    component.chartCanvas = {
      nativeElement: mockCanvas,
    } as ElementRef<HTMLCanvasElement>;
    spyOn(mockCanvas, 'getContext').and.returnValue(
      mockCanvas.getContext('2d')
    );

    // Setup mini chart mode
    component.chartData = mockChartData;
    component.isMiniChart = true;

    // Call renderChart
    (component as any).renderChart();

    // Check mini chart styling was applied
    const config = chartConstructorSpy.calls.mostRecent().args[1];
    expect(config.options.plugins.legend.display).toBe(false);
    expect(config.data.datasets[0].pointRadius).toBe(0);
    expect(config.data.datasets[0].borderWidth).toBe(2);
  });

  it('should handle error state in chart data', () => {
    const errorChartData: ChartData = {
      symbol: 'ERROR',
      period: '1m',
      dates: ['Error'],
      prices: [0],
      trend: 'neutral',
      error: true,
      errorMessage: 'Error Retrieving Chart Data',
    };

    // Create a mock canvas
    const mockCanvas = document.createElement('canvas');
    component.chartCanvas = {
      nativeElement: mockCanvas,
    } as ElementRef<HTMLCanvasElement>;

    // Create a mock context with spies
    const mockContext = jasmine.createSpyObj(
      'CanvasRenderingContext2D',
      ['clearRect', 'fillText'],
      {
        canvas: mockCanvas,
        font: '',
        textAlign: 'center' as CanvasTextAlign,
        textBaseline: 'middle' as CanvasTextBaseline,
        fillStyle: '',
      }
    );

    spyOn(mockCanvas, 'getContext').and.returnValue(mockContext);

    // Set error chart data
    component.chartData = errorChartData;

    // Call renderChart
    (component as any).renderChart();

    // Verify error handling
    expect(chartConstructorSpy).not.toHaveBeenCalled();
    expect(mockContext.clearRect).toHaveBeenCalled();
    expect(mockContext.fillText).toHaveBeenCalledWith(
      'Error Retrieving Chart Data',
      jasmine.any(Number),
      jasmine.any(Number)
    );
  });
});
