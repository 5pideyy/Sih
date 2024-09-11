from fastapi import FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List
from pydantic import BaseModel
from datetime import datetime
from bson import ObjectId

# MongoDB connection URI
MONGO_URI = "mongodb+srv://admin:admin@cluster0.1wgqgg8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

# FastAPI instance
app = FastAPI()

# MongoDB client
client = AsyncIOMotorClient(MONGO_URI)
db = client.test
logs_collection = db.requestlogs

# Pydantic Model for the log
class Log(BaseModel):
    id: str  # For MongoDB ObjectId
    ipAddress: str
    userAgent: str
    geoLocation: str
    httpHeaders: str
    urlPath: str
    queryParameters: str
    connectionDuration: str
    referrer: str
    cookies: str
    protocolType: str
    portNumber: str
    trafficVolume: int
    sessionId: str
    timestamp: str
    requestMethod: str
    responseTime: int
    statusCode: int
    requestPayloadSize: int

# Helper function to convert MongoDB object to Pydantic model-friendly format
def transform_mongo_document(log):
    log['id'] = str(log['_id'])  # Convert ObjectId to string
    
    # Convert MongoDB Date to ISO 8601 formatted string
    
    # Ensure other fields are properly typed (integers, strings)
    log['trafficVolume'] = int(log.get('trafficVolume', 0))
    log['responseTime'] = int(log.get('responseTime', 0))
    log['statusCode'] = int(log.get('statusCode', 0))
    log['requestPayloadSize'] = int(log.get('requestPayloadSize', 0))

    return log

@app.get("/logs", response_model=List[Log])
async def get_logs():
    """
    Retrieve all logs from MongoDB and convert to Pydantic-friendly format.
    """
    logs = await logs_collection.find().to_list(1000)  # Fetch up to 1000 logs
    if not logs:
        raise HTTPException(status_code=404, detail="No logs found")

    # Transform each log to be compatible with the Pydantic model
    transformed_logs = [transform_mongo_document(log) for log in logs]

    return transformed_logs
