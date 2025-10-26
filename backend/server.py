from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from twilio.rest import Client


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Twilio SMS Client
twilio_client = Client(
    os.environ.get('TWILIO_ACCOUNT_SID'),
    os.environ.get('TWILIO_AUTH_TOKEN')
)
TWILIO_PHONE = os.environ.get('TWILIO_PHONE_NUMBER')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# SMS Helper Function
def send_sms(to_phone: str, message: str):
    """Send SMS via Twilio"""
    try:
        # Format phone number to include +90 if needed
        if not to_phone.startswith('+'):
            clean_phone = to_phone.replace(/\D/g, '')
            if not clean_phone.startswith('90'):
                to_phone = '+90' + clean_phone
            else:
                to_phone = '+' + clean_phone
        
        message = twilio_client.messages.create(
            body=message,
            from_=TWILIO_PHONE,
            to=to_phone
        )
        logging.info(f"SMS sent to {to_phone}: {message.sid}")
        return True
    except Exception as e:
        logging.error(f"Failed to send SMS to {to_phone}: {str(e)}")
        return False


# Define Models
class Service(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ServiceCreate(BaseModel):
    name: str
    price: float

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None

class Appointment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_name: str
    phone: str
    address: str
    service_id: str
    service_name: str
    service_price: float
    appointment_date: str  # YYYY-MM-DD
    appointment_time: str  # HH:MM
    notes: str = ""
    status: str = "Bekliyor"  # Bekliyor, Tamamlandı, İptal
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[str] = None

class AppointmentCreate(BaseModel):
    customer_name: str
    phone: str
    address: str
    service_id: str
    appointment_date: str
    appointment_time: str
    notes: str = ""

class AppointmentUpdate(BaseModel):
    customer_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    service_id: Optional[str] = None
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    appointment_id: str
    customer_name: str
    service_name: str
    amount: float
    date: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransactionUpdate(BaseModel):
    amount: float

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "app_settings"
    work_start_hour: int = 7
    work_end_hour: int = 3  # next day
    appointment_interval: int = 30  # minutes


# Services Routes
@api_router.post("/services", response_model=Service)
async def create_service(service: ServiceCreate):
    service_obj = Service(**service.model_dump())
    doc = service_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.services.insert_one(doc)
    return service_obj

@api_router.get("/services", response_model=List[Service])
async def get_services():
    services = await db.services.find({}, {"_id": 0}).to_list(1000)
    for service in services:
        if isinstance(service['created_at'], str):
            service['created_at'] = datetime.fromisoformat(service['created_at'])
    return services

@api_router.get("/services/{service_id}", response_model=Service)
async def get_service(service_id: str):
    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Hizmet bulunamadı")
    if isinstance(service['created_at'], str):
        service['created_at'] = datetime.fromisoformat(service['created_at'])
    return service

@api_router.put("/services/{service_id}", response_model=Service)
async def update_service(service_id: str, service_update: ServiceUpdate):
    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Hizmet bulunamadı")
    
    update_data = {k: v for k, v in service_update.model_dump().items() if v is not None}
    if update_data:
        await db.services.update_one({"id": service_id}, {"$set": update_data})
    
    updated_service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if isinstance(updated_service['created_at'], str):
        updated_service['created_at'] = datetime.fromisoformat(updated_service['created_at'])
    return updated_service

@api_router.delete("/services/{service_id}")
async def delete_service(service_id: str):
    result = await db.services.delete_one({"id": service_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hizmet bulunamadı")
    return {"message": "Hizmet silindi"}


# Appointments Routes
@api_router.post("/appointments", response_model=Appointment)
async def create_appointment(appointment: AppointmentCreate):
    # Get service details
    service = await db.services.find_one({"id": appointment.service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Hizmet bulunamadı")
    
    # Check if appointment already exists at the same date and time
    existing = await db.appointments.find_one({
        "appointment_date": appointment.appointment_date,
        "appointment_time": appointment.appointment_time,
        "status": {"$ne": "İptal"}  # Don't count cancelled appointments
    })
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"{appointment.appointment_date} tarihinde {appointment.appointment_time} saatinde zaten bir randevu var. Lütfen başka bir saat seçin."
        )
    
    appointment_data = appointment.model_dump()
    appointment_data['service_name'] = service['name']
    appointment_data['service_price'] = service['price']
    appointment_data['status'] = 'Bekliyor'
    
    appointment_obj = Appointment(**appointment_data)
    doc = appointment_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.appointments.insert_one(doc)
    return appointment_obj

@api_router.get("/appointments", response_model=List[Appointment])
async def get_appointments(
    date: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None
):
    query = {}
    if date:
        query['appointment_date'] = date
    if status:
        query['status'] = status
    if search:
        query['$or'] = [
            {'customer_name': {'$regex': search, '$options': 'i'}},
            {'phone': {'$regex': search, '$options': 'i'}}
        ]
    
    appointments = await db.appointments.find(query, {"_id": 0}).sort("appointment_date", -1).to_list(1000)
    for appointment in appointments:
        if isinstance(appointment['created_at'], str):
            appointment['created_at'] = datetime.fromisoformat(appointment['created_at'])
    return appointments

@api_router.get("/appointments/{appointment_id}", response_model=Appointment)
async def get_appointment(appointment_id: str):
    appointment = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Randevu bulunamadı")
    if isinstance(appointment['created_at'], str):
        appointment['created_at'] = datetime.fromisoformat(appointment['created_at'])
    return appointment

@api_router.put("/appointments/{appointment_id}", response_model=Appointment)
async def update_appointment(appointment_id: str, appointment_update: AppointmentUpdate):
    appointment = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Randevu bulunamadı")
    
    update_data = {k: v for k, v in appointment_update.model_dump().items() if v is not None}
    
    # Check if date/time changed and if there's a conflict
    if 'appointment_date' in update_data or 'appointment_time' in update_data:
        check_date = update_data.get('appointment_date', appointment['appointment_date'])
        check_time = update_data.get('appointment_time', appointment['appointment_time'])
        
        # Check if another appointment exists at this time (excluding current appointment and cancelled ones)
        existing = await db.appointments.find_one({
            "id": {"$ne": appointment_id},
            "appointment_date": check_date,
            "appointment_time": check_time,
            "status": {"$ne": "İptal"}
        })
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"{check_date} tarihinde {check_time} saatinde zaten bir randevu var. Lütfen başka bir saat seçin."
            )
    
    # If service_id changed, update service details
    if 'service_id' in update_data:
        service = await db.services.find_one({"id": update_data['service_id']}, {"_id": 0})
        if service:
            update_data['service_name'] = service['name']
            update_data['service_price'] = service['price']
    
    # If status changed to Tamamlandı, add to transactions and set completed_at
    if update_data.get('status') == 'Tamamlandı' and appointment['status'] != 'Tamamlandı':
        update_data['completed_at'] = datetime.now(timezone.utc).isoformat()
        
        # Create transaction
        transaction = Transaction(
            appointment_id=appointment_id,
            customer_name=appointment['customer_name'],
            service_name=appointment['service_name'],
            amount=appointment['service_price'],
            date=appointment['appointment_date']
        )
        trans_doc = transaction.model_dump()
        trans_doc['created_at'] = trans_doc['created_at'].isoformat()
        await db.transactions.insert_one(trans_doc)
    
    if update_data:
        await db.appointments.update_one({"id": appointment_id}, {"$set": update_data})
    
    updated_appointment = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if isinstance(updated_appointment['created_at'], str):
        updated_appointment['created_at'] = datetime.fromisoformat(updated_appointment['created_at'])
    return updated_appointment

@api_router.delete("/appointments/{appointment_id}")
async def delete_appointment(appointment_id: str):
    result = await db.appointments.delete_one({"id": appointment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Randevu bulunamadı")
    return {"message": "Randevu silindi"}


# Transactions Routes
@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    query = {}
    if start_date and end_date:
        query['date'] = {'$gte': start_date, '$lte': end_date}
    elif start_date:
        query['date'] = {'$gte': start_date}
    elif end_date:
        query['date'] = {'$lte': end_date}
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    for transaction in transactions:
        if isinstance(transaction['created_at'], str):
            transaction['created_at'] = datetime.fromisoformat(transaction['created_at'])
    return transactions

@api_router.put("/transactions/{transaction_id}", response_model=Transaction)
async def update_transaction(transaction_id: str, transaction_update: TransactionUpdate):
    transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="İşlem bulunamadı")
    
    await db.transactions.update_one(
        {"id": transaction_id},
        {"$set": {"amount": transaction_update.amount}}
    )
    
    updated_transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if isinstance(updated_transaction['created_at'], str):
        updated_transaction['created_at'] = datetime.fromisoformat(updated_transaction['created_at'])
    return updated_transaction

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str):
    result = await db.transactions.delete_one({"id": transaction_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="İşlem bulunamadı")
    return {"message": "İşlem silindi"}


# Dashboard Stats
@api_router.get("/stats/dashboard")
async def get_dashboard_stats():
    from datetime import date, timedelta
    from zoneinfo import ZoneInfo
    
    # Use Turkey timezone
    turkey_tz = ZoneInfo("Europe/Istanbul")
    today = datetime.now(turkey_tz).date().isoformat()
    
    # Today's appointments
    today_appointments = await db.appointments.count_documents({
        "appointment_date": today
    })
    
    # Today's completed
    today_completed = await db.appointments.count_documents({
        "appointment_date": today,
        "status": "Tamamlandı"
    })
    
    # Today's income
    today_transactions = await db.transactions.find({"date": today}, {"_id": 0}).to_list(1000)
    today_income = sum(t['amount'] for t in today_transactions)
    
    # Week income (last 7 days)
    week_start = (datetime.now(turkey_tz).date() - timedelta(days=7)).isoformat()
    week_transactions = await db.transactions.find(
        {"date": {"$gte": week_start}},
        {"_id": 0}
    ).to_list(1000)
    week_income = sum(t['amount'] for t in week_transactions)
    
    # Month income
    month_start = datetime.now(turkey_tz).date().replace(day=1).isoformat()
    month_transactions = await db.transactions.find(
        {"date": {"$gte": month_start}},
        {"_id": 0}
    ).to_list(1000)
    month_income = sum(t['amount'] for t in month_transactions)
    
    return {
        "today_appointments": today_appointments,
        "today_completed": today_completed,
        "today_income": today_income,
        "week_income": week_income,
        "month_income": month_income
    }


# Settings Routes
@api_router.get("/settings", response_model=Settings)
async def get_settings():
    settings = await db.settings.find_one({"id": "app_settings"}, {"_id": 0})
    if not settings:
        # Create default settings
        default_settings = Settings()
        await db.settings.insert_one(default_settings.model_dump())
        return default_settings
    return Settings(**settings)

@api_router.put("/settings", response_model=Settings)
async def update_settings(settings: Settings):
    await db.settings.update_one(
        {"id": "app_settings"},
        {"$set": settings.model_dump()},
        upsert=True
    )
    return settings


# Customer History
@api_router.get("/customers/{phone}/history")
async def get_customer_history(phone: str):
    appointments = await db.appointments.find(
        {"phone": phone},
        {"_id": 0}
    ).sort("appointment_date", -1).to_list(1000)
    
    for appointment in appointments:
        if isinstance(appointment['created_at'], str):
            appointment['created_at'] = datetime.fromisoformat(appointment['created_at'])
    
    total_completed = len([a for a in appointments if a['status'] == 'Tamamlandı'])
    
    return {
        "phone": phone,
        "total_appointments": len(appointments),
        "completed_appointments": total_completed,
        "appointments": appointments
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()