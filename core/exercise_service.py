import os
import json
import requests
import streamlit as st
from core.settings import Settings
from core.sync_service import sync_templates_to_disk, is_local_environment, get_sync_paths
from utils.helpers import is_streamlit_running

_GLOBAL_TEMPLATES = None

class ExerciseService:
    @staticmethod
    def get_source() -> str:
        """Get current exercise source, default to 'local'."""
        if is_streamlit_running():
            if "ai_config" in st.session_state:
                return st.session_state.ai_config.get("exercise_source", "local").strip().lower()
        else:
            # When running without Streamlit (e.g. FastAPI), try reading config.json from disk
            paths = get_sync_paths()
            config_file = paths["config"]
            if os.path.exists(config_file):
                try:
                    with open(config_file, "r", encoding="utf-8") as f:
                        config_data = json.load(f)
                        return config_data.get("exercise_source", "local").strip().lower()
                except Exception:
                    pass
        return getattr(Settings, "EXERCISE_SOURCE", "local").strip().lower()

    @staticmethod
    def load_templates() -> dict:
        """Load templates based on current configuration source."""
        global _GLOBAL_TEMPLATES
        
        if is_streamlit_running():
            # Ensure cloud_templates is initialized in session state
            if "cloud_templates" not in st.session_state:
                st.session_state.cloud_templates = Settings.DEFAULT_TEMPLATES.copy()
            return st.session_state.cloud_templates
        else:
            # Non-Streamlit environment (e.g. FastAPI / unit tests)
            if _GLOBAL_TEMPLATES is not None:
                return _GLOBAL_TEMPLATES
                
            paths = get_sync_paths()
            templates_file = paths["templates"]
            if os.path.exists(templates_file):
                try:
                    with open(templates_file, "r", encoding="utf-8") as f:
                        templates_data = json.load(f)
                        if isinstance(templates_data, dict):
                            _GLOBAL_TEMPLATES = templates_data
                            return _GLOBAL_TEMPLATES
                except Exception:
                    pass
            _GLOBAL_TEMPLATES = Settings.DEFAULT_TEMPLATES.copy()
            return _GLOBAL_TEMPLATES

    @staticmethod
    def save_templates(templates: dict) -> bool:
        """Save templates to memory and sync to local disk if applicable."""
        global _GLOBAL_TEMPLATES
        
        if is_streamlit_running():
            st.session_state.cloud_templates = templates
        else:
            _GLOBAL_TEMPLATES = templates
            
        if is_local_environment():
            return sync_templates_to_disk(templates)
        return True

    @staticmethod
    def fetch_from_api(api_url: str, token: str = None) -> dict:
        """Fetch exercise templates from an external REST API.
        
        Args:
            api_url: The REST API endpoint URL.
            token: Optional Bearer authentication token.
            
        Returns:
            dict: The validated exercises templates dictionary.
        """
        if not api_url:
            raise ValueError("API URL không được để trống.")
            
        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token.strip()}"
            
        response = requests.get(api_url, headers=headers, timeout=30)
        response.raise_for_status()
        
        try:
            data = response.json()
        except ValueError as e:
            raise ValueError(f"Dữ liệu phản hồi không phải định dạng JSON hợp lệ: {str(e)}")
            
        # Basic validation of structure
        if not isinstance(data, dict):
            raise ValueError("Dữ liệu bài tập từ API phải là một đối tượng JSON (dictionary).")
            
        # Ensure structure chapter -> session -> assignment -> details
        for chapter, sessions in data.items():
            if not isinstance(sessions, dict):
                raise ValueError(f"Chương '{chapter}' phải chứa một đối tượng sessions (dictionary).")
            for session, assignments in sessions.items():
                if not isinstance(assignments, dict):
                    raise ValueError(f"Session '{session}' trong chương '{chapter}' phải chứa một đối tượng bài tập (dictionary).")
                for ass_name, ass_data in assignments.items():
                    if not isinstance(ass_data, dict):
                        raise ValueError(f"Bài tập '{ass_name}' trong '{session}' phải là một đối tượng chứa thông tin đề bài.")
                    if "assignment" not in ass_data or "criteria" not in ass_data:
                        raise ValueError(f"Bài tập '{ass_name}' thiếu trường 'assignment' hoặc 'criteria'.")
                        
        return data

    @classmethod
    def sync_from_api_to_local(cls, api_url: str, token: str = None) -> dict:
        """Fetch exercise templates from API and save to local disk/session state."""
        templates = cls.fetch_from_api(api_url, token)
        cls.save_templates(templates)
        return templates
