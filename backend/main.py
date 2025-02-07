from fastapi import FastAPI
from backend.routes.stock_search import router as stock_router  # Explicit Import

app = FastAPI()

app.include_router(stock_router)

@app.get("/")
def root():
    return {"message": "Welcome to ASMP Backend"}