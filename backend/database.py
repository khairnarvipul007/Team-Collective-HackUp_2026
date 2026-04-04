from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 🚨 INSTANT LOCAL DATABASE FOR HACKATHON 🚨
# Yeh line tere backend folder mein ek 'omniguard.db' naam ki file banayegi
SQLALCHEMY_DATABASE_URL = "sqlite:///./omniguard.db"

# SQLite requires check_same_thread=False
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()