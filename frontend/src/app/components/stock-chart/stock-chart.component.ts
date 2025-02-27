import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartType } from 'chart.js/auto';
import { registerables } from 'chart.js';
import 'chartjs-adapter-date-fns'; // Import date adapter for time axes
import {
  StockChartService,
  ChartData,
} from '../../services/stock-chart.service';

// Register all Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-stock-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stock-chart.component.html',
  styleUrls: ['./stock-chart.component.scss'],
})
export class StockChartComponent implements OnChanges, OnInit, AfterViewInit {
  @Input() chartData?: ChartData;
  @Input() symbol?: string;
  @Input() period: string = '1m';
  @Input() isMiniChart: boolean = false;
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;
  isAlphaVantageRateLimited: boolean = false;

  constructor(private stockChartService: StockChartService) {}

  ngOnInit() {
    // If no chartData is provided but symbol is, fetch the data
    if (!this.chartData && this.symbol) {
      this.fetchChartData();
    }
  }

  /**
   * Fetch chart data from the service
   */
  private fetchChartData() {
    if (!this.symbol) return;

    this.stockChartService.getChartData(this.symbol, this.period).subscribe({
      next: (data) => {
        this.chartData = data;
        this.checkForAlphaVantageRateLimit(data);
        this.renderChart();
      },
      error: (error) => {
        console.error('Error fetching chart data:', error);
        // Check if error is due to Alpha Vantage rate limit (HTTP 429)
        if (error?.status === 429) {
          this.isAlphaVantageRateLimited = true;
          // Create a minimal chart data object with error information
          this.chartData = {
            error: true,
            errorMessage:
              error.error?.message ||
              'Alpha Vantage API rate limit reached (25 requests per day)',
            dates: [],
            prices: [],
            symbol: this.symbol || '',
            period: this.period,
            trend: 'neutral',
            rate_limited: true,
          };
        }
      },
    });
  }

  /**
   * Check if the error is related to Alpha Vantage rate limit
   */
  private checkForAlphaVantageRateLimit(data: ChartData) {
    this.isAlphaVantageRateLimited = false;
    if (
      data.error &&
      (data.errorMessage?.toLowerCase().includes('alpha vantage') ||
        data.errorMessage?.toLowerCase().includes('rate limit'))
    ) {
      this.isAlphaVantageRateLimited = true;
    }
  }

  ngAfterViewInit() {
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    // If symbol or period changes, fetch new data
    if (
      (changes['symbol'] && !changes['symbol'].firstChange) ||
      (changes['period'] && !changes['period'].firstChange)
    ) {
      this.fetchChartData();
    }

    // If chartData or isMiniChart changes directly, re-render the chart
    if (
      (changes['chartData'] && !changes['chartData'].firstChange) ||
      (changes['isMiniChart'] && !changes['isMiniChart'].firstChange)
    ) {
      if (changes['chartData']) {
        this.checkForAlphaVantageRateLimit(changes['chartData'].currentValue);
      }
      this.renderChart();
    }
  }

  /**
   * Determine if the data is intraday (has timestamps rather than just dates)
   */
  private isIntradayData(): boolean {
    if (
      !this.chartData ||
      !this.chartData.dates ||
      this.chartData.dates.length === 0
    ) {
      return false;
    }

    // Check if the first date includes a time component (HH:MM format)
    return this.period === '1d' && this.chartData.dates[0].includes(':');
  }

