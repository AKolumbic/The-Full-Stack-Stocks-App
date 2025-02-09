from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes.stock_search import router as stock_router
from .routes.watchlist import router as watchlist_router

app = FastAPI()

# Allow frontend to call backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(stock_router, prefix="/stocks", tags=["stocks"])
app.include_router(watchlist_router, prefix="/watchlist", tags=["watchlist"])

@app.get("/")
def root():
    return {"message": "Welcome to ASMP Backend"}