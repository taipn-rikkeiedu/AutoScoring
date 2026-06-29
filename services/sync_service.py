import os
import json
import streamlit as st
from config.settings import Settings

def get_sync_paths() -> dict:
    """Read paths from .sync_settings.json or return defaults."""
    default_paths = {
        "root": Settings.LOCAL_DATA_ROOT,
        "config": Settings.LOCAL_CONFIG_PATH,
        "templates": Settings.LOCAL_TEMPLATES_PATH
    }
    
    # Check if we have customized sync paths saved
    if os.path.exists(Settings.LOCAL_SYNC_SETTINGS_PATH):
        try:
            with open(Settings.LOCAL_SYNC_SETTINGS_PATH, "r", encoding="utf-8") as f:
                saved = json.load(f)
                if isinstance(saved, dict):
                    # Ensure we merge with defaults if keys are missing
                    return {
                        "root": saved.get("root", default_paths["root"]),
                        "config": saved.get("config", default_paths["config"]),
                        "templates": saved.get("templates", default_paths["templates"])
                    }
        except Exception:
            pass
            
    return default_paths

def save_sync_paths(root_path: str, config_path: str, templates_path: str) -> bool:
    """Save custom sync paths to .sync_settings.json."""
    try:
        # Create directories if they do not exist
        os.makedirs(os.path.dirname(Settings.LOCAL_SYNC_SETTINGS_PATH), exist_ok=True)
        
        paths = {
            "root": root_path.strip(),
            "config": config_path.strip(),
            "templates": templates_path.strip()
        }
        with open(Settings.LOCAL_SYNC_SETTINGS_PATH, "w", encoding="utf-8") as f:
            json.dump(paths, f, ensure_ascii=False, indent=2)
        return True
    except Exception:
        return False

def is_local_environment() -> bool:
    """Check if the current host environment can access local Windows directories."""
    if os.name != "nt":
        return False
    try:
        paths = get_sync_paths()
        root = paths["root"]
        if not os.path.exists(root):
            os.makedirs(root, exist_ok=True)
        return True
    except Exception:
        return False

def sync_config_to_disk(config_dict: dict) -> bool:
    """Write current config dict to config.json on disk."""
    if not is_local_environment():
        return False
    try:
        paths = get_sync_paths()
        config_file = paths["config"]
        os.makedirs(os.path.dirname(config_file), exist_ok=True)
        with open(config_file, "w", encoding="utf-8") as f:
            json.dump(config_dict, f, ensure_ascii=False, indent=2)
        return True
    except Exception:
        return False

def sync_templates_to_disk(templates_dict: dict) -> bool:
    """Write current templates dict to templates.json on disk."""
    if not is_local_environment():
        return False
    try:
        paths = get_sync_paths()
        templates_file = paths["templates"]
        os.makedirs(os.path.dirname(templates_file), exist_ok=True)
        with open(templates_file, "w", encoding="utf-8") as f:
            json.dump(templates_dict, f, ensure_ascii=False, indent=2)
        return True
    except Exception:
        return False

def auto_sync_on_startup():
    """Run once on startup to read config and templates from local disk."""
    if st.session_state.get("sync_completed"):
        return

    # Default sync_completed flag to True even on Cloud so we don't keep trying
    st.session_state.sync_completed = True

    if not is_local_environment():
        st.session_state.sync_local_active = False
        return

    st.session_state.sync_local_active = True
    paths = get_sync_paths()
    config_file = paths["config"]
    templates_file = paths["templates"]

    sync_details = []

    # 1. Sync Config
    if os.path.exists(config_file):
        try:
            with open(config_file, "r", encoding="utf-8") as f:
                config_data = json.load(f)
                if isinstance(config_data, dict) and "provider" in config_data:
                    # Sync state
                    st.session_state.ai_config = config_data
                    # Sync input widgets keys to avoid sync conflicts on load
                    st.session_state.settings_provider_select = config_data.get("provider", "gemini")
                    
                    old_api_key = config_data.get("api_key", "")
                    old_model_name = config_data.get("model_name", Settings.DEFAULT_MODEL)
                    old_api_base_url = config_data.get("api_base_url", "")
                    prov = config_data.get("provider", "gemini")
                    
                    st.session_state.settings_gemini_api_key = config_data.get(
                        "gemini_api_key", old_api_key if prov == "gemini" else ""
                    )
                    st.session_state.settings_gemini_model_select = config_data.get(
                        "gemini_model_name", old_model_name if prov == "gemini" else Settings.DEFAULT_MODEL
                    )
                    st.session_state.settings_deepseek_api_key = config_data.get(
                        "deepseek_api_key", old_api_key if prov == "deepseek" else ""
                    )
                    st.session_state.settings_openrouter_api_key = config_data.get(
                        "openrouter_api_key", old_api_key if prov == "openrouter" else ""
                    )
                    st.session_state.settings_openrouter_model_select = config_data.get(
                        "openrouter_model_name", old_model_name if prov == "openrouter" else getattr(Settings, "OPENROUTER_MODEL_NAME", "qwen/qwen3-coder:free")
                    )
                    st.session_state.settings_custom_api_key = config_data.get(
                        "custom_api_key", old_api_key if prov == "custom" else ""
                    )
                    st.session_state.settings_custom_api_base_url = config_data.get(
                        "custom_api_base_url", old_api_base_url if prov == "custom" else ""
                    )
                    st.session_state.settings_custom_model_name = config_data.get(
                        "custom_model_name", old_model_name if prov == "custom" else Settings.DEFAULT_MODEL
                    )
                    st.session_state.settings_local_model_name = config_data.get("local_model_name", Settings.LOCAL_MODEL_NAME)
                    st.session_state.settings_ollama_base_url = config_data.get("ollama_base_url", Settings.OLLAMA_BASE_URL)
                    st.session_state.settings_github_token = config_data.get("github_token", "")
                    sync_details.append("Cấu hình AI")
        except Exception as e:
            st.warning(f"Không thể đọc config.json từ local: {str(e)}")
    else:
        # Create default config.json
        from services.storage_service import get_ai_config
        default_config = get_ai_config()
        sync_config_to_disk(default_config)
        sync_details.append("Cấu hình AI (tạo mới)")

    # 2. Sync Templates
    if os.path.exists(templates_file):
        try:
            with open(templates_file, "r", encoding="utf-8") as f:
                templates_data = json.load(f)
                if isinstance(templates_data, dict):
                    st.session_state.cloud_templates = templates_data
                    sync_details.append("Thư viện mẫu bài tập")
        except Exception as e:
            st.warning(f"Không thể đọc templates.json từ local: {str(e)}")
    else:
        # Create default templates.json
        from services.storage_service import load_templates
        default_templates = load_templates()
        sync_templates_to_disk(default_templates)
        sync_details.append("Mẫu bài tập (tạo mới)")

    if sync_details:
        st.session_state.sync_status_msg = f"Đã đồng bộ thành công: {', '.join(sync_details)} từ máy tính."
