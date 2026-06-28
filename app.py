import streamlit as st
from config.settings import Settings
from services.github_service import GitHubService
from services.ai_service import AIService

GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
]

def _get_ai_config():
    if "ai_config" in st.session_state:
        return st.session_state.ai_config
    return {
        "provider": Settings.AI_PROVIDER or "gemini",
        "api_key": Settings.GEMINI_API_KEY,
        "api_base_url": Settings.CUSTOM_API_BASE_URL,
        "model_name": Settings.CUSTOM_MODEL_NAME or Settings.DEFAULT_MODEL,
        "local_model_name": Settings.LOCAL_MODEL_NAME,
        "ollama_base_url": Settings.OLLAMA_BASE_URL,
    }


def _provider_display_name(config: dict) -> str:
    """Return a human-readable string for the active AI provider."""
    provider = config.get("provider", "gemini")
    if provider == "local":
        model = config.get("local_model_name", Settings.LOCAL_MODEL_NAME)
        return f"Ollama Local ({model})"
    if provider == "custom":
        model = config.get("model_name", "custom")
        return f"Custom API ({model})"
    model = config.get("model_name", Settings.DEFAULT_MODEL)
    return f"Google Gemini ({model})"


def main():
    st.set_page_config(
        page_title="AI GitHub Grader v1.0", page_icon="🤖", layout="wide"
    )
    st.title("🤖 Hệ thống AI Khao Thi & Cham Diem Ma Nguon")
    st.markdown("---")

    # ── Sidebar: AI Configuration ────────────────────────────────────
    with st.sidebar:
        st.subheader("⚙️ Cấu hình AI")
        with st.expander("Cấu hình AI", expanded=False):
            current_config = _get_ai_config()
            provider = st.selectbox(
                "Provider",
                ["gemini", "local", "custom"],
                index=["gemini", "local", "custom"].index(
                    current_config.get("provider", "gemini")
                ),
                key="ai_provider_select",
            )
            if provider == "local":
                local_model_name = st.text_input(
                    "Tên model local",
                    value=current_config.get(
                        "local_model_name", Settings.LOCAL_MODEL_NAME
                    ),
                    key="ai_local_model_name",
                )
                ollama_base_url = st.text_input(
                    "Ollama URL",
                    value=current_config.get(
                        "ollama_base_url", Settings.OLLAMA_BASE_URL
                    ),
                    key="ai_ollama_base_url",
                )
                api_key = ""
                api_base_url = ""
                model_name = ""
            else:
                local_model_name = Settings.LOCAL_MODEL_NAME
                ollama_base_url = Settings.OLLAMA_BASE_URL
                api_key = st.text_input(
                    "API Key",
                    value=current_config.get("api_key", ""),
                    type="password",
                    key="ai_api_key",
                )
                if provider == "custom":
                    api_base_url = st.text_input(
                        "Base URL",
                        value=current_config.get("api_base_url", ""),
                        key="ai_api_base_url",
                    )
                    model_name = st.text_input(
                        "Model",
                        value=current_config.get("model_name", Settings.DEFAULT_MODEL),
                        key="ai_model_name",
                    )
                else:
                    api_base_url = ""
                    # Gemini model selector
                    saved_model = current_config.get("model_name", Settings.DEFAULT_MODEL)
                    if saved_model in GEMINI_MODELS:
                        default_idx = GEMINI_MODELS.index(saved_model)
                    else:
                        default_idx = 0
                    model_name = st.selectbox(
                        "Model Gemini",
                        GEMINI_MODELS,
                        index=default_idx,
                        key="ai_gemini_model_select",
                    )
            # Auto-sync config to session state on every widget change
            st.session_state.ai_config = {
                "provider": provider,
                "api_key": api_key,
                "api_base_url": api_base_url,
                "model_name": model_name,
                "local_model_name": local_model_name,
                "ollama_base_url": ollama_base_url,
            }

        # Show active config summary
        active_config = _get_ai_config()
        st.caption(f"🔌 Provider: **{_provider_display_name(active_config)}**")

    # ── Main area ────────────────────────────────────────────────────
    col_config, col_monitor = st.columns([2, 3])
    with col_config:
        st.subheader("📋 Phần vùng Thiết lập")
        repo_url = st.text_input(
            "🔗 URL GitHub Repository:",
            placeholder="https://github.com/user/repo-name",
        )
        assignment_input = st.text_area("📝 Đề bài bài tập:", height=150)
        standard_criteria = "Criteria here"
        criteria_input = st.text_area(
            "🎯 Tiêu chí chấm điểm (Tổng 100):", value=standard_criteria, height=150
        )
        execute_trigger = st.button(
            "🚀 Thực thi Chấm điểm", type="primary", use_container_width=True
        )

    with col_monitor:
        st.subheader("📊 Báo cáo Giám định từ AI")
        if execute_trigger:
            if not repo_url or not assignment_input or not criteria_input:
                st.error("⚠️ Vui lòng điền đầy đủ các thông tin bắt buộc.")
                return

            # ── PHASE 1: Fetch source code from GitHub ───────────
            extracted_payload = None
            with st.status(
                "📥 Đang lấy mã nguồn từ GitHub...", expanded=True
            ) as github_status:
                try:
                    log = st.empty()

                    def _github_progress(step, **details):
                        if step == "parse_url":
                            log.write(
                                f"🔗 Phân tích URL → "
                                f"**{details['username']}/{details['repo']}**"
                            )
                        elif step == "detect_branch_start":
                            log.write("🔍 Đang xác định nhánh mặc định...")
                        elif step == "detect_branch":
                            branch = details.get("branch")
                            note = details.get("note", "")
                            if branch:
                                log.write(
                                    f"🌿 Nhánh mặc định: **{branch}** ({note})"
                                )
                            else:
                                log.write(f"⚠️ {note} — thử main/master")
                        elif step == "try_tree_api":
                            success = details.get("success")
                            branch = details["branch"]
                            if success is None:
                                log.write(
                                    f"🌲 Thử Git Trees API (nhánh `{branch}`)..."
                                )
                            elif success:
                                log.write(
                                    f"✅ Git Trees API thành công (nhánh `{branch}`)"
                                )
                            else:
                                log.write(
                                    f"❌ Git Trees API thất bại (nhánh `{branch}`)"
                                )
                        elif step == "try_contents_api":
                            success = details.get("success")
                            branch = details["branch"]
                            if success is None:
                                log.write(
                                    f"📂 Thử Contents API (nhánh `{branch}`)..."
                                )
                            elif success:
                                log.write(
                                    f"✅ Contents API thành công (nhánh `{branch}`)"
                                )
                            else:
                                log.write(
                                    f"❌ Contents API thất bại (nhánh `{branch}`)"
                                )
                        elif step == "download_files":
                            total = details.get("total", "?")
                            log.write(
                                f"📥 Bắt đầu tải **{total}** tập tin mã nguồn..."
                            )
                        elif step == "file_downloaded":
                            current = details.get("current", 0)
                            total = details.get("total", "?")
                            path = details.get("file_path", "")
                            log.write(
                                f"📄 [{current}/{total}] `{path}`"
                            )
                        elif step == "try_archive":
                            branch = details["branch"]
                            log.write(
                                f"📦 Chuyển sang tải ZIP archive (nhánh `{branch}`)..."
                            )
                        elif step == "file_extracted":
                            current = details.get("current", 0)
                            path = details.get("file_path", "")
                            log.write(
                                f"📄 [{current}] Giải nén `{path}`"
                            )
                        elif step == "done":
                            total = details.get("total_files", 0)
                            log.write(
                                f"✅ Hoàn tất — nạp thành công **{total}** tập tin"
                            )

                    github_engine = GitHubService()
                    extracted_payload = github_engine.get_repo_contents(
                        repo_url, on_progress=_github_progress
                    )
                    github_status.update(
                        label=f"✅ Nạp mã nguồn thành công — "
                        f"{extracted_payload['total_files']} tập tin",
                        state="complete",
                        expanded=False,
                    )
                except Exception as e:
                    github_status.update(
                        label="❌ Lỗi khi lấy mã nguồn từ GitHub",
                        state="error",
                        expanded=True,
                    )
                    st.error(f"Lỗi GitHub: {str(e)}")
                    return

            if not extracted_payload:
                return

            # ── PHASE 2: AI Grading ──────────────────────────────
            ai_config = _get_ai_config()
            display_name = _provider_display_name(ai_config)

            with st.status(
                f"🤖 Trợ giảng AI đang đánh giá ({display_name})...",
                expanded=True,
            ) as ai_status:
                try:
                    # Validate config before starting
                    ai_engine = AIService(config=ai_config)

                    st.write(
                        f"🧠 Đang gửi **{extracted_payload['total_files']}** "
                        f"tập tin tới **{display_name}** để chấm điểm..."
                    )
                    st.write("⏳ Đang chờ phản hồi từ AI (có thể mất vài phút)...")

                    # Use streaming to show real-time output
                    report_placeholder = st.empty()
                    full_report = ""

                    for chunk in ai_engine.generate_grading_report_stream(
                        assignment_input,
                        criteria_input,
                        extracted_payload["content"],
                    ):
                        full_report += chunk
                        report_placeholder.markdown(full_report + "▌")

                    # Render final (remove cursor)
                    report_placeholder.markdown(full_report)

                    ai_status.update(
                        label="✅ AI đã hoàn tất đánh giá",
                        state="complete",
                        expanded=True,
                    )
                except Exception as e:
                    ai_status.update(
                        label="❌ Lỗi khi chấm điểm bằng AI",
                        state="error",
                        expanded=True,
                    )
                    st.error(f"Lỗi AI: {str(e)}")


if __name__ == "__main__":
    main()
