import os
from dotenv import load_dotenv

# Directory where this config file lives (project root)
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))

load_dotenv(os.path.join(_BASE_DIR, ".env"))

class Config:
    JWT_SECRET       = os.getenv("JWT_SECRET", "studyforge_dev_secret_CHANGE_ME")
    JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "24"))
    DEBUG            = os.getenv("FLASK_DEBUG", "1") == "1"
    PORT             = int(os.getenv("PORT", "5000"))

    # Resolve DB_PATH to an absolute path anchored to the project directory.
    # This prevents the "database reset" bug when launching from different CWDs.
    _raw_db          = os.getenv("DB_PATH", "studyforge.db")
    DB_PATH          = _raw_db if os.path.isabs(_raw_db) else os.path.join(_BASE_DIR, _raw_db)

config = Config()
