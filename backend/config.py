import os
from dotenv import load_dotenv

load_dotenv()


def _split_env_list(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]

# Banco de dados
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./financas.db")
# Railway fornece postgres:// (legado), SQLAlchemy 2.x exige postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# JWT
SECRET_KEY = os.getenv("SECRET_KEY", "chave-secreta-mude-isso-em-producao")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 dias

# CORS
CORS_ORIGINS = _split_env_list(os.getenv("CORS_ORIGINS", ""))
FRONTEND_URL = os.getenv("FRONTEND_URL", "").strip()
RAILWAY_PUBLIC_DOMAIN = os.getenv("RAILWAY_PUBLIC_DOMAIN", "").strip()
BACKEND_PUBLIC_URL = os.getenv("BACKEND_PUBLIC_URL", "").strip()

if not BACKEND_PUBLIC_URL and RAILWAY_PUBLIC_DOMAIN:
    BACKEND_PUBLIC_URL = f"https://{RAILWAY_PUBLIC_DOMAIN}"

if FRONTEND_URL and FRONTEND_URL not in CORS_ORIGINS:
    CORS_ORIGINS.append(FRONTEND_URL)

for default_origin in [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://fintech-production-0e97.up.railway.app",
]:
    if default_origin not in CORS_ORIGINS:
        CORS_ORIGINS.append(default_origin)

# Telegram
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_WEBHOOK_SECRET = os.getenv("TELEGRAM_WEBHOOK_SECRET", "").strip()
ALLOWED_TELEGRAM_IDS = [
    int(x.strip())
    for x in os.getenv("ALLOWED_TELEGRAM_IDS", "").split(",")
    if x.strip()
]
