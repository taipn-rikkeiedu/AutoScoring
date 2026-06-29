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
    
    provider = Settings.AI_PROVIDER or "gemini"
    default_api_key = ""
    default_api_base_url = ""
    default_model = Settings.DEFAULT_MODEL
    
    if provider == "gemini":
        default_api_key = Settings.GEMINI_API_KEY
        default_model = Settings.DEFAULT_MODEL
    elif provider == "deepseek":
        default_api_key = Settings.DEEPSEEK_API_KEY
        default_api_base_url = Settings.DEEPSEEK_API_BASE_URL
        default_model = Settings.DEEPSEEK_MODEL_NAME
    elif provider == "custom":
        default_api_key = Settings.CUSTOM_API_KEY
        default_api_base_url = Settings.CUSTOM_API_BASE_URL
        default_model = Settings.CUSTOM_MODEL_NAME or Settings.DEFAULT_MODEL
        
    return {
        "provider": provider,
        "api_key": default_api_key,
        "api_base_url": default_api_base_url,
        "model_name": default_model,
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
        model = config.get("model_name", "custom")
        return f"Custom API ({model})"
    if provider == "deepseek":
        model = config.get("model_name", Settings.DEEPSEEK_MODEL_NAME)
        return f"DeepSeek API ({model})"
    model = config.get("model_name", Settings.DEFAULT_MODEL)
    return f"Google Gemini ({model})"
