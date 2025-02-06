from fastapi import FastAPI
from routes import stock_search

app = FastAPI()

# Include the stock search API
app.include_router(stock_search.router)