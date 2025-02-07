from fastapi import FastAPI
from .routes.stock_search import router as stock_router
from .routes.watchlist import router as watchlist_router

app = FastAPI()

app.include_router(stock_router)
app.include_router(watchlist_router)

@app.get("/")
def root():
    return {"message": "Welcome to ASMP Backend"}