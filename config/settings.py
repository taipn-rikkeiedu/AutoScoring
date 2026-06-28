import os
import json
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
    MAX_PROJECT_FILES = int(os.getenv("MAX_PROJECT_FILES", "100"))
    MAX_PROJECT_CHARS = int(os.getenv("MAX_PROJECT_CHARS", "500000"))
    GEMINI_MODELS = [
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
    DEFAULT_TEMPLATES = {
        "Chương [ IT211 - K24 ] Java Web Service": {
            "Session 19: Spring Security với Access Token và Refresh token": {
                "Bài tập 1 (JWT & Security)": {
                    "assignment": "Viết một ứng dụng Spring Boot tích hợp Spring Security và JWT. Yêu cầu cấu hình đầy đủ SecurityConfig, JwtTokenProvider, JwtAuthenticationFilter, và một tác vụ @Scheduled để tự động dọn dẹp các token đã hết hạn (purging expired refresh tokens) trong cơ sở dữ liệu sau mỗi 6 giờ.",
                    "criteria": "1. Cấu hình Spring Security chính xác, phân quyền các endpoint hợp lý. (40 điểm)\n2. Viết tác vụ dọn dẹp token hết hạn dùng @Scheduled và @EnableScheduling chạy đúng tần suất. (30 điểm)\n3. Tổ chức cấu trúc thư mục chuẩn, sử dụng các annotation Spring Boot hợp lý. (30 điểm)"
                }
            }
        }
    }

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
