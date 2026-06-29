import json
import time
import requests
from config.settings import Settings


class AIService:
    # Retry config for transient API errors (429, 503, quota, high demand)
    _MAX_RETRIES = 5
    _RETRY_BASE_DELAY = 10  # seconds; actual delay = max(base*2^attempt, server_hint)
    def __init__(self, config=None):
        self.config = config or {}
        self.provider = (
            (self.config.get("provider") or Settings.AI_PROVIDER or "gemini")
            .strip()
            .lower()
        )
        self.use_local_model = self.provider == "local" or self.config.get(
            "use_local_model", Settings.USE_LOCAL_MODEL
        )

        if self.provider == "local":
            self.local_model_name = (
                self.config.get("local_model_name") or Settings.LOCAL_MODEL_NAME
            )
            self.ollama_base_url = (
                self.config.get("ollama_base_url") or Settings.OLLAMA_BASE_URL
            )
            self.api_key = ""
            self.api_base_url = ""
        elif self.provider == "custom":
            self.api_key = self.config.get("custom_api_key") or self.config.get("api_key") or Settings.CUSTOM_API_KEY
            self.api_base_url = (
                self.config.get("custom_api_base_url") or self.config.get("api_base_url") or Settings.CUSTOM_API_BASE_URL
            )
            self.model_name = (
                self.config.get("custom_model_name")
                or self.config.get("model_name")
                or Settings.CUSTOM_MODEL_NAME
                or Settings.DEFAULT_MODEL
            )
        elif self.provider == "deepseek":
            self.api_key = self.config.get("deepseek_api_key") or self.config.get("api_key") or Settings.DEEPSEEK_API_KEY
            self.api_base_url = (
                self.config.get("deepseek_api_base_url") or self.config.get("api_base_url") or Settings.DEEPSEEK_API_BASE_URL
            )
            self.model_name = (
                self.config.get("deepseek_model_name") or self.config.get("model_name") or Settings.DEEPSEEK_MODEL_NAME
            )
        elif self.provider == "openrouter":
            self.api_key = self.config.get("openrouter_api_key") or self.config.get("api_key") or Settings.OPENROUTER_API_KEY
            self.api_base_url = (
                self.config.get("openrouter_api_base_url") or self.config.get("api_base_url") or Settings.OPENROUTER_API_BASE_URL
            )
            self.model_name = (
                self.config.get("openrouter_model_name") or self.config.get("model_name") or Settings.OPENROUTER_MODEL_NAME
            )
        else:
            self.api_key = self.config.get("gemini_api_key") or self.config.get("api_key") or Settings.GEMINI_API_KEY
            self.model_name = (
                self.config.get("gemini_model_name")
                or self.config.get("model_name")
                or Settings.DEFAULT_MODEL
            )
            self.api_base_url = ""

        Settings.validate(
            provider=self.provider,
            api_key=self.api_key,
            api_base_url=self.api_base_url,
        )

    def _compress_code(self, code_content: str) -> str:
        """Compress code content by collapsing consecutive empty lines and trailing spaces to save input tokens."""
        lines = code_content.split('\n')
        compressed_lines = []
        prev_blank = False
        for line in lines:
            stripped = line.strip()
            if not stripped:
                if not prev_blank:
                    compressed_lines.append("")
                prev_blank = True
            else:
                prev_blank = False
                # Remove trailing whitespaces on the line
                compressed_lines.append(line.rstrip())
        return '\n'.join(compressed_lines)

    def _build_prompt(self, assignment: str, criteria: str, code_content: str) -> str:
        max_score = Settings.GRADING_MAX_SCORE
        max_words = Settings.GRADING_MAX_WORDS
        lang = Settings.GRADING_LANGUAGE
        compressed_code = self._compress_code(code_content)
        return (
            f"Chấm điểm mã nguồn theo thang {max_score} điểm. "
            f"Trả lời ngắn gọn tối đa {max_words} từ bằng {lang}. "
            f"Dùng đúng format sau, KHÔNG thêm gì khác:\n\n"
            f"## KẾT QUẢ CHẤM ĐIỂM\n"
            f"| Tiêu chí | Điểm |\n|---|---|\n"
            f"| Tiêu chí 1 | X/Y |\n"
            f"| ... | ... |\n"
            f"| **TỔNG** | **Z/{max_score}** |\n\n"
            f"## NHẬN XÉT\n"
            f"(Tối đa 3 dòng nhận xét chính)\n\n"
            f"---\n"
            f"ĐỀ BÀI: {assignment}\n\n"
            f"TIÊU CHÍ: {criteria}\n\n"
            f"MÃ NGUỒN:\n{compressed_code}"
        )

    # ------------------------------------------------------------------
    # Non-streaming (backwards compatible)
    # ------------------------------------------------------------------
    def generate_grading_report(
        self, assignment: str, criteria: str, code_content: str
    ) -> str:
        structured_prompt = self._build_prompt(assignment, criteria, code_content)
        if self.provider == "local":
            return self._generate_with_local_model(structured_prompt)
        if self.provider == "custom" or self.provider == "deepseek" or self.provider == "openrouter":
            return self._generate_with_custom_api(structured_prompt)
        return self._generate_with_gemini(structured_prompt)

    # ------------------------------------------------------------------
    # Streaming – yields text chunks for real-time UI updates
    # ------------------------------------------------------------------
    def generate_grading_report_stream(
        self, assignment: str, criteria: str, code_content: str
    ):
        """Yield text chunks as they arrive from the AI model.

        Falls back to yielding the full response as a single chunk
        for providers that don't support streaming.
        """
        structured_prompt = self._build_prompt(assignment, criteria, code_content)
        if self.provider == "local":
            yield from self._stream_local_model(structured_prompt)
        elif self.provider == "custom" or self.provider == "deepseek" or self.provider == "openrouter":
            yield from self._stream_custom_api(structured_prompt)
        else:
            yield from self._stream_gemini(structured_prompt)

    # ------------------------------------------------------------------
    # Local model (Ollama)
    # ------------------------------------------------------------------
    def _generate_with_local_model(self, prompt: str) -> str:
        response = requests.post(
            f"{self.ollama_base_url}/api/generate",
            json={"model": self.local_model_name, "prompt": prompt, "stream": False},
            timeout=300,
        )
        response.raise_for_status()
        payload = response.json()
        return payload.get("response", "")

    def _stream_local_model(self, prompt: str):
        """Stream tokens from Ollama's /api/generate endpoint."""
        response = requests.post(
            f"{self.ollama_base_url}/api/generate",
            json={"model": self.local_model_name, "prompt": prompt, "stream": True},
            timeout=300,
            stream=True,
        )
        response.raise_for_status()
        for line in self._iter_lines_safe(response):
            if not line:
                continue
            try:
                chunk = json.loads(line)
            except json.JSONDecodeError:
                continue
            token = chunk.get("response", "")
            if token:
                yield token
            if chunk.get("done", False):
                break

    # ------------------------------------------------------------------
    # Custom API (OpenAI-compatible)
    # ------------------------------------------------------------------
    def _generate_with_custom_api(self, prompt: str) -> str:
        url = f"{self.api_base_url.rstrip('/')}/chat/completions"
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        payload = {
            "model": self.model_name,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
        }
        response = requests.post(url, headers=headers, json=payload, timeout=300)
        response.raise_for_status()
        data = response.json()
        return self._extract_text_from_payload(data)

    def _stream_custom_api(self, prompt: str):
        """Stream tokens from an OpenAI-compatible /chat/completions endpoint."""
        url = f"{self.api_base_url.rstrip('/')}/chat/completions"
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        payload = {
            "model": self.model_name,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
            "stream": True,
        }
        response = requests.post(
            url, headers=headers, json=payload, timeout=300, stream=True
        )
        response.raise_for_status()
        for line in self._iter_lines_safe(response):
            if not line:
                continue
            if line.startswith("data: "):
                line = line[len("data: "):]
            if line.strip() == "[DONE]":
                break
            try:
                chunk = json.loads(line)
            except json.JSONDecodeError:
                continue
            choices = chunk.get("choices", [])
            if choices:
                delta = choices[0].get("delta", {})
                content = delta.get("content", "")
                if content:
                    yield content

    # ------------------------------------------------------------------
    # Gemini
    # ------------------------------------------------------------------
    def _generate_with_gemini(self, prompt: str) -> str:
        if not self.api_key:
            raise ValueError("Thiếu API key cho Gemini")

        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model_name}:generateContent?key={self.api_key}"
        )
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 1024
            },
        }

        last_error = None
        for attempt in range(self._MAX_RETRIES + 1):
            response = requests.post(url, json=payload, timeout=300)
            if response.status_code == 200:
                data = response.json()
                return self._extract_text_from_payload(data)

            # Check if this is a retryable error (429/503/quota or high demand)
            if self._is_retryable(response) and attempt < self._MAX_RETRIES:
                delay = self._get_retry_delay(response, attempt)
                time.sleep(delay)
                continue

            # Non-retryable or exhausted retries
            try:
                err_data = response.json()
                err_msg = err_data.get("error", {}).get("message", response.text)
                last_error = ValueError(f"Google API Error: {err_msg}")
            except Exception:
                last_error = ValueError(f"Google API Error: HTTP {response.status_code}")
            break

        raise last_error

    def _stream_gemini(self, prompt: str):
        """Stream tokens from Gemini's streamGenerateContent SSE endpoint."""
        if not self.api_key:
            raise ValueError("Thiếu API key cho Gemini")

        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model_name}:streamGenerateContent?alt=sse&key={self.api_key}"
        )
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 1024
            },
        }

        for attempt in range(self._MAX_RETRIES + 1):
            try:
                response = requests.post(url, json=payload, timeout=300, stream=True)
                if response.status_code != 200:
                    if self._is_retryable(response) and attempt < self._MAX_RETRIES:
                        delay = self._get_retry_delay(response, attempt)
                        time.sleep(delay)
                        continue
                    # Fallback to non-streaming (which also has retry)
                    yield self._generate_with_gemini(prompt)
                    return

                for line in self._iter_lines_safe(response):
                    if not line:
                        continue
                    if line.startswith("data: "):
                        line = line[len("data: "):]
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        chunk = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    candidates = chunk.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        for part in parts:
                            text = part.get("text", "")
                            if text:
                                yield text
                # If we reach here, streaming succeeded — break the retry loop
                return
            except requests.exceptions.RequestException:
                if attempt < self._MAX_RETRIES:
                    delay = self._RETRY_BASE_DELAY * (2 ** attempt)
                    time.sleep(min(delay, 60))
                    continue
                # Exhausted retries — fallback to non-streaming
                yield self._generate_with_gemini(prompt)
                return

    @staticmethod
    def _is_retryable(response):
        """Check if the API response indicates a transient/retryable error."""
        if response.status_code in (429, 503):
            return True
        try:
            err_msg = response.json().get("error", {}).get("message", "")
            retryable_keywords = [
                "high demand", "overloaded", "try again",
                "rate limit", "quota", "resource exhausted",
                "please retry",
            ]
            return any(kw in err_msg.lower() for kw in retryable_keywords)
        except Exception:
            return False

    def _get_retry_delay(self, response, attempt):
        """Calculate retry delay, preferring server-suggested wait time."""
        import re as _re
        fallback = min(self._RETRY_BASE_DELAY * (2 ** attempt), 120)
        # 1. Check Retry-After header (seconds)
        retry_after = response.headers.get("Retry-After")
        if retry_after:
            try:
                return max(float(retry_after), 1)
            except (ValueError, TypeError):
                pass
        # 2. Parse "Please retry in XXs" from error message body
        try:
            err_msg = response.json().get("error", {}).get("message", "")
            match = _re.search(r"retry in ([\d.]+)s", err_msg, _re.IGNORECASE)
            if match:
                return max(float(match.group(1)) + 1, 1)  # +1s safety margin
        except Exception:
            pass
        return fallback

    # ------------------------------------------------------------------
    # UTF-8 safe line iterator
    # ------------------------------------------------------------------
    @staticmethod
    def _iter_lines_safe(response, chunk_size=512):
        """Iterate over response lines with proper UTF-8 decoding.

        Unlike ``response.iter_lines(decode_unicode=True)`` which can
        split multi-byte UTF-8 characters (e.g. Vietnamese) across chunk
        boundaries and produce mojibake, this method uses Python's
        incremental UTF-8 decoder to guarantee correct character handling.
        """
        import codecs

        decoder = codecs.getincrementaldecoder("utf-8")("replace")
        buf = ""
        for raw_chunk in response.iter_content(chunk_size=chunk_size):
            if not raw_chunk:
                continue
            buf += decoder.decode(raw_chunk, final=False)
            while "\n" in buf:
                line, buf = buf.split("\n", 1)
                stripped = line.strip("\r")
                if stripped:
                    yield stripped
        # Flush remaining bytes in the decoder
        buf += decoder.decode(b"", final=True)
        if buf.strip("\r\n"):
            yield buf.strip("\r\n")

    # ------------------------------------------------------------------
    # Response parsing helpers
    # ------------------------------------------------------------------
    def _extract_text_from_payload(self, data) -> str:
        if not isinstance(data, dict):
            return str(data)

        if data.get("error"):
            message = data.get("error", {}).get("message", "Unknown API error")
            raise ValueError(message)

        text = self._extract_text_from_choices(data.get("choices"))
        if text:
            return text

        if data.get("response"):
            return str(data.get("response"))

        return self._extract_text_from_candidates(data.get("candidates")) or str(data)

    def _extract_text_from_choices(self, choices) -> str:
        if not isinstance(choices, list) or not choices:
            return ""

        first_choice = choices[0]
        message = first_choice.get("message") or {}
        content = message.get("content") if isinstance(message, dict) else None
        if isinstance(content, list):
            return "".join(
                part.get("text", "") for part in content if isinstance(part, dict)
            )
        if content:
            return str(content)
        return ""

    def _extract_text_from_candidates(self, candidates) -> str:
        if not isinstance(candidates, list):
            return ""

        parts = []
        for candidate in candidates:
            content = candidate.get("content") or {}
            for part in content.get("parts", []):
                text = part.get("text", "")
                if text:
                    parts.append(text)
        return "".join(parts)
