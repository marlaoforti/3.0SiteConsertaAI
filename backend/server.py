from fastapi import FastAPI, HTTPException, Header, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
import os
import logging
import socketio
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
import httpx

load_dotenv()

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# MongoDB setup
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client["consertaai_db"]

# Socket.IO setup
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
fastapi_app = FastAPI()

# CORS
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Models
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "customer"  # customer, repairer, both
    location: Optional[dict] = None
    address: Optional[str] = None
    created_at: datetime

class RepairerProfile(BaseModel):
    repairer_id: str
    user_id: str
    skills: List[str]
    bio: Optional[str] = None
    hourly_rate: Optional[float] = None
    rating: float = 0.0
    total_repairs: int = 0
    availability: bool = True
    photos: List[str] = []
    created_at: datetime

class RepairRequest(BaseModel):
    request_id: str
    customer_id: str
    title: str
    description: str
    category: str
    images: List[str] = []
    location: Optional[dict] = None
    address: Optional[str] = None
    status: str = "open"  # open, in_progress, completed, cancelled
    assigned_repairer_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class Conversation(BaseModel):
    conversation_id: str
    participants: List[str]
    repair_request_id: Optional[str] = None
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    created_at: datetime

class Message(BaseModel):
    message_id: str
    conversation_id: str
    sender_id: str
    content: str
    timestamp: datetime
    read: bool = False

class ImpactStats(BaseModel):
    total_repairs: int
    total_waste_kg: float
    total_money_saved: float
    total_co2_saved: float
    updated_at: datetime

class CreateRepairerProfile(BaseModel):
    skills: List[str]
    bio: Optional[str] = None
    hourly_rate: Optional[float] = None
    photos: List[str] = []

class CreateRepairRequest(BaseModel):
    title: str
    description: str
    category: str
    images: List[str] = []
    location: Optional[dict] = None
    address: Optional[str] = None

class UpdateUserLocation(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None

class SendMessageRequest(BaseModel):
    receiver_id: str
    content: str
    repair_request_id: Optional[str] = None

# Auth helper
async def get_current_user(authorization: Optional[str] = Header(None), request: Request = None) -> dict:
    # Check cookie first
    session_token = None
    if request:
        session_token = request.cookies.get("session_token")
    
    # Fallback to Authorization header
    if not session_token and authorization:
        if authorization.startswith("Bearer "):
            session_token = authorization.replace("Bearer ", "")
        else:
            session_token = authorization
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Verify session
    session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user_doc

# Auth endpoints
@fastapi_app.post("/api/auth/session")
async def exchange_session(session_id: str = Header(None, alias="X-Session-ID"), response: Response = None):
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")
    
    # Call Emergent Auth API
    async with httpx.AsyncClient() as client:
        try:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if auth_response.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid session_id")
            
            user_data = auth_response.json()
        except Exception as e:
            logger.error(f"Error calling auth API: {e}")
            raise HTTPException(status_code=500, detail="Auth service error")
    
    # Create or update user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    existing_user = await db.users.find_one({"email": user_data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user data
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": user_data["name"],
                "picture": user_data.get("picture")
            }}
        )
    else:
        # Create new user
        await db.users.insert_one({
            "user_id": user_id,
            "email": user_data["email"],
            "name": user_data["name"],
            "picture": user_data.get("picture"),
            "role": "customer",
            "created_at": datetime.now(timezone.utc)
        })
    
    # Create session
    session_token = user_data["session_token"]
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return user_doc

@fastapi_app.get("/api/auth/me")
async def get_me(authorization: Optional[str] = Header(None), request: Request = None):
    user = await get_current_user(authorization, request)
    return user

@fastapi_app.post("/api/auth/logout")
async def logout(authorization: Optional[str] = Header(None), request: Request = None, response: Response = None):
    try:
        user = await get_current_user(authorization, request)
        session_token = request.cookies.get("session_token") or authorization.replace("Bearer ", "")
        await db.user_sessions.delete_one({"session_token": session_token})
        response.delete_cookie("session_token", path="/")
        return {"message": "Logged out successfully"}
    except:
        return {"message": "Logged out"}

