# The Full Stack Stocks App

## Overview

The Full Stack Stocks App is a modern stock tracking and analysis tool built with a responsive UI. It provides real-time stock data visualization, watchlist management, and interactive charting with multiple time periods. The application features a clean, user-friendly interface with both light and dark themes, making it easy to monitor your favorite stocks. It's built with **Angular** for the frontend and **FastAPI** for the backend, communicating with financial APIs to fetch market data.

## Features

- **Stock Search**: Quickly look up stocks by ticker symbol (e.g., AAPL, MSFT)
- **Interactive Charts**: View historical stock price data with customizable time periods (1d, 1w, 1m, 3m, 1y)
- **Watchlist Management**: Save favorite stocks to a personalized watchlist for easy monitoring
- **Real-Time Price Data**: Track current stock prices, daily changes, and percentage movements
- **Dark/Light Theme**: Toggle between dark and light modes for comfortable viewing in any environment
- **Responsive Design**: Optimized viewing experience across desktop and mobile devices
- **Expandable Stock Details**: Click on watchlist items to reveal detailed charts and information
- **Graceful Error Handling**: Smart handling of API rate limits with clear user feedback

## Tech Stack

### Frontend

- **Framework**: Angular
- **Data Visualization**: D3.js
- **State Management**: RxJS

### Backend

- **Framework**: FastAPI (Python)
- **Machine Learning**: Scikit-learn or TensorFlow
- **Database**: MongoDB
- **Stock Data APIs**: Alpha Vantage / Yahoo Finance
- **Authentication**: OAuth2.0

## Setup & Installation

### Prerequisites

Ensure you have the following installed:

- **Node.js** (for Angular frontend)
- **Python 3.9+** (for FastAPI backend)
- **MongoDB** (for database storage)
- **Git** (for version control)

### Clone the Repository

```bash
git clone https://github.com/AKolumbic/asmp.git
cd asmp
```

### Frontend Setup

```bash
cd frontend
npm install
ng serve
```

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
```

### To Run Backend from root directory from inside venv

```bash
uvicorn backend.main:app --reload
```

## Screenshots

### Dark Mode

![Stock Market Prediction Application in Dark Mode](frontend/public/darkmode.png)

### Light Mode

![Stock Market Prediction Application in Light Mode](frontend/public/lightmode.png)
