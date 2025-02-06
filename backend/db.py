from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
db = client["asmp_db"]

def get_collection(name):
    return db[name]