# User endpoints
@fastapi_app.put("/api/user/location")
async def update_user_location(data: UpdateUserLocation, authorization: Optional[str] = Header(None), request: Request = None):
    user = await get_current_user(authorization, request)
    
    location = {
        "type": "Point",
        "coordinates": [data.longitude, data.latitude]
    }
    
    update_data = {"location": location}
    if data.address:
        update_data["address"] = data.address
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": update_data}
    )
    
    return {"message": "Location updated"}

@fastapi_app.put("/api/user/role")
async def update_user_role(role: str, authorization: Optional[str] = Header(None), request: Request = None):
    user = await get_current_user(authorization, request)
    
    if role not in ["customer", "repairer", "both"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"role": role}}
    )
    
    return {"message": "Role updated"}

# Repairer endpoints
@fastapi_app.post("/api/repairer/profile")
async def create_repairer_profile(data: CreateRepairerProfile, authorization: Optional[str] = Header(None), request: Request = None):
    user = await get_current_user(authorization, request)
    
    # Check if profile exists
    existing = await db.repairers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Profile already exists")
    
    repairer_id = f"repairer_{uuid.uuid4().hex[:12]}"
    
    profile = {
        "repairer_id": repairer_id,
        "user_id": user["user_id"],
        "skills": data.skills,
        "bio": data.bio,
        "hourly_rate": data.hourly_rate,
        "rating": 0.0,
        "total_repairs": 0,
        "availability": True,
        "photos": data.photos,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.repairers.insert_one(profile)
    
    # Update user role
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"role": "repairer" if user["role"] == "customer" else "both"}}
    )
    
    return await db.repairers.find_one({"repairer_id": repairer_id}, {"_id": 0})

@fastapi_app.get("/api/repairer/profile")
async def get_my_repairer_profile(authorization: Optional[str] = Header(None), request: Request = None):
    user = await get_current_user(authorization, request)
    
    profile = await db.repairers.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return profile

@fastapi_app.get("/api/repairers")
async def get_repairers(latitude: Optional[float] = None, longitude: Optional[float] = None, skill: Optional[str] = None, authorization: Optional[str] = Header(None), request: Request = None):
    await get_current_user(authorization, request)
    
    # Get all repairers with user data
    pipeline = [
        {
            "$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "user_id",
                "as": "user_info"
            }
        },
        {"$unwind": "$user_info"},
        {
            "$project": {
                "_id": 0,
                "repairer_id": 1,
                "user_id": 1,
                "skills": 1,
                "bio": 1,
                "hourly_rate": 1,
                "rating": 1,
                "total_repairs": 1,
                "availability": 1,
                "photos": 1,
                "name": "$user_info.name",
                "picture": "$user_info.picture",
                "location": "$user_info.location",
                "address": "$user_info.address"
            }
        }
    ]
    
    if skill:
        pipeline.insert(0, {"$match": {"skills": skill}})
    
    repairers = await db.repairers.aggregate(pipeline).to_list(100)
    
    # Calculate distances if location provided
    if latitude and longitude:
        for repairer in repairers:
            if repairer.get("location") and repairer["location"].get("coordinates"):
                coords = repairer["location"]["coordinates"]
                # Simple distance calculation (Haversine would be better)
                import math
                lat1, lon1 = math.radians(latitude), math.radians(longitude)
                lat2, lon2 = math.radians(coords[1]), math.radians(coords[0])
                dlat = lat2 - lat1
                dlon = lon2 - lon1
                a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
                c = 2 * math.asin(math.sqrt(a))
                distance = 6371 * c  # Earth radius in km
                repairer["distance_km"] = round(distance, 2)
            else:
                repairer["distance_km"] = 9999
        
        # Sort by distance
        repairers.sort(key=lambda x: x["distance_km"])
    
    return repairers

