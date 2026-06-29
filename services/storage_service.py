import streamlit as st
from config.settings import Settings

def load_templates():
    if "cloud_templates" not in st.session_state:
        st.session_state.cloud_templates = Settings.DEFAULT_TEMPLATES.copy()
    return st.session_state.cloud_templates

def save_templates(templates):
    st.session_state.cloud_templates = templates
    from services.sync_service import sync_templates_to_disk
    sync_templates_to_disk(templates)
    return True

def get_ai_config():
    if "ai_config" in st.session_state:
        return st.session_state.ai_config
    
    return {
        "provider": Settings.AI_PROVIDER or "gemini",
        "gemini_api_key": Settings.GEMINI_API_KEY,
        "gemini_model_name": Settings.DEFAULT_MODEL,
        "deepseek_api_key": Settings.DEEPSEEK_API_KEY,
        "deepseek_api_base_url": Settings.DEEPSEEK_API_BASE_URL,
        "deepseek_model_name": Settings.DEEPSEEK_MODEL_NAME,
        "custom_api_key": Settings.CUSTOM_API_KEY,
        "custom_api_base_url": Settings.CUSTOM_API_BASE_URL,
        "custom_model_name": Settings.CUSTOM_MODEL_NAME or Settings.DEFAULT_MODEL,
        "local_model_name": Settings.LOCAL_MODEL_NAME,
        "ollama_base_url": Settings.OLLAMA_BASE_URL,
        "github_token": Settings.GITHUB_TOKEN,
    }

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
    model = config.get("gemini_model_name") or config.get("model_name", Settings.DEFAULT_MODEL)
    return f"Google Gemini ({model})"
