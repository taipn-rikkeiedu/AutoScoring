import re

def parse_score(report_text: str) -> str | None:
    """Parse the total score from the markdown report."""
    match_xml = re.search(r'<score>\s*(\d+(?:[.,]\d+)?)\s*</score>', report_text, re.IGNORECASE)
    if match_xml:
        return match_xml.group(1).replace(',', '.')

    match = re.search(r'(\d+(?:[.,]\d+)?)\s*/\s*100', report_text)
    if match:
        return match.group(1).replace(',', '.')

    match_fallback = re.search(
        r'(?:Tổng điểm|TỔNG|Score|Points):\s*\*{0,2}(\d+(?:[.,]\d+)?)\*{0,2}',
        report_text,
        re.IGNORECASE,
    )
    if match_fallback:
        return match_fallback.group(1).replace(',', '.')
    return None


def is_streamlit_running() -> bool:
    """Check if the code is currently running inside a Streamlit application."""
    import streamlit as st
    try:
        return st.runtime.exists()
    except Exception:
        return False
