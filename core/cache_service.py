import hashlib
import streamlit as st
from datetime import datetime, timedelta
from core.settings import Settings
from utils.helpers import is_streamlit_running

_GLOBAL_GRADING_CACHE = {}

def _make_cache_key(assignment: str, criteria: str, code_content: str) -> str:
    """Tạo hash key từ combo đề bài + tiêu chí + mã nguồn."""
    raw = f"{assignment}|{criteria}|{code_content}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def get_cached_report(
    assignment: str, criteria: str, code_content: str
) -> str | None:
    """Trả về kết quả chấm đã cache, hoặc None nếu cache miss."""
    if not Settings.GRADING_CACHE_ENABLED:
        return None
    
    if is_streamlit_running():
        if "grading_cache" not in st.session_state:
            st.session_state.grading_cache = {}
        cache = st.session_state.grading_cache
    else:
        cache = _GLOBAL_GRADING_CACHE
        
    key = _make_cache_key(assignment, criteria, code_content)
    entry = cache.get(key)
    if entry is None:
        return None
    # Kiểm tra TTL
    ttl_minutes = Settings.GRADING_CACHE_TTL_MINUTES
    if datetime.now() - entry["timestamp"] > timedelta(minutes=ttl_minutes):
        del cache[key]
        return None
    return entry["report"]


def save_cached_report(
    assignment: str, criteria: str, code_content: str, report: str
) -> None:
    """Lưu kết quả chấm vào cache."""
    if not Settings.GRADING_CACHE_ENABLED:
        return
        
    if is_streamlit_running():
        if "grading_cache" not in st.session_state:
            st.session_state.grading_cache = {}
        cache = st.session_state.grading_cache
    else:
        cache = _GLOBAL_GRADING_CACHE
        
    key = _make_cache_key(assignment, criteria, code_content)
    cache[key] = {
        "report": report,
        "timestamp": datetime.now(),
    }


def get_cache_stats() -> dict:
    """Trả về thống kê cache cho UI."""
    if is_streamlit_running():
        cache = st.session_state.get("grading_cache", {})
    else:
        cache = _GLOBAL_GRADING_CACHE
        
    return {
        "total_entries": len(cache),
        "entries": [
            {
                "key": k[:12] + "...",
                "timestamp": v["timestamp"].strftime("%H:%M:%S"),
            }
            for k, v in cache.items()
        ],
    }


def clear_cache() -> None:
    """Xóa toàn bộ cache."""
    global _GLOBAL_GRADING_CACHE
    if is_streamlit_running():
        st.session_state.grading_cache = {}
    _GLOBAL_GRADING_CACHE = {}
