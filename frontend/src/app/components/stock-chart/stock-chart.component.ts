import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartType } from 'chart.js/auto';
import { registerables } from 'chart.js';

// Register all Chart.js components
Chart.register(...registerables);

export interface ChartData {
  dates: string[];
  prices: number[];
  trend: 'up' | 'down' | 'neutral';
}

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
export class StockChartComponent implements OnChanges {
  @Input() chartData!: ChartData;
  @Input() isMiniChart: boolean = false;

  private chart: Chart | null = null;
  private canvas: HTMLCanvasElement | null = null;

  ngAfterViewInit() {
    this.canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (this.canvas && this.chartData) {
      this.createChart();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (
      (changes['chartData'] && !changes['chartData'].firstChange) ||
      (changes['isMiniChart'] && !changes['isMiniChart'].firstChange)
    ) {
      if (this.chart) {
        this.chart.destroy();
      }

      if (this.canvas && this.chartData) {
        this.createChart();
      }
    }
  }

  private createChart() {
    if (!this.canvas) return;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

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
}