  /**
   * Render the chart with the current data
   */
  private renderChart() {
    if (!this.chartCanvas || !this.chartData) return;

    // Destroy existing chart if it exists
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Check if there's an error in the chart data
    if (this.chartData.error) {
      // Display error message instead of chart
      this.displayErrorMessage(ctx);
      return;
    }

    // Check if we're dealing with intraday data
    const isIntraday = this.isIntradayData();

    // Set chart color based on trend
    const strokeColor =
      this.chartData.trend === 'up'
        ? 'rgba(39, 174, 96, 1)'
        : this.chartData.trend === 'down'
        ? 'rgba(231, 76, 60, 1)'
        : 'rgba(74, 144, 226, 1)';

    const fillColor =
      this.chartData.trend === 'up'
        ? 'rgba(39, 174, 96, 0.1)'
        : this.chartData.trend === 'down'
        ? 'rgba(231, 76, 60, 0.1)'
        : 'rgba(74, 144, 226, 0.1)';

    // Prepare labels based on data type
    const labels = isIntraday
      ? this.chartData.dates.map((time) => {
          // For intraday data, use the timestamp directly
          return time;
        })
      : this.chartData.dates;

    const config: ChartConfiguration = {
      type: 'line' as ChartType,
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Price',
            data: this.chartData.prices,
            borderColor: strokeColor,
            backgroundColor: fillColor,
            borderWidth: this.isMiniChart ? 2 : 3,
            pointRadius: this.isMiniChart ? 0 : isIntraday ? 1 : 2,
            pointHoverRadius: this.isMiniChart ? 3 : 5,
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1000,
        },
        plugins: {
          legend: {
            display: !this.isMiniChart,
          },
          tooltip: {
            enabled: true,
            mode: 'index',
            intersect: false,
            // Make mini chart tooltips smaller
            titleFont: {
              size: this.isMiniChart ? 10 : 14,
            },
            bodyFont: {
              size: this.isMiniChart ? 10 : 14,
            },
            callbacks: {
              label: (context) => {
                return `$${context.parsed.y.toFixed(2)}`;
              },
            },
          },
        },
        scales: {
          x: {
            display: !this.isMiniChart,
            grid: {
              display: !this.isMiniChart,
            },
            // For intraday data, use time scale
            type: isIntraday ? 'time' : 'category',
            time: isIntraday
              ? {
                  unit: 'hour',
                  displayFormats: {
                    hour: 'HH:mm',
                  },
                }
              : undefined,
            min: isIntraday ? '09:30' : undefined,
            max: isIntraday ? '16:00' : undefined,
            ticks: {
              maxRotation: isIntraday ? 0 : 0,
              autoSkip: true,
              maxTicksLimit: isIntraday ? 6 : 10,
            },
          },
          y: {
            display: !this.isMiniChart,
            grid: {
              display: !this.isMiniChart,
            },
            ticks: {
              callback: function (value) {
                return '$' + value;
              },
            },
          },
        },
      },
    };

    this.chart = new Chart(ctx, config);
  }

  /**
   * Display error message on canvas
   */
  private displayErrorMessage(ctx: CanvasRenderingContext2D) {
    // Get appropriate error message
    let errorMessage =
      this.chartData?.errorMessage || 'Error Retrieving Chart Data';

    // If this is an Alpha Vantage rate limit error, use a more specific message
    if (this.isAlphaVantageRateLimited) {
      errorMessage =
        'Alpha Vantage API rate limit reached (25 requests per day)';
    }
    // If this is a general rate limit error, use a more generic message
    else if (this.chartData?.rate_limited) {
      errorMessage = 'Using cached data due to API rate limits';
    }

    const canvas = this.chartCanvas.nativeElement;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set text style for error message
    ctx.font = this.isMiniChart ? '14px Arial' : '18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Use different color for rate limit warnings (yellow) vs. errors (red)
    ctx.fillStyle = this.isAlphaVantageRateLimited
      ? 'rgba(231, 76, 60, 1)' // Red for Alpha Vantage rate limit
      : this.chartData?.rate_limited
      ? 'rgba(255, 193, 7, 1)' // Yellow for other rate limits
      : 'rgba(231, 76, 60, 1)'; // Red for other errors

    // Draw error message in the center of the canvas
    ctx.fillText(errorMessage, canvas.width / 2, canvas.height / 2);
  }
}
