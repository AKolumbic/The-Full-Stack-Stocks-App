import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartType } from 'chart.js/auto';
import { registerables } from 'chart.js';
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
  template: `
    <div class="chart-wrapper" [class.mini-chart]="isMiniChart">
      <canvas #chartCanvas></canvas>
    </div>
  `,
  styles: [
    `
      .chart-wrapper {
        width: 100%;
        height: 100%;
        position: relative;
      }

      .mini-chart {
        height: 150px;
      }
    `,
  ],
})
export class StockChartComponent implements OnChanges, OnInit {
  @Input() chartData?: ChartData;
  @Input() symbol?: string;
  @Input() period: string = '1m';
  @Input() isMiniChart: boolean = false;

  private chart: Chart | null = null;
  private canvas: HTMLCanvasElement | null = null;

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
        this.renderChart();
      },
      error: (error) => {
        console.error('Error fetching chart data:', error);
      },
    });
  }

  ngAfterViewInit() {
    this.canvas = document.querySelector('canvas') as HTMLCanvasElement;
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
      this.renderChart();
    }
  }

  /**
   * Render the chart with the current data
   */
  private renderChart() {
    if (!this.canvas || !this.chartData) return;

    // Destroy existing chart if it exists
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    // Check if there's an error in the chart data
    if (this.chartData.error) {
      // Display error message instead of chart
      this.displayErrorMessage(ctx);
      return;
    }

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

    const config: ChartConfiguration = {
      type: 'line' as ChartType,
      data: {
        labels: this.chartData.dates,
        datasets: [
          {
            label: 'Price',
            data: this.chartData.prices,
            borderColor: strokeColor,
            backgroundColor: fillColor,
            borderWidth: this.isMiniChart ? 2 : 3,
            pointRadius: this.isMiniChart ? 0 : 2,
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
    const errorMessage =
      this.chartData?.errorMessage || 'Error Retrieving Chart Data';
    const canvas = this.canvas!;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set text style for error message
    ctx.font = this.isMiniChart ? '14px Arial' : '18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(231, 76, 60, 1)'; // Red color for error

    // Draw error message in the center of the canvas
    ctx.fillText(errorMessage, canvas.width / 2, canvas.height / 2);
  }
}
