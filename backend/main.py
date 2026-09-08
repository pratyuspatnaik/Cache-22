from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import razorpay
import os
import hmac
import hashlib
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")

if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
    print("Warning: Razorpay API keys are not set in environment variables.")

client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)) if RAZORPAY_KEY_ID else None

class OrderRequest(BaseModel):
    amount: int

class VerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

@app.post("/api/create-order")
async def create_order(order: OrderRequest):
    if not client:
         raise HTTPException(status_code=500, detail="Razorpay keys not configured")
    try:
        data = {
            "amount": order.amount * 100,  # Amount in paise
            "currency": "INR",
            "receipt": "receipt_order_1"
        }
        payment = client.order.create(data=data)
        return payment
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/verify-payment")
async def verify_payment(req: VerifyRequest):
    if not client:
         raise HTTPException(status_code=500, detail="Razorpay keys not configured")
    try:
        # Create signature
        msg = f"{req.razorpay_order_id}|{req.razorpay_payment_id}"
        secret = bytes(RAZORPAY_KEY_SECRET, 'utf-8')
        message = bytes(msg, 'utf-8')
        
        expected_signature = hmac.new(secret, message, hashlib.sha256).hexdigest()
        
        if expected_signature == req.razorpay_signature:
            return {"message": "Payment verified successfully", "payment_id": req.razorpay_payment_id}
        else:
            raise HTTPException(status_code=400, detail="Invalid signature sent!")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

