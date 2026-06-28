import re

def parse_score(report_text: str) -> str | None:
    """Parse the total score from the markdown report."""
    match = re.search(r'(\d+)\s*/\s*100', report_text)
    if match:
        return match.group(1)
    match_fallback = re.search(
        r'(?:Tổng điểm|TỔNG|Score|Points):\s*\*?(\d+)\*?',
        report_text,
        re.IGNORECASE,
    )
    if match_fallback:
        return match_fallback.group(1)
    return None
