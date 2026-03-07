import os
from dotenv import load_dotenv

load_dotenv()

# Banco de dados
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./financas.db")
# Railway fornece postgres:// (legado), SQLAlchemy 2.x exige postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# JWT
SECRET_KEY = os.getenv("SECRET_KEY", "chave-secreta-mude-isso-em-producao")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 dias

# Telegram
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
ALLOWED_TELEGRAM_IDS = [
    int(x.strip())
    for x in os.getenv("ALLOWED_TELEGRAM_IDS", "").split(",")
    if x.strip()
]
