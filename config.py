import os
from dotenv import load_dotenv

# Cargar variables de entorno del archivo .env
load_dotenv()

class Config:
    PORT = int(os.environ.get("PORT", 5000))
    MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/marisqueria")
    JWT_SECRET = os.environ.get("JWT_SECRET", "secret_marisqueria_tio_perro_dev_key")
    # Para producción, permitir cookies seguras si se desea
    SESSION_COOKIE_SECURE = os.environ.get("NODE_ENV") == "production"
