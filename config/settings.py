import os
from dotenv import load_dotenv

load_dotenv()


def _get_bool_env(name: str, default: bool = False) -> bool:
    value = os.getenv(name, "").strip().lower()
    if value in {"1", "true", "yes", "on"}:
        return True
    if value in {"0", "false", "no", "off", ""}:
        return False
    return default


class Settings:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
    DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "gemini-1.5-pro")
    AI_PROVIDER = os.getenv("AI_PROVIDER", "gemini").strip().lower()
    USE_LOCAL_MODEL = _get_bool_env("USE_LOCAL_MODEL", False)
    LOCAL_MODEL_NAME = os.getenv("LOCAL_MODEL_NAME", "deepseek-r1:7b")
    OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
    CUSTOM_API_KEY = os.getenv("CUSTOM_API_KEY", "")
    CUSTOM_API_BASE_URL = os.getenv("CUSTOM_API_BASE_URL", "").rstrip("/")
    CUSTOM_MODEL_NAME = os.getenv("CUSTOM_MODEL_NAME", "")
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
    GRADING_MAX_SCORE = int(os.getenv("GRADING_MAX_SCORE", "100"))
    GRADING_MAX_WORDS = int(os.getenv("GRADING_MAX_WORDS", "100"))
    GRADING_LANGUAGE = os.getenv("GRADING_LANGUAGE", "Tiếng Việt")

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
