import streamlit as st
from core.settings import Settings

def load_templates():
    from core.exercise_service import ExerciseService
    return ExerciseService.load_templates()

def save_templates(templates):
    from core.exercise_service import ExerciseService
    return ExerciseService.save_templates(templates)

def _sync_settings_class(config_data: dict):
    if not isinstance(config_data, dict):
        return
    from core.settings import Settings
    if "local_data_root" in config_data:
        Settings.LOCAL_DATA_ROOT = config_data["local_data_root"]
        Settings.LOCAL_CONFIG_PATH = f"{Settings.LOCAL_DATA_ROOT}/config/config.json"
        Settings.LOCAL_TEMPLATES_PATH = f"{Settings.LOCAL_DATA_ROOT}/data/templates.json"
        Settings.LOCAL_SYNC_SETTINGS_PATH = f"{Settings.LOCAL_DATA_ROOT}/.sync_settings.json"
    if "grading_max_score" in config_data:
        Settings.GRADING_MAX_SCORE = int(config_data["grading_max_score"])
    if "grading_max_words" in config_data:
        Settings.GRADING_MAX_WORDS = int(config_data["grading_max_words"])
    if "grading_language" in config_data:
        Settings.GRADING_LANGUAGE = config_data["grading_language"]
    if "grading_cache_enabled" in config_data:
        Settings.GRADING_CACHE_ENABLED = bool(config_data["grading_cache_enabled"])
    if "grading_cache_ttl" in config_data:
        Settings.GRADING_CACHE_TTL_MINUTES = int(config_data["grading_cache_ttl"])
    if "max_project_files" in config_data:
        Settings.MAX_PROJECT_FILES = int(config_data["max_project_files"])
    if "max_project_chars" in config_data:
        Settings.MAX_PROJECT_CHARS = int(config_data["max_project_chars"])

def get_ai_config():
    from utils.helpers import is_streamlit_running
    config_data = None
    if is_streamlit_running() and "ai_config" in st.session_state:
        config_data = st.session_state.ai_config
    else:
        # If not running in Streamlit, check if config.json exists on disk
        from core.sync_service import get_sync_paths
        import os
        import json
        paths = get_sync_paths()
        config_file = paths["config"]
        if os.path.exists(config_file):
            try:
                with open(config_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict) and "provider" in data:
                        config_data = data
            except Exception:
                pass
                
    if config_data is None:
        config_data = {
            "provider": Settings.AI_PROVIDER or "gemini",
            "gemini_api_key": Settings.GEMINI_API_KEY,
            "gemini_model_name": Settings.DEFAULT_MODEL,
            "deepseek_api_key": Settings.DEEPSEEK_API_KEY,
            "deepseek_api_base_url": Settings.DEEPSEEK_API_BASE_URL,
            "deepseek_model_name": Settings.DEEPSEEK_MODEL_NAME,
            "openrouter_api_key": getattr(Settings, "OPENROUTER_API_KEY", ""),
            "openrouter_api_base_url": getattr(Settings, "OPENROUTER_API_BASE_URL", "https://openrouter.ai/api/v1"),
            "openrouter_model_name": getattr(Settings, "OPENROUTER_MODEL_NAME", "qwen/qwen3-coder:free"),
            "custom_api_key": Settings.CUSTOM_API_KEY,
            "custom_api_base_url": Settings.CUSTOM_API_BASE_URL,
            "custom_model_name": Settings.CUSTOM_MODEL_NAME or Settings.DEFAULT_MODEL,
            "local_model_name": Settings.LOCAL_MODEL_NAME,
            "ollama_base_url": Settings.OLLAMA_BASE_URL,
            "github_token": Settings.GITHUB_TOKEN,
            "exercise_source": getattr(Settings, "EXERCISE_SOURCE", "local"),
            "exercise_api_url": getattr(Settings, "EXERCISE_API_URL", ""),
            "exercise_api_token": getattr(Settings, "EXERCISE_API_TOKEN", ""),
            "grading_max_words": int(Settings.GRADING_MAX_WORDS),
            "grading_max_score": int(Settings.GRADING_MAX_SCORE),
            "grading_language": Settings.GRADING_LANGUAGE,
            "grading_cache_enabled": bool(Settings.GRADING_CACHE_ENABLED),
            "grading_cache_ttl": int(Settings.GRADING_CACHE_TTL_MINUTES),
            "max_project_files": int(Settings.MAX_PROJECT_FILES),
            "max_project_chars": int(Settings.MAX_PROJECT_CHARS),
            "local_data_root": Settings.LOCAL_DATA_ROOT,
        }

    _sync_settings_class(config_data)
    return config_data

def provider_display_name(config: dict) -> str:
    """Return a human-readable string for the active AI provider."""
    provider = config.get("provider", "gemini")
    if provider == "local":
        model = config.get("local_model_name", Settings.LOCAL_MODEL_NAME)
        return f"Ollama Local ({model})"
    if provider == "custom":
        model = config.get("custom_model_name") or config.get("model_name", "custom")
        return f"Custom API ({model})"
    if provider == "deepseek":
        model = config.get("deepseek_model_name") or config.get("model_name", Settings.DEEPSEEK_MODEL_NAME)
        return f"DeepSeek API ({model})"
    if provider == "openrouter":
        model = config.get("openrouter_model_name") or config.get("model_name", getattr(Settings, "OPENROUTER_MODEL_NAME", "qwen/qwen3-coder:free"))
        return f"OpenRouter ({model})"
    model = config.get("gemini_model_name") or config.get("model_name", Settings.DEFAULT_MODEL)
    return f"Google Gemini ({model})"
