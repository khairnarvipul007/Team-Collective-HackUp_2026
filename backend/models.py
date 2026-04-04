from sqlalchemy import Column, Integer, String, Float, Boolean, JSON, DateTime
from database import Base
from datetime import datetime

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, index=True)
    merchant = Column(String)
    account = Column(String)
    amount = Column(Float)
    city = Column(String)
    hour = Column(Integer)
    risk = Column(Integer)
    flagged = Column(Boolean)
    latency = Column(Float)
    type = Column(String)
    xai = Column(JSON)  # Stores the SHAP explanation arrays
    timestamp = Column(DateTime, default=datetime.utcnow) # Helps fetch the latest data