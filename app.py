import re
import json
import streamlit as st
from config.settings import Settings
from services.github_service import GitHubService
from services.ai_service import AIService


def _load_templates():
    if "cloud_templates" not in st.session_state:
        st.session_state.cloud_templates = Settings.DEFAULT_TEMPLATES.copy()
    return st.session_state.cloud_templates


def _save_templates(templates):
    st.session_state.cloud_templates = templates
    return True


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

    def apply_uploaded_config():
        uploaded_file = st.session_state.get("settings_config_uploader")
        if uploaded_file is not None:
            try:
                uploaded_config = json.load(uploaded_file)
                if isinstance(uploaded_config, dict) and "provider" in uploaded_config:
                    st.session_state.ai_config = uploaded_config
                    
                    # Force sync values directly to widget keys in session state to update inputs
                    st.session_state.settings_provider_select = uploaded_config.get("provider", "gemini")
                    st.session_state.settings_api_key = uploaded_config.get("api_key", "")
                    st.session_state.settings_api_base_url = uploaded_config.get("api_base_url", "")
                    st.session_state.settings_model_name = uploaded_config.get("model_name", Settings.DEFAULT_MODEL)
                    st.session_state.settings_local_model_name = uploaded_config.get("local_model_name", Settings.LOCAL_MODEL_NAME)
                    st.session_state.settings_ollama_base_url = uploaded_config.get("ollama_base_url", Settings.OLLAMA_BASE_URL)
                    st.session_state.settings_gemini_model_select = uploaded_config.get("model_name", Settings.DEFAULT_MODEL)
                    
                    st.session_state.config_upload_success = "✅ Đã nạp cấu hình AI thành công!"
                else:
                    st.session_state.config_upload_error = "Cấu trúc file config.json không hợp lệ."
            except Exception as e:
                st.session_state.config_upload_error = f"Lỗi đọc file: {str(e)}"

    def apply_uploaded_templates():
        uploaded_file = st.session_state.get("tab2_templates_uploader")
        if uploaded_file is not None:
            try:
                uploaded_templates = json.load(uploaded_file)
                if isinstance(uploaded_templates, dict):
                    _save_templates(uploaded_templates)
                    st.session_state.templates_upload_success = "✅ Đã nạp danh sách bài tập thành công!"
                else:
                    st.session_state.templates_upload_error = "Cấu trúc file templates.json không hợp lệ."
            except Exception as e:
                st.session_state.templates_upload_error = f"Lỗi đọc file: {str(e)}"

    # Initialize input values in session state if not present
    if "assignment_val" not in st.session_state:
        st.session_state.assignment_val = ""
    if "criteria_val" not in st.session_state:
        st.session_state.criteria_val = Settings.DEFAULT_CRITERIA

    # Inject Custom CSS for tab-based design and premium styling
    st.markdown(
        """
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700&display=swap');
        
        html, body, [class*="css"] {
            font-family: 'Be Vietnam Pro', sans-serif !important;
        }
        
        .header-container {
            background: linear-gradient(135deg, #1e3a8a, #3b82f6);
            padding: 25px;
            border-radius: 12px;
            color: white;
            margin-bottom: 20px;
            box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2);
        }
        
        .header-title {
            font-size: 2rem;
            font-weight: 700;
            margin: 0;
            color: white !important;
        }
        
        .header-subtitle {
            font-size: 0.95rem;
            opacity: 0.9;
            margin-top: 6px;
            color: #eff6ff !important;
        }
        
        .info-card {
            background-color: var(--secondary-background-color);
            border: 1px solid var(--border-color, #e2e8f0);
            border-radius: 10px;
            padding: 30px;
            text-align: center;
            color: var(--text-color);
            opacity: 0.85;
            margin-top: 20px;
            font-size: 1rem;
        }
        
        /* Stylize tabs */
        button[data-baseweb="tab"] {
            font-size: 1.05rem !important;
            font-weight: 600 !important;
            padding: 12px 24px !important;
            color: var(--text-color) !important;
            opacity: 0.7;
        }
        
        button[data-baseweb="tab"][aria-selected="true"] {
            color: #2563eb !important;
            border-bottom-color: #2563eb !important;
            opacity: 1;
        }
        
        /* Stylize textareas */
        textarea {
            border-radius: 8px !important;
            border: 1px solid var(--border-color, #cbd5e1) !important;
            font-size: 0.95rem !important;
            background-color: var(--background-color) !important;
            color: var(--text-color) !important;
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
            font-size: 1rem !important;
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
            color: var(--text-color);
            margin-top: 10px;
            margin-bottom: 5px;
        }
        
        .manager-section {
            background-color: var(--secondary-background-color);
            border: 1px solid var(--border-color, #e2e8f0);
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 15px;
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

    # Load templates database
    templates = _load_templates()

    # ── Sidebar: Keep clean with only AI Connection status ───────────
    with st.sidebar:
        st.markdown('<div class="sidebar-section">🔌 TRẠNG THÁI AI KẾT NỐI</div>', unsafe_allow_html=True)
        active_config = _get_ai_config()
        st.info(f"Đang kích hoạt:\n\n**{_provider_display_name(active_config)}**")
        st.caption(
            "Bạn có thể cấu hình AI, chọn model khác, hoặc tải lên khóa bí mật trong thẻ **Settings ⚙️** ở màn hình chính."
        )

    # ── Main Area Navigation Tabs ────────────────────────────────────
    tab_grader, tab_manager, tab_settings = st.tabs([
        "🚀 Chấm Điểm Bài Tập", 
        "📚 Quản Lý Đề Bài & Mẫu", 
        "⚙️ Cấu Hình Hệ Thống"
    ])

    # ══════════════════════════════════════════════════════════════════
    # TAB 1: GRADING WORKSPACE
    # ══════════════════════════════════════════════════════════════════
    with tab_grader:
        col_config, col_monitor = st.columns([2, 3])
        with col_config:
            st.subheader("📋 Thiết lập phòng chấm")
            
            # --- Quick template selector (moved from Tab 2) ---
            st.markdown("**Nạp nhanh đề bài bài tập mẫu:**")
            if templates:
                chapters = list(templates.keys())
                selected_chapter = st.selectbox("Chọn Chương", chapters, key="grader_select_chapter")
                
                sessions = list(templates[selected_chapter].keys()) if selected_chapter else []
                selected_session = st.selectbox("Chọn Session", sessions, key="grader_select_session")
                
                assignments_list = list(templates[selected_chapter][selected_session].keys()) if selected_chapter and selected_session else []
                selected_assignment = st.selectbox("Chọn Bài tập", assignments_list, key="grader_select_assignment")
                
                if st.button("📥 Nạp Mẫu Đã Chọn Vào Phòng Chấm", use_container_width=True, key="grader_load_template_btn"):
                    if selected_chapter and selected_session and selected_assignment:
                        data = templates[selected_chapter][selected_session][selected_assignment]
                        st.session_state.assignment_val = data["assignment"]
                        st.session_state.criteria_val = data["criteria"]
                        st.success("✅ Đã nạp đề bài và tiêu chí thành công!")
                        st.rerun()
            else:
                st.info("Chưa có dữ liệu bài tập mẫu nào.")
            
            st.markdown("---")
            
            repo_url = st.text_input(
                "🔗 URL GitHub Repository:",
                placeholder="https://github.com/username/repository-name",
                key="grader_repo_url"
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
                        Hãy nhập liên kết GitHub, đề bài, tiêu chí chấm ở cột bên trái và nhấn nút <b>"Bắt đầu thực thi Chấm điểm"</b> để xem báo cáo chi tiết.
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
            else:
                if not repo_url or not assignment_input or not criteria_input:
                    st.error("⚠️ Vui lòng điền đầy đủ các thông tin bắt buộc trước khi thực hiện.")
                else:
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
                                label=f"✅ Nạp mã nguồn thành công — {extracted_payload['total_files']} tập tin",
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

                    if extracted_payload:
                        # ── PHASE 2: AI Grading ──────────────────────────
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

    # ══════════════════════════════════════════════════════════════════
    # TAB 2: TEMPLATE & EXERCISE MANAGER
    # ══════════════════════════════════════════════════════════════════
    with tab_manager:
        st.subheader("🛠️ Thêm / Sửa / Xóa Danh mục bài tập")
        action = st.radio("Chọn thao tác bạn muốn thực hiện:", ["Thêm mới đề bài", "Chỉnh sửa đề bài", "Xóa đề bài"], horizontal=True)
        
        st.markdown('<div class="manager-section">', unsafe_allow_html=True)
        if action == "Thêm mới đề bài":
            new_chapter = st.text_input("Tên Chương *", placeholder="Ví dụ: Chương [ IT211 - K24 ] Java Web Service")
            new_session = st.text_input("Tên Session *", placeholder="Ví dụ: Session 19: Spring Security")
            new_title = st.text_input("Tên Bài tập *", placeholder="Ví dụ: Bài tập 1 (JWT & Security)")
            new_assignment = st.text_area("Đề bài bài tập *", height=120)
            new_criteria = st.text_area("Tiêu chí chấm điểm *", height=100)
            
            if st.button("➕ Thêm bài tập mới", use_container_width=True):
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
                        st.success("✅ Đã thêm mẫu bài tập thành công!")
                        st.rerun()
                    else:
                        st.error("Lỗi khi lưu tệp dữ liệu.")
                else:
                    st.warning("Vui lòng điền đầy đủ các thông tin bắt buộc (*).")
        
        elif action == "Chỉnh sửa đề bài":
            if templates:
                edit_chapter = st.selectbox("Chọn Chương muốn chỉnh sửa", list(templates.keys()), key="mgr_edit_c")
                edit_session = st.selectbox("Chọn Session muốn chỉnh sửa", list(templates[edit_chapter].keys()) if edit_chapter else [], key="mgr_edit_s")
                edit_title = st.selectbox("Chọn Bài tập muốn chỉnh sửa", list(templates[edit_chapter][edit_session].keys()) if edit_chapter and edit_session else [], key="mgr_edit_t")
                
                if edit_chapter and edit_session and edit_title:
                    current_data = templates[edit_chapter][edit_session][edit_title]
                    updated_assignment = st.text_area("Đề bài mới", value=current_data["assignment"], height=120)
                    updated_criteria = st.text_area("Tiêu chí chấm điểm mới", value=current_data["criteria"], height=100)
                    
                    if st.button("💾 Lưu thay đổi", use_container_width=True):
                        templates[edit_chapter][edit_session][edit_title] = {
                            "assignment": updated_assignment,
                            "criteria": updated_criteria
                        }
                        if _save_templates(templates):
                            st.success("✅ Đã cập nhật mẫu bài tập thành công!")
                            st.rerun()
                        else:
                            st.error("Lỗi khi lưu tệp dữ liệu.")
            else:
                st.info("Chưa có mẫu nào để sửa.")
                
        elif action == "Xóa đề bài":
            if templates:
                del_chapter = st.selectbox("Chọn Chương muốn xóa", list(templates.keys()), key="mgr_del_c")
                del_session = st.selectbox("Chọn Session muốn xóa", list(templates[del_chapter].keys()) if del_chapter else [], key="mgr_del_s")
                del_title = st.selectbox("Chọn Bài tập muốn xóa", list(templates[del_chapter][del_session].keys()) if del_chapter and del_session else [], key="mgr_del_t")
                
                if st.button("🗑️ Xác nhận xóa bài tập này", use_container_width=True):
                    if del_chapter and del_session and del_title:
                        del templates[del_chapter][del_session][del_title]
                        # Clean up empty sub-levels
                        if not templates[del_chapter][del_session]:
                            del templates[del_chapter][del_session]
                        if not templates[del_chapter]:
                            del templates[del_chapter]
                        
                        if _save_templates(templates):
                            st.success("✅ Đã xóa mẫu bài tập thành công!")
                            st.rerun()
                        else:
                            st.error("Lỗi khi lưu tệp dữ liệu.")
            else:
                st.info("Chưa có mẫu nào để xóa.")
        st.markdown('</div>', unsafe_allow_html=True)
            
        st.markdown("---")
        col_tpl_import, col_tpl_export = st.columns([1, 1])
        with col_tpl_import:
            st.subheader("📥 Nhập danh sách bài tập mới")
            st.caption("Nạp danh sách bài tập từ tệp templates.json của bạn:")
            uploaded_templates_file = st.file_uploader(
                "Chọn tệp templates.json", 
                type=["json"], 
                key="tab2_templates_uploader"
            )
            st.button(
                "🔌 Áp dụng danh sách bài tập vừa tải lên", 
                use_container_width=True, 
                on_click=apply_uploaded_templates
            )
            if st.session_state.get("templates_upload_success"):
                st.success(st.session_state.templates_upload_success)
                del st.session_state.templates_upload_success
                st.rerun()
            if st.session_state.get("templates_upload_error"):
                st.error(st.session_state.templates_upload_error)
                del st.session_state.templates_upload_error
        
        with col_tpl_export:
            st.subheader("📤 Sao lưu danh sách bài tập")
            st.caption("Tải về toàn bộ danh sách mẫu bài tập hiện tại để lưu trữ:")
            templates_data = json.dumps(templates, ensure_ascii=False, indent=2)
            st.download_button(
                label="📥 Tải xuống templates.json",
                data=templates_data,
                file_name="templates.json",
                mime="application/json",
                use_container_width=True
            )

    # ══════════════════════════════════════════════════════════════════
    # TAB 3: AI SYSTEM SETTINGS
    # ══════════════════════════════════════════════════════════════════
    with tab_settings:
        col_ai, col_files = st.columns([1, 1])
        
        with col_ai:
            st.subheader("🔌 Cấu hình công cụ AI")
            st.caption("Thay đổi nhà cung cấp AI, khóa API và các mô hình xử lý:")
            
            # Form-like rendering for AI settings
            provider = st.selectbox(
                "Nhà cung cấp (Provider)",
                ["gemini", "local", "custom"],
                index=["gemini", "local", "custom"].index(
                    active_config.get("provider", "gemini")
                ),
                key="settings_provider_select",
            )
            
            if provider == "local":
                local_model_name = st.text_input(
                    "Tên local model (Ollama)",
                    value=active_config.get("local_model_name", Settings.LOCAL_MODEL_NAME),
                    key="settings_local_model_name",
                )
                ollama_base_url = st.text_input(
                    "Ollama URL",
                    value=active_config.get("ollama_base_url", Settings.OLLAMA_BASE_URL),
                    key="settings_ollama_base_url",
                )
                api_key = ""
                api_base_url = ""
                model_name = ""
            else:
                local_model_name = Settings.LOCAL_MODEL_NAME
                ollama_base_url = Settings.OLLAMA_BASE_URL
                api_key = st.text_input(
                    "API Key",
                    value=active_config.get("api_key", ""),
                    type="password",
                    key="settings_api_key",
                )
                if provider == "custom":
                    api_base_url = st.text_input(
                        "Base URL",
                        value=active_config.get("api_base_url", ""),
                        key="settings_api_base_url",
                    )
                    model_name = st.text_input(
                        "Model",
                        value=active_config.get("model_name", Settings.DEFAULT_MODEL),
                        key="settings_model_name",
                    )
                else:
                    api_base_url = ""
                    saved_model = active_config.get("model_name", Settings.DEFAULT_MODEL)
                    if saved_model in Settings.GEMINI_MODELS:
                        default_idx = Settings.GEMINI_MODELS.index(saved_model)
                    else:
                        default_idx = 0
                    model_name = st.selectbox(
                        "Model Gemini",
                        Settings.GEMINI_MODELS,
                        index=default_idx,
                        key="settings_gemini_model_select",
                    )

            # Auto-sync config to session state on change
            new_settings_config = {
                "provider": provider,
                "api_key": api_key,
                "api_base_url": api_base_url,
                "model_name": model_name,
                "local_model_name": local_model_name,
                "ollama_base_url": ollama_base_url,
            }
            if st.session_state.get("ai_config") != new_settings_config:
                try:
                    # Validate before saving
                    Settings.validate(
                        provider=provider,
                        api_key=api_key if provider != "local" else "",
                        api_base_url=api_base_url if provider == "custom" else "",
                    )
                    st.session_state.ai_config = new_settings_config
                    st.success("✅ Đã cập nhật và đồng bộ cấu hình AI thành công!")
                except ValueError as ve:
                    st.error(f"Cấu hình không hợp lệ: {str(ve)}")

        with col_files:
            st.subheader("📁 Nhập / Xuất cấu hình AI (config.json)")
            st.caption(
                "Cấu hình nhanh API key bằng cách tải lên tệp config.json có sẵn:"
            )
            
            st.markdown("**1. Tải lên từ máy tính (Nạp cấu hình):**")
            uploaded_config_file = st.file_uploader(
                "Chọn tệp config.json", 
                type=["json"], 
                key="settings_config_uploader"
            )
            
            st.button(
                "🔌 Áp dụng cấu hình AI vừa tải lên", 
                use_container_width=True, 
                on_click=apply_uploaded_config
            )
            if st.session_state.get("config_upload_success"):
                st.success(st.session_state.config_upload_success)
                del st.session_state.config_upload_success
                st.rerun()
            if st.session_state.get("config_upload_error"):
                st.error(st.session_state.config_upload_error)
                del st.session_state.config_upload_error
                    
            st.markdown("---")
            st.markdown("**2. Tải xuống máy tính (Sao lưu cấu hình hiện tại):**")
            
            config_data = json.dumps(active_config, ensure_ascii=False, indent=2)
            st.download_button(
                label="📥 Tải xuống config.json hiện tại",
                data=config_data,
                file_name="config.json",
                mime="application/json",
                use_container_width=True
            )


if __name__ == "__main__":
    main()
