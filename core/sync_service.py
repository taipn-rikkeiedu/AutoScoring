import os
import json
from core.settings import Settings

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
