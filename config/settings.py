import os
import json
import streamlit as st

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass


def _get_secret(key: str, default: str = "") -> str:
    """Read a config value from Streamlit Cloud secrets first, then .env fallback.

    - Streamlit Cloud: reads from st.secrets (set via dashboard)
    - Local: reads from os.getenv (set via .env file)
    """
    try:
        value = st.secrets[key]
        if isinstance(value, str):
            return value
        return str(value)
    except BaseException:
        return os.getenv(key, default)


def _get_bool_env(name: str, default: bool = False) -> bool:
    value = _get_secret(name, "").strip().lower()
    if value in {"1", "true", "yes", "on"}:
        return True
    if value in {"0", "false", "no", "off"}:
        return False
    return default


class Settings:
    APP_VERSION = "2.5.1"
    LOCAL_DATA_ROOT = "C:/AutoScoring"
    LOCAL_CONFIG_PATH = "C:/AutoScoring/config/config.json"
    LOCAL_TEMPLATES_PATH = "C:/AutoScoring/data/templates.json"
    LOCAL_SYNC_SETTINGS_PATH = "C:/AutoScoring/.sync_settings.json"
    GEMINI_API_KEY = _get_secret("GEMINI_API_KEY", "")
    GITHUB_TOKEN = _get_secret("GITHUB_TOKEN", "")
    DEFAULT_MODEL = _get_secret("DEFAULT_MODEL", "gemini-1.5-pro")
    AI_PROVIDER = _get_secret("AI_PROVIDER", "gemini").strip().lower()
    USE_LOCAL_MODEL = _get_bool_env("USE_LOCAL_MODEL", False)
    LOCAL_MODEL_NAME = _get_secret("LOCAL_MODEL_NAME", "deepseek-r1:7b")
    OLLAMA_BASE_URL = _get_secret("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
    CUSTOM_API_KEY = _get_secret("CUSTOM_API_KEY", "")
    CUSTOM_API_BASE_URL = _get_secret("CUSTOM_API_BASE_URL", "").rstrip("/")
    CUSTOM_MODEL_NAME = _get_secret("CUSTOM_MODEL_NAME", "")
    ALLOWED_EXTENSIONS = (
        ".py",
        ".java",
        ".js",
        ".ts",
        ".cpp",
        ".c",
        ".cs",
        ".html",
        ".css",
        ".go",
        ".kt",
        ".php",
        ".gradle",
        ".xml",
        ".properties",
        ".yml",
        ".yaml",
        ".json",
        ".md",
        ".docx",
    )
    EXCLUDED_DIRS = (
        "node_modules/",
        ".venv",
        "env/",
        ".git/",
        "build/",
        "dist/",
        "target/",
        "__pycache__/",
        ".idea/",
        ".vscode/",
    )
    try:
        GRADING_MAX_SCORE = int(_get_secret("GRADING_MAX_SCORE", "100"))
    except (ValueError, TypeError):
        GRADING_MAX_SCORE = 100
    try:
        GRADING_MAX_WORDS = int(_get_secret("GRADING_MAX_WORDS", "100"))
    except (ValueError, TypeError):
        GRADING_MAX_WORDS = 100
    GRADING_LANGUAGE = _get_secret("GRADING_LANGUAGE", "Tiếng Việt")
    try:
        MAX_PROJECT_FILES = int(_get_secret("MAX_PROJECT_FILES", "100"))
    except (ValueError, TypeError):
        MAX_PROJECT_FILES = 100
    try:
        MAX_PROJECT_CHARS = int(_get_secret("MAX_PROJECT_CHARS", "500000"))
    except (ValueError, TypeError):
        MAX_PROJECT_CHARS = 500000
    GRADING_CACHE_ENABLED = _get_bool_env("GRADING_CACHE_ENABLED", True)
    try:
        GRADING_CACHE_TTL_MINUTES = int(_get_secret("GRADING_CACHE_TTL_MINUTES", "120"))
    except (ValueError, TypeError):
        GRADING_CACHE_TTL_MINUTES = 120
    EXCLUDED_FILES = (
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "composer.lock",
        "pom.xml.tag",
        ".gitignore",
        "LICENSE",
        "gradlew.bat",
        "gradlew",
        "mvnw.cmd",
        "mvnw",
    )
    GEMINI_MODELS = [
        "gemini-3.5-flash",
        "gemini-3.5-pro",
        "gemini-3.0-flash",
        "gemini-3.0-pro",
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite-preview-02-05",
        "gemini-2.0-pro-exp-02-05",
        "gemini-1.5-pro",
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-1.5-pro-latest",
        "gemini-1.5-flash-latest",
    ]
    DEFAULT_CRITERIA = "1. Đáp ứng yêu cầu nghiệp vụ của đề bài. (40 điểm)\n2. Logic xử lý chính xác và xử lý ngoại lệ tốt. (30 điểm)\n3. Cấu trúc mã nguồn sạch sẽ, dễ đọc, chuẩn hóa. (30 điểm)"
    DEFAULT_TEMPLATES = {}

    @classmethod
    def validate(cls, provider=None, api_key=None, api_base_url=None):
        provider_name = (provider or cls.AI_PROVIDER or "gemini").strip().lower()
        if provider_name == "local":
            return
        if provider_name == "custom":
            resolved_url = api_base_url or cls.CUSTOM_API_BASE_URL
            if not resolved_url:
                raise ValueError(
                    "CRITICAL CONFIG ERROR: Thiếu CUSTOM_API_BASE_URL trong .env hoặc giao diện"
                )
            return
        resolved_key = api_key or cls.GEMINI_API_KEY
        if not resolved_key:
            raise ValueError("CRITICAL CONFIG ERROR: Thiếu GEMINI_API_KEY trong .env hoặc giao diện")
