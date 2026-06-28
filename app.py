import re
import json
import os
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

TEMPLATES_FILE = "templates.json"


def _load_templates():
    if os.path.exists(TEMPLATES_FILE):
        try:
            with open(TEMPLATES_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def _save_templates(templates):
    try:
        with open(TEMPLATES_FILE, "w", encoding="utf-8") as f:
            json.dump(templates, f, ensure_ascii=False, indent=2)
        return True
    except Exception:
        return False


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


def _parse_score(report_text: str) -> str | None:
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


def main():
    st.set_page_config(
        page_title="AI GitHub Grader v1.0", page_icon="🤖", layout="wide"
    )

    # Initialize input values in session state if not present
    if "assignment_val" not in st.session_state:
        st.session_state.assignment_val = ""
    if "criteria_val" not in st.session_state:
        st.session_state.criteria_val = "1. Đáp ứng yêu cầu nghiệp vụ của đề bài. (40 điểm)\n2. Logic xử lý chính xác và xử lý ngoại lệ tốt. (30 điểm)\n3. Cấu trúc mã nguồn sạch sẽ, dễ đọc, chuẩn hóa. (30 điểm)"

    # Inject Custom CSS for premium fonts, styled cards, and buttons
    st.markdown(
        """
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700&display=swap');
        
        html, body, [class*="css"] {
            font-family: 'Be Vietnam Pro', sans-serif !important;
        }
        
        .header-container {
            background: linear-gradient(135deg, #1e3a8a, #3b82f6);
            padding: 30px;
            border-radius: 12px;
            color: white;
            margin-bottom: 25px;
            box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2);
        }
        
        .header-title {
            font-size: 2.2rem;
            font-weight: 700;
            margin: 0;
            color: white !important;
        }
        
        .header-subtitle {
            font-size: 1rem;
            opacity: 0.9;
            margin-top: 8px;
            color: #eff6ff !important;
        }
        
        .info-card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 30px;
            text-align: center;
            color: #64748b;
            margin-top: 40px;
            font-size: 1.05rem;
            box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.05);
        }
        
        /* Stylize textareas */
        textarea {
            border-radius: 8px !important;
            border: 1px solid #cbd5e1 !important;
            font-size: 0.95rem !important;
        }
        
        /* Stylize selectbox and inputs */
        div[data-baseweb="select"] {
            border-radius: 8px !important;
        }
        
        input {
            border-radius: 8px !important;
        }
        
        /* Stylize primary buttons */
        div.stButton > button:first-child {
            background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
            color: white !important;
            border: none !important;
            padding: 12px 24px !important;
            border-radius: 8px !important;
            font-weight: 600 !important;
            font-size: 1.05rem !important;
            width: 100% !important;
            transition: all 0.2s ease-in-out !important;
            box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2) !important;
            margin-top: 10px;
        }
        
        div.stButton > button:first-child:hover {
            background: linear-gradient(135deg, #1d4ed8, #1e40af) !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 6px 12px -2px rgba(37, 99, 235, 0.3) !important;
        }
        
        /* Sidebar headers styling */
        .sidebar-section {
            font-weight: 600;
            color: #0f172a;
            margin-top: 15px;
            margin-bottom: 5px;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

    # Render Premium Banner Header
    st.markdown(
        """
        <div class="header-container">
            <h1 class="header-title">🤖 Hệ thống Chấm điểm & Đánh giá Mã nguồn AI</h1>
            <div class="header-subtitle">Giải pháp chấm bài tập lập trình tự động qua liên kết GitHub sử dụng Trí tuệ Nhân tạo thông minh.</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # ── Sidebar: AI Configuration & Templates ────────────────────────
    with st.sidebar:
        st.markdown('<div class="sidebar-section">⚙️ CẤU HÌNH AI</div>', unsafe_allow_html=True)
        with st.expander("Tùy chỉnh kết nối AI", expanded=False):
            current_config = _get_ai_config()
            provider = st.selectbox(
                "Nhà cung cấp (Provider)",
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
        st.caption(f"🔌 Trạng thái: **{_provider_display_name(active_config)}**")
        
        st.markdown("---")
        st.markdown('<div class="sidebar-section">📚 MẪU BÀI TẬP NHANH</div>', unsafe_allow_html=True)
        
        templates = _load_templates()
        if templates:
            chapters = list(templates.keys())
            selected_chapter = st.selectbox("Chọn Chương", chapters, key="select_chapter")
            
            sessions = list(templates[selected_chapter].keys()) if selected_chapter else []
            selected_session = st.selectbox("Chọn Session", sessions, key="select_session")
            
            assignments_list = list(templates[selected_chapter][selected_session].keys()) if selected_chapter and selected_session else []
            selected_assignment = st.selectbox("Chọn Bài tập", assignments_list, key="select_assignment")
            
            if st.button("📥 Nạp Mẫu Đã Chọn", use_container_width=True):
                if selected_chapter and selected_session and selected_assignment:
                    data = templates[selected_chapter][selected_session][selected_assignment]
                    st.session_state.assignment_val = data["assignment"]
                    st.session_state.criteria_val = data["criteria"]
                    st.success("✅ Đã nạp bài tập thành công!")
                    st.rerun()
        else:
            st.info("Chưa có mẫu bài tập nào.")
            
        st.markdown("---")
        with st.expander("🛠️ Quản lý Danh mục Mẫu", expanded=False):
            action = st.radio("Thao tác", ["Thêm mới", "Chỉnh sửa", "Xóa mẫu"])
            
            if action == "Thêm mới":
                new_chapter = st.text_input("Tên Chương *")
                new_session = st.text_input("Tên Session *")
                new_title = st.text_input("Tên Bài tập *")
                new_assignment = st.text_area("Đề bài *", height=100)
                new_criteria = st.text_area("Tiêu chí *", height=100)
                
                if st.button("Thêm vào danh sách", use_container_width=True):
                    if new_chapter and new_session and new_title and new_assignment and new_criteria:
                        if new_chapter not in templates:
                            templates[new_chapter] = {}
                        if new_session not in templates[new_chapter]:
                            templates[new_chapter][new_session] = {}
                        
                        templates[new_chapter][new_session][new_title] = {
                            "assignment": new_assignment,
                            "criteria": new_criteria
                        }
                        if _save_templates(templates):
                            st.success("✅ Đã thêm mẫu thành công!")
                            st.rerun()
                        else:
                            st.error("Lỗi khi lưu tệp tin.")
                    else:
                        st.warning("Vui lòng điền đầy đủ thông tin gắn dấu *.")
            
            elif action == "Chỉnh sửa":
                if templates:
                    edit_chapter = st.selectbox("Chọn Chương để sửa", list(templates.keys()), key="edit_c")
                    edit_session = st.selectbox("Chọn Session để sửa", list(templates[edit_chapter].keys()) if edit_chapter else [], key="edit_s")
                    edit_title = st.selectbox("Chọn Bài tập để sửa", list(templates[edit_chapter][edit_session].keys()) if edit_chapter and edit_session else [], key="edit_t")
                    
                    if edit_chapter and edit_session and edit_title:
                        current_data = templates[edit_chapter][edit_session][edit_title]
                        updated_assignment = st.text_area("Đề bài", value=current_data["assignment"], height=100)
                        updated_criteria = st.text_area("Tiêu chí", value=current_data["criteria"], height=100)
                        
                        if st.button("Lưu thay đổi", use_container_width=True):
                            templates[edit_chapter][edit_session][edit_title] = {
                                "assignment": updated_assignment,
                                "criteria": updated_criteria
                            }
                            if _save_templates(templates):
                                st.success("✅ Cập nhật thành công!")
                                st.rerun()
                            else:
                                st.error("Lỗi khi lưu tệp tin.")
                else:
                    st.info("Chưa có mẫu nào để sửa.")
                    
            elif action == "Xóa mẫu":
                if templates:
                    del_chapter = st.selectbox("Chọn Chương để xóa", list(templates.keys()), key="del_c")
                    del_session = st.selectbox("Chọn Session để xóa", list(templates[del_chapter].keys()) if del_chapter else [], key="del_s")
                    del_title = st.selectbox("Chọn Bài tập để xóa", list(templates[del_chapter][del_session].keys()) if del_chapter and del_session else [], key="del_t")
                    
                    if st.button("Xóa bài tập này", use_container_width=True):
                        if del_chapter and del_session and del_title:
                            del templates[del_chapter][del_session][del_title]
                            # Clean up empty keys
                            if not templates[del_chapter][del_session]:
                                del templates[del_chapter][del_session]
                            if not templates[del_chapter]:
                                del templates[del_chapter]
                            
                            if _save_templates(templates):
                                st.success("✅ Đã xóa mẫu thành công!")
                                st.rerun()
                            else:
                                st.error("Lỗi khi lưu tệp tin.")
                else:
                    st.info("Chưa có mẫu nào để xóa.")

    # ── Main area ────────────────────────────────────────────────────
    col_config, col_monitor = st.columns([2, 3])
    with col_config:
        st.subheader("📋 Thiết lập chấm bài")
        repo_url = st.text_input(
            "🔗 URL GitHub Repository:",
            placeholder="https://github.com/username/repository-name",
        )
        assignment_input = st.text_area(
            "📝 Đề bài bài tập:",
            key="assignment_val",
            height=180,
            placeholder="Mô tả các yêu cầu, đề bài giao cho học sinh..."
        )
        criteria_input = st.text_area(
            "🎯 Tiêu chí chấm điểm (Tổng 100):",
            key="criteria_val",
            height=180,
            placeholder="Các tiêu chí chấm điểm và điểm số thành phần tương ứng..."
        )
        execute_trigger = st.button(
            "🚀 Bắt đầu thực thi Chấm điểm", type="primary", use_container_width=True
        )

    with col_monitor:
        st.subheader("📊 Báo cáo Giám định từ AI")
        if not execute_trigger:
            st.markdown(
                """
                <div class="info-card">
                    🔍 <b>Chưa có lượt chạy nào</b><br>
                    Hãy nhập liên kết GitHub, đề bài, tiêu chí chấm ở khung bên trái và nhấn nút <b>"Bắt đầu thực thi Chấm điểm"</b> để xem báo cáo chi tiết.
                </div>
                """,
                unsafe_allow_html=True,
            )
        else:
            if not repo_url or not assignment_input or not criteria_input:
                st.error("⚠️ Vui lòng điền đầy đủ các thông tin bắt buộc trước khi thực hiện.")
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
                    ai_engine = AIService(config=ai_config)

                    st.write(
                        f"🧠 Đang gửi **{extracted_payload['total_files']}** "
                        f"tập tin tới **{display_name}** để chấm điểm..."
                    )
                    st.write("⏳ Đang chờ phản hồi từ AI (có thể mất vài phút)...")

                    # Use streaming to show real-time output
                    report_placeholder = st.empty()
                    full_report = ""

                    # Create a container for layout
                    result_container = st.container()

                    for chunk in ai_engine.generate_grading_report_stream(
                        assignment_input,
                        criteria_input,
                        extracted_payload["content"],
                    ):
                        full_report += chunk
                        report_placeholder.markdown(full_report + "▌")

                    # Final render cleanup (remove cursor)
                    report_placeholder.markdown(full_report)
                    
                    # Try to parse the score and display as a metric above the report
                    score = _parse_score(full_report)
                    if score:
                        st.markdown("### 🏆 Kết quả điểm số")
                        st.metric(label="Tổng điểm đánh giá", value=f"{score} / 100")
                        st.markdown("---")

                    ai_status.update(
                        label="✅ AI đã hoàn tất đánh giá",
                        state="complete",
                        expanded=False,
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