@fastapi_app.get("/api/repairer/{repairer_id}")
async def get_repairer(repairer_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    await get_current_user(authorization, request)
    
    pipeline = [
        {"$match": {"repairer_id": repairer_id}},
        {
            "$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "user_id",
                "as": "user_info"
            }
        },
        {"$unwind": "$user_info"},
        {
            "$project": {
                "_id": 0,
                "repairer_id": 1,
                "user_id": 1,
                "skills": 1,
                "bio": 1,
                "hourly_rate": 1,
                "rating": 1,
                "total_repairs": 1,
                "availability": 1,
                "photos": 1,
                "name": "$user_info.name",
                "picture": "$user_info.picture",
                "address": "$user_info.address"
            }
        }
    ]
    
    result = await db.repairers.aggregate(pipeline).to_list(1)
    if not result:
        raise HTTPException(status_code=404, detail="Repairer not found")
    
    return result[0]

# Repair Request endpoints
@fastapi_app.post("/api/repair-requests")
async def create_repair_request(data: CreateRepairRequest, authorization: Optional[str] = Header(None), request: Request = None):
    user = await get_current_user(authorization, request)
    
    request_id = f"request_{uuid.uuid4().hex[:12]}"
    
    repair_request = {
        "request_id": request_id,
        "customer_id": user["user_id"],
        "title": data.title,
        "description": data.description,
        "category": data.category,
        "images": data.images,
        "location": data.location,
        "address": data.address,
        "status": "open",
        "assigned_repairer_id": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.repair_requests.insert_one(repair_request)
    
    return await db.repair_requests.find_one({"request_id": request_id}, {"_id": 0})

@fastapi_app.get("/api/repair-requests")
async def get_repair_requests(status: Optional[str] = None, authorization: Optional[str] = Header(None), request: Request = None):
    user = await get_current_user(authorization, request)
    
    query = {}
    if user["role"] == "customer":
        query["customer_id"] = user["user_id"]
    elif user["role"] == "repairer":
        # Show open requests or assigned to this repairer
        repairer = await db.repairers.find_one({"user_id": user["user_id"]}, {"_id": 0})
        if repairer:
            query = {"$or": [
                {"status": "open"},
                {"assigned_repairer_id": repairer["repairer_id"]}
            ]}
    
    if status:
        query["status"] = status
    
    requests = await db.repair_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    return requests

@fastapi_app.get("/api/repair-requests/{request_id}")
async def get_repair_request(request_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    await get_current_user(authorization, request)
    
    repair_request = await db.repair_requests.find_one({"request_id": request_id}, {"_id": 0})
    if not repair_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    return repair_request

# Impact Stats
@fastapi_app.get("/api/impact-stats")
async def get_impact_stats():
    stats = await db.impact_stats.find_one({}, {"_id": 0})
    
    if not stats:
        # Create initial stats
        stats = {
            "total_repairs": 0,
            "total_waste_kg": 0.0,
            "total_money_saved": 0.0,
            "total_co2_saved": 0.0,
            "updated_at": datetime.now(timezone.utc)
        }
        await db.impact_stats.insert_one(stats)
    
    # Calculate from completed repairs
    completed = await db.repair_requests.count_documents({"status": "completed"})
    
    # Average impact per repair
    avg_waste = 15  # kg
    avg_money = 250  # R$
    avg_co2 = 30  # kg
    
    return {
        "total_repairs": completed,
        "total_waste_kg": completed * avg_waste,
        "total_money_saved": completed * avg_money,
        "total_co2_saved": completed * avg_co2
    }

# Chat endpoints
@fastapi_app.post("/api/messages/send")
async def send_message(data: SendMessageRequest, authorization: Optional[str] = Header(None), request: Request = None):
    user = await get_current_user(authorization, request)
    
    # Find or create conversation
    participants = sorted([user["user_id"], data.receiver_id])
    conversation = await db.conversations.find_one(
        {"participants": participants},
        {"_id": 0}
    )
    
    if not conversation:
        conversation_id = f"conv_{uuid.uuid4().hex[:12]}"
        conversation = {
            "conversation_id": conversation_id,
            "participants": participants,
            "repair_request_id": data.repair_request_id,
            "last_message": data.content,
            "last_message_time": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc)
        }
        await db.conversations.insert_one(conversation)
    else:
        conversation_id = conversation["conversation_id"]
        await db.conversations.update_one(
            {"conversation_id": conversation_id},
            {"$set": {
                "last_message": data.content,
                "last_message_time": datetime.now(timezone.utc)
            }}
        )
    
    # Create message
    message_id = f"msg_{uuid.uuid4().hex[:12]}"
    message = {
        "message_id": message_id,
        "conversation_id": conversation_id,
        "sender_id": user["user_id"],
        "content": data.content,
        "timestamp": datetime.now(timezone.utc),
        "read": False
    }
    
    await db.messages.insert_one(message)
    
    # Broadcast via Socket.io
    broadcast_message = message.copy()
    broadcast_message["timestamp"] = broadcast_message["timestamp"].isoformat()
    await sio.emit('new_message', broadcast_message, room=conversation_id)
    
    return await db.messages.find_one({"message_id": message_id}, {"_id": 0})

@fastapi_app.get("/api/conversations")
async def get_conversations(authorization: Optional[str] = Header(None), request: Request = None):
    user = await get_current_user(authorization, request)
    
    conversations = await db.conversations.find(
        {"participants": user["user_id"]},
        {"_id": 0}
    ).sort("last_message_time", -1).to_list(100)
    
    # Enrich with user info
    for conv in conversations:
        other_user_id = [p for p in conv["participants"] if p != user["user_id"]][0]
        other_user = await db.users.find_one({"user_id": other_user_id}, {"_id": 0, "name": 1, "picture": 1})
        if other_user:
            conv["other_user"] = other_user
    
    return conversations

@fastapi_app.get("/api/messages/{conversation_id}")
async def get_messages(conversation_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    user = await get_current_user(authorization, request)
    
    # Verify user is participant
    conversation = await db.conversations.find_one({"conversation_id": conversation_id}, {"_id": 0})
    if not conversation or user["user_id"] not in conversation["participants"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    messages = await db.messages.find(
        {"conversation_id": conversation_id},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(500)
    
    return messages

# Socket.IO events
@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

@sio.event
async def join_room(sid, data):
    room_id = data.get("conversation_id")
    if not room_id:
        logger.warning(f"join_room called without conversation_id for {sid}")
        return
    await sio.enter_room(sid, room_id)
    logger.info(f"Client {sid} joined room {room_id}")

# Lifecycle
@fastapi_app.on_event("startup")
async def startup():
    logger.info("ConsertaAí backend starting...")
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.repairers.create_index("user_id", unique=True)
    await db.repair_requests.create_index("customer_id")
    await db.conversations.create_index("participants")
    await db.messages.create_index("conversation_id")

# Mount static files for HTML website
if os.path.exists("/app/css"):
    fastapi_app.mount("/css", StaticFiles(directory="/app/css"), name="css")
if os.path.exists("/app/js"):
    fastapi_app.mount("/js", StaticFiles(directory="/app/js"), name="js")
if os.path.exists("/app/assets"):
    fastapi_app.mount("/assets", StaticFiles(directory="/app/assets"), name="assets")

# Serve index.html at root
from fastapi.responses import FileResponse

@fastapi_app.get("/")
async def serve_index():
    return FileResponse("/app/index.html")

@fastapi_app.get("/auth-callback.html")
async def serve_auth_callback():
    return FileResponse("/app/auth-callback.html")

# Wrap FastAPI with Socket.IO
socket_app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path='/api/socket.io')
app = socket_app