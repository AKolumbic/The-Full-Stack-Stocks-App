from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get MongoDB connection string from .env
MONGO_URI = os.getenv("MONGO_URI")

# Create a new MongoDB client and connect
client = MongoClient(MONGO_URI, server_api=ServerApi('1'))
db = client["asmp_db"]  # Replace with your actual database name

# Send a ping to confirm a successful connection
try:
    client.admin.command('ping')
    print("✅ Successfully connected to MongoDB Atlas!")
except Exception as e:
    print(f"❌ MongoDB connection error: {e}")

# Define collections
stocks_collection = db["stocks"]
watchlist_collection = db["watchlists"]

def get_collection(name):
    return db[name] 