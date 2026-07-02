import re
import json
import time
import streamlit as st
from core.settings import Settings
from core.github_service import GitHubService
from core.ai_service import AIService
from core.storage_service import (
    load_templates,
    save_templates,
    get_ai_config,
    provider_display_name,
)
from utils.helpers import parse_score
from core.cache_service import (
    get_cached_report,
    save_cached_report,
    get_cache_stats,
    clear_cache,
)
from streamlit_app.components.modals import (
    show_template_loader_dialog,
    show_add_assignment_dialog,
    show_edit_assignment_dialog,
    show_delete_assignment_dialog,
    show_backup_restore_dialog,
)


def main():
    st.set_page_config(
        page_title=f"AI GitHub Grader v{Settings.APP_VERSION}", page_icon="🤖", layout="wide"
    )

    # ── Auto-sync from local filesystem on startup ──
    from streamlit_app.services.sync_service import auto_sync_on_startup
    auto_sync_on_startup()

    if st.session_state.get("sync_status_msg"):
        st.toast(st.session_state.sync_status_msg, icon="🔄")
        del st.session_state.sync_status_msg

    def apply_uploaded_config():
        uploaded_file = st.session_state.get("settings_config_uploader")
        if uploaded_file is not None:
            try:
                uploaded_config = json.load(uploaded_file)
                if isinstance(uploaded_config, dict) and "provider" in uploaded_config:
                    st.session_state.ai_config = uploaded_config
                    
                    st.session_state.settings_provider_select = uploaded_config.get("provider", "gemini")
                    
                    old_api_key = uploaded_config.get("api_key", "")
                    old_model_name = uploaded_config.get("model_name", Settings.DEFAULT_MODEL)
                    old_api_base_url = uploaded_config.get("api_base_url", "")
                    prov = uploaded_config.get("provider", "gemini")
                    
                    st.session_state.settings_gemini_api_key = uploaded_config.get(
                        "gemini_api_key", old_api_key if prov == "gemini" else ""
                    )
                    st.session_state.settings_gemini_model_select = uploaded_config.get(
                        "gemini_model_name", old_model_name if prov == "gemini" else Settings.DEFAULT_MODEL
                    )
                    st.session_state.settings_deepseek_api_key = uploaded_config.get(
                        "deepseek_api_key", old_api_key if prov == "deepseek" else ""
                    )
                    st.session_state.settings_openrouter_api_key = uploaded_config.get(
                        "openrouter_api_key", old_api_key if prov == "openrouter" else ""
                    )
                    st.session_state.settings_openrouter_model_select = uploaded_config.get(
                        "openrouter_model_name", old_model_name if prov == "openrouter" else getattr(Settings, "OPENROUTER_MODEL_NAME", "qwen/qwen3-coder:free")
                    )
                    st.session_state.settings_custom_api_key = uploaded_config.get(
                        "custom_api_key", old_api_key if prov == "custom" else ""
                    )
                    st.session_state.settings_custom_api_base_url = uploaded_config.get(
                        "custom_api_base_url", old_api_base_url if prov == "custom" else ""
                    )
                    st.session_state.settings_custom_model_name = uploaded_config.get(
                        "custom_model_name", old_model_name if prov == "custom" else Settings.DEFAULT_MODEL
                    )
                    
                    st.session_state.settings_local_model_name = uploaded_config.get("local_model_name", Settings.LOCAL_MODEL_NAME)
                    st.session_state.settings_ollama_base_url = uploaded_config.get("ollama_base_url", Settings.OLLAMA_BASE_URL)
                    st.session_state.settings_github_token = uploaded_config.get("github_token", "")
                    st.session_state.settings_grading_max_words = int(uploaded_config.get("grading_max_words", Settings.GRADING_MAX_WORDS))
                    st.session_state.settings_grading_max_score = int(uploaded_config.get("grading_max_score", Settings.GRADING_MAX_SCORE))
                    st.session_state.settings_grading_language = uploaded_config.get("grading_language", Settings.GRADING_LANGUAGE)
                    st.session_state.settings_grading_cache_enabled = bool(uploaded_config.get("grading_cache_enabled", Settings.GRADING_CACHE_ENABLED))
                    st.session_state.settings_grading_cache_ttl = int(uploaded_config.get("grading_cache_ttl", Settings.GRADING_CACHE_TTL_MINUTES))
                    st.session_state.settings_max_project_files = int(uploaded_config.get("max_project_files", Settings.MAX_PROJECT_FILES))
                    st.session_state.settings_max_project_chars = int(uploaded_config.get("max_project_chars", Settings.MAX_PROJECT_CHARS))
                    st.session_state.settings_local_data_root = uploaded_config.get("local_data_root", Settings.LOCAL_DATA_ROOT)
                    
                    # Sync to disk
                    from core.sync_service import sync_config_to_disk
                    sync_config_to_disk(uploaded_config)
                    
                    st.session_state.config_upload_success = "✅ Đã nạp cấu hình AI thành công!"
                else:
                    st.session_state.config_upload_error = "Cấu trúc file config.json không hợp lệ."
            except Exception as e:
                st.session_state.config_upload_error = f"Lỗi đọc file: {str(e)}"

    # Load templates database early for default assignment initialization
    from core.storage_service import load_templates
    templates_early = load_templates()
    if "selected_chapter_name" not in st.session_state and templates_early:
        first_chapter = list(templates_early.keys())[0]
        if templates_early[first_chapter]:
            first_session = list(templates_early[first_chapter].keys())[0]
            if templates_early[first_chapter][first_session]:
                first_assignment = list(templates_early[first_chapter][first_session].keys())[0]
                data = templates_early[first_chapter][first_session][first_assignment]
                st.session_state.selected_chapter_name = first_chapter
                st.session_state.selected_session_name = first_session
                st.session_state.selected_assignment_name = first_assignment
                st.session_state.assignment_val = data.get("assignment", "")
                st.session_state.criteria_val = data.get("criteria", "")

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
        f"""
        <div class="header-container" style="padding: 15px 25px; margin-bottom: 15px;">
            <h1 class="header-title" style="font-size: 1.6rem; display: flex; align-items: center; gap: 10px;">
                🤖 AI GitHub Grader
                <span style="font-size:0.55em; opacity:0.8; background:rgba(255,255,255,0.15); padding:2px 8px; border-radius:6px;">v{Settings.APP_VERSION}</span>
            </h1>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # Load templates database
    templates = load_templates()

    # ── Sidebar: Keep clean with only AI Connection status ───────────
    with st.sidebar:
        st.markdown('<div class="sidebar-section">🔌 AI PROVIDER</div>', unsafe_allow_html=True)
        active_config = get_ai_config()
        st.info(f"**{provider_display_name(active_config)}**")
        
        # Local Sync Status
        if st.session_state.get("sync_local_active"):
            st.markdown('<div class="sidebar-section" style="margin-top:20px;">🔄 ĐỒNG BỘ CỤC BỘ</div>', unsafe_allow_html=True)
            st.success("Hoạt động")

    # ── Main Area Navigation Tabs ────────────────────────────────────
    tab_grader, tab_manager, tab_settings = st.tabs([
        "🚀 Chấm Điểm", 
        "📚 Đề Bài & Mẫu", 
        "⚙️ Cấu Hình"
    ])

    # ══════════════════════════════════════════════════════════════════
    # TAB 1: GRADING WORKSPACE
    # ══════════════════════════════════════════════════════════════════
    with tab_grader:
        col_config, col_monitor = st.columns([2, 3])
        with col_config:
            # ── Inline Template Selector (Zero Modals Required) ──
            if templates:
                st.markdown("##### 📚 Chọn bài tập chấm điểm")
                
                # 1. Chapter selection
                chapters = list(templates.keys())
                sel_chapter_idx = chapters.index(st.session_state.selected_chapter_name) if st.session_state.get("selected_chapter_name") in chapters else 0
                
                def _on_chapter_change():
                    ch = st.session_state.inline_chapter_select
                    sessions = list(templates.get(ch, {}).keys())
                    if sessions:
                        sess = sessions[0]
                        assignments = list(templates[ch][sess].keys())
                        if assignments:
                            ass = assignments[0]
                            data = templates[ch][sess][ass]
                            st.session_state.selected_chapter_name = ch
                            st.session_state.selected_session_name = sess
                            st.session_state.selected_assignment_name = ass
                            st.session_state.assignment_val = data["assignment"]
                            st.session_state.criteria_val = data["criteria"]

                selected_chapter = st.selectbox(
                    "Chương / Môn học:",
                    chapters,
                    index=sel_chapter_idx,
                    key="inline_chapter_select",
                    on_change=_on_chapter_change,
                )
                
                # 2. Session selection
                ch_name = st.session_state.get("selected_chapter_name") or chapters[0]
                sessions = list(templates.get(ch_name, {}).keys())
                sel_session_idx = sessions.index(st.session_state.selected_session_name) if st.session_state.get("selected_session_name") in sessions else 0
                
                def _on_session_change():
                    ch = st.session_state.selected_chapter_name
                    sess = st.session_state.inline_session_select
                    assignments = list(templates.get(ch, {}).get(sess, {}).keys())
                    if assignments:
                        ass = assignments[0]
                        data = templates[ch][sess][ass]
                        st.session_state.selected_session_name = sess
                        st.session_state.selected_assignment_name = ass
                        st.session_state.assignment_val = data["assignment"]
                        st.session_state.criteria_val = data["criteria"]

                selected_session = st.selectbox(
                    "Session / Buổi học:",
                    sessions,
                    index=sel_session_idx,
                    key="inline_session_select",
                    on_change=_on_session_change,
                )
                
                # 3. Assignment selection
                sess_name = st.session_state.get("selected_session_name") or (sessions[0] if sessions else "")
                assignments = list(templates.get(ch_name, {}).get(sess_name, {}).keys()) if sess_name else []
                sel_ass_idx = assignments.index(st.session_state.selected_assignment_name) if st.session_state.get("selected_assignment_name") in assignments else 0
                
                def _on_assignment_change():
                    ch = st.session_state.selected_chapter_name
                    sess = st.session_state.selected_session_name
                    ass = st.session_state.inline_assignment_select
                    data = templates.get(ch, {}).get(sess, {}).get(ass, {})
                    if data:
                        st.session_state.selected_assignment_name = ass
                        st.session_state.assignment_val = data["assignment"]
                        st.session_state.criteria_val = data["criteria"]

                selected_assignment = st.selectbox(
                    "Bài tập:",
                    assignments,
                    index=sel_ass_idx,
                    key="inline_assignment_select",
                    on_change=_on_assignment_change,
                )
            else:
                st.warning("Thư viện mẫu trống. Hãy thêm đề bài mới.")

            st.markdown("---")
            repo_url = st.text_input(
                "GitHub URL:",
                placeholder="https://github.com/username/repository",
                key="grader_repo_url"
            )
            # --- Render Selected Exercise Info ---
            if st.session_state.get("selected_chapter_name"):
                _sel_assignment = st.session_state.selected_assignment_name

                st.markdown(
                    f"""
                    <div style="background-color: var(--secondary-background-color); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); margin-top: 10px; margin-bottom: 5px; font-size: 0.9rem;">
                        📌 <b>Bài tập:</b> {_sel_assignment}
                    </div>
                    """,
                    unsafe_allow_html=True
                )
            else:
                st.warning("Vui lòng chọn bài tập từ thư viện mẫu.")
                
            execute_trigger = st.button(
                "🚀 Chấm điểm", type="primary", use_container_width=True
            )

        with col_monitor:
            st.subheader("Kết quả chấm điểm")
            if not execute_trigger:
                st.markdown(
                    """
                    <div class="info-card" style="padding: 20px; font-size: 0.9rem;">
                        Nhập link GitHub và nhấn <b>"Chấm điểm"</b> để bắt đầu.
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
            else:
                assignment_val = st.session_state.get("assignment_val", "")
                criteria_val = st.session_state.get("criteria_val", "")
                if not repo_url or not assignment_val or not criteria_val:
                    st.error("Vui lòng nhập GitHub URL và chọn bài tập mẫu.")
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
                                        f"📦 Tải ZIP archive (nhánh `{branch}`)..."
                                    )
                                elif step == "fallback_start":
                                    log.write(
                                        "⚠️ Archive không khả dụng — chuyển sang tải từng file..."
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
                        # Check cache first
                        cached_report = get_cached_report(
                            assignment_val,
                            criteria_val,
                            extracted_payload["content"],
                        )

                        if cached_report:
                            # Cache HIT → display instantly
                            st.success(
                                "⚡ **Cache HIT** — Kết quả được lấy từ bộ nhớ đệm "
                                "(cùng đề bài, tiêu chí và mã nguồn đã chấm trước đó)."
                            )
                            st.markdown(cached_report)
                            score = parse_score(cached_report)
                            if score:
                                st.markdown("### 🏆 Kết quả điểm số")
                                st.metric(
                                    label="Tổng điểm đánh giá",
                                    value=f"{score} / 100",
                                )
                                st.markdown("---")
                        else:
                            # Cache MISS → call AI
                            ai_config = get_ai_config()
                            display_name = provider_display_name(ai_config)

                            # Create placeholders for clean layout: status box first, then streaming report and score below it
                            status_placeholder = st.empty()
                            report_placeholder = st.empty()
                            score_placeholder = st.empty()
                            full_report = ""

                            with status_placeholder:
                                with st.status(
                                    "🤖 AI đang chấm điểm...",
                                    expanded=True,
                                ) as ai_status:
                                    try:
                                        ai_engine = AIService(config=ai_config)
                                        st.write("Đang phân tích mã nguồn và khởi chạy AI...")

                                        _last_render = time.monotonic()
                                        _RENDER_INTERVAL = 0.15  # seconds

                                        for chunk in ai_engine.generate_grading_report_stream(
                                            assignment_val,
                                            criteria_val,
                                            extracted_payload["content"],
                                        ):
                                            full_report += chunk
                                            now = time.monotonic()
                                            if now - _last_render >= _RENDER_INTERVAL:
                                                report_placeholder.markdown(full_report + "▌")
                                                _last_render = now

                                        # Final render cleanup (remove cursor)
                                        report_placeholder.markdown(full_report)

                                        # Save to cache for future lookups
                                        save_cached_report(
                                            assignment_val,
                                            criteria_val,
                                            extracted_payload["content"],
                                            full_report,
                                        )

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
                                        full_report = ""

                            # Render score metric outside the status box
                            if full_report:
                                score = parse_score(full_report)
                                if score:
                                    with score_placeholder.container():
                                        st.markdown("### 🏆 Kết quả điểm số")
                                        st.metric(
                                            label="Tổng điểm đánh giá",
                                            value=f"{score} / 100",
                                        )
                                        st.markdown("---")

    with tab_manager:
        from core.exercise_service import ExerciseService
        if ExerciseService.get_source() == "api":
            st.warning("⚠️ Hệ thống hiện tại đang sử dụng bài tập từ nguồn REST API. Việc Thêm/Sửa/Xóa dưới đây sẽ chỉ sửa đổi bộ nhớ đệm cục bộ và có thể bị ghi đè khi đồng bộ lại từ API.")
            
        if st.session_state.get("templates_crud_success"):
            st.success(st.session_state.templates_crud_success)
            del st.session_state.templates_crud_success
            
        col_btn1, col_btn2, col_btn3, col_btn4 = st.columns(4)
        with col_btn1:
            if st.button("➕ Thêm mới", use_container_width=True):
                show_add_assignment_dialog(templates)
        with col_btn2:
            if st.button("✏️ Chỉnh sửa", use_container_width=True):
                show_edit_assignment_dialog(templates)
        with col_btn3:
            if st.button("🗑️ Xóa", use_container_width=True):
                show_delete_assignment_dialog(templates)
        with col_btn4:
            if st.button("📁 Sao lưu / Khôi phục", use_container_width=True):
                show_backup_restore_dialog(templates)

        st.markdown('<div class="manager-section">', unsafe_allow_html=True)
        st.subheader("Danh sách bài tập")
        if templates:
            for ch_name, sessions in templates.items():
                with st.expander(f"📁 {ch_name}", expanded=True):
                    for sess_name, ass_dict in sessions.items():
                        st.markdown(f"##### 🔹 {sess_name}")
                        for ass_name, ass_data in ass_dict.items():
                            with st.expander(f"📄 {ass_name}", expanded=False):
                                st.markdown("**Đề bài:**")
                                st.write(ass_data.get("assignment", ""))
                                st.markdown("**Tiêu chí:**")
                                st.write(ass_data.get("criteria", ""))
                        st.markdown("---")
        else:
            st.info("Thư viện trống. Hãy thêm đề bài mới hoặc khôi phục.")
        st.markdown('</div>', unsafe_allow_html=True)

    # ══════════════════════════════════════════════════════════════════
    # TAB 3: AI SYSTEM SETTINGS
    # ══════════════════════════════════════════════════════════════════
    with tab_settings:
        col_ai, col_files = st.columns([1, 1])
        
        with col_ai:
            st.subheader("Cấu hình AI")
            
            if "settings_provider_select" not in st.session_state:
                st.session_state.settings_provider_select = active_config.get("provider", "gemini")
            provider = st.selectbox(
                "Nhà cung cấp (Provider)",
                ["gemini", "local", "custom", "deepseek", "openrouter"],
                key="settings_provider_select",
            )
            
            # Initialize other fields with safe config fallbacks
            local_model_name = active_config.get("local_model_name", Settings.LOCAL_MODEL_NAME)
            ollama_base_url = active_config.get("ollama_base_url", Settings.OLLAMA_BASE_URL)
            gemini_api_key = active_config.get("gemini_api_key", "")
            gemini_model_name = active_config.get("gemini_model_name", Settings.DEFAULT_MODEL)
            deepseek_api_key = active_config.get("deepseek_api_key", "")
            openrouter_api_key = active_config.get("openrouter_api_key", "")
            openrouter_model_name = active_config.get("openrouter_model_name", getattr(Settings, "OPENROUTER_MODEL_NAME", "qwen/qwen3-coder:free"))
            custom_api_key = active_config.get("custom_api_key", "")
            custom_api_base_url = active_config.get("custom_api_base_url", "")
            custom_model_name = active_config.get("custom_model_name", Settings.DEFAULT_MODEL)

            if provider == "local":
                local_model_name = st.text_input(
                    "Tên local model",
                    value=active_config.get("local_model_name", Settings.LOCAL_MODEL_NAME),
                    key="settings_local_model_name",
                )
                ollama_base_url = st.text_input(
                    "Ollama URL",
                    value=active_config.get("ollama_base_url", Settings.OLLAMA_BASE_URL),
                    key="settings_ollama_base_url",
                )
            elif provider == "gemini":
                gemini_api_key = st.text_input(
                    "API Key (Gemini)",
                    value=active_config.get("gemini_api_key", ""),
                    type="password",
                    key="settings_gemini_api_key",
                )
                saved_model = active_config.get("gemini_model_name", Settings.DEFAULT_MODEL)
                if "settings_gemini_model_select" not in st.session_state:
                    st.session_state.settings_gemini_model_select = saved_model if saved_model in Settings.GEMINI_MODELS else Settings.GEMINI_MODELS[0]
                gemini_model_name = st.selectbox(
                    "Model Gemini",
                    Settings.GEMINI_MODELS,
                    key="settings_gemini_model_select",
                )
            elif provider == "deepseek":
                deepseek_api_key = st.text_input(
                    "API Key (DeepSeek)",
                    value=active_config.get("deepseek_api_key", ""),
                    type="password",
                    key="settings_deepseek_api_key",
                )
            elif provider == "openrouter":
                openrouter_api_key = st.text_input(
                    "API Key (OpenRouter)",
                    value=active_config.get("openrouter_api_key", ""),
                    type="password",
                    key="settings_openrouter_api_key",
                )
                saved_model = active_config.get("openrouter_model_name", getattr(Settings, "OPENROUTER_MODEL_NAME", "qwen/qwen3-coder:free"))
                openrouter_models = getattr(Settings, "OPENROUTER_MODELS", ["qwen/qwen3-coder:free", "openrouter/free"])
                if "settings_openrouter_model_select" not in st.session_state:
                    st.session_state.settings_openrouter_model_select = saved_model if saved_model in openrouter_models else openrouter_models[0]
                openrouter_model_name = st.selectbox(
                    "Model OpenRouter",
                    openrouter_models,
                    key="settings_openrouter_model_select",
                )
            elif provider == "custom":
                custom_api_key = st.text_input(
                    "API Key",
                    value=active_config.get("custom_api_key", ""),
                    type="password",
                    key="settings_custom_api_key",
                )
                custom_api_base_url = st.text_input(
                    "Base URL",
                    value=active_config.get("custom_api_base_url", ""),
                    key="settings_custom_api_base_url",
                )
                custom_model_name = st.text_input(
                    "Model",
                    value=active_config.get("custom_model_name", Settings.DEFAULT_MODEL),
                    key="settings_custom_model_name",
                )

            st.markdown("---")
            st.subheader("Độ dài nhận xét")
            grading_max_words = st.number_input(
                "Số từ tối đa cho phần Nhận xét (tối thiểu 10):",
                min_value=10,
                max_value=2000,
                value=int(active_config.get("grading_max_words", Settings.GRADING_MAX_WORDS)),
                step=10,
                key="settings_grading_max_words",
            )

            st.markdown("---")
            st.subheader("GitHub Token (Tùy chọn)")
            github_token = st.text_input(
                "GitHub Access Token",
                value=active_config.get("github_token", ""),
                type="password",
                key="settings_github_token",
            )

            st.markdown("---")
            st.subheader("⚙️ Cấu hình hệ thống & Giới hạn")
            col_sys1, col_sys2 = st.columns(2)
            with col_sys1:
                grading_max_score = st.number_input(
                    "Thang điểm tối đa:",
                    min_value=1,
                    max_value=1000,
                    value=int(active_config.get("grading_max_score", Settings.GRADING_MAX_SCORE)),
                    step=5,
                    key="settings_grading_max_score",
                )
                grading_language = st.text_input(
                    "Ngôn ngữ nhận xét:",
                    value=active_config.get("grading_language", Settings.GRADING_LANGUAGE),
                    key="settings_grading_language",
                )
                grading_cache_enabled = st.checkbox(
                    "Bật bộ nhớ đệm (Cache)",
                    value=bool(active_config.get("grading_cache_enabled", Settings.GRADING_CACHE_ENABLED)),
                    key="settings_grading_cache_enabled",
                )
                grading_cache_ttl = st.number_input(
                    "Thời gian lưu cache (phút):",
                    min_value=1,
                    max_value=10080,
                    value=int(active_config.get("grading_cache_ttl", Settings.GRADING_CACHE_TTL_MINUTES)),
                    step=10,
                    key="settings_grading_cache_ttl",
                )
            with col_sys2:
                max_project_files = st.number_input(
                    "Số file mã nguồn tối đa:",
                    min_value=1,
                    max_value=10000,
                    value=int(active_config.get("max_project_files", Settings.MAX_PROJECT_FILES)),
                    step=10,
                    key="settings_max_project_files",
                )
                max_project_chars = st.number_input(
                    "Số ký tự tối đa:",
                    min_value=1000,
                    max_value=10000000,
                    value=int(active_config.get("max_project_chars", Settings.MAX_PROJECT_CHARS)),
                    step=10000,
                    key="settings_max_project_chars",
                )
                local_data_root = st.text_input(
                    "Thư mục dữ liệu cục bộ:",
                    value=active_config.get("local_data_root", Settings.LOCAL_DATA_ROOT),
                    key="settings_local_data_root",
                )

            st.markdown("---")
            st.subheader("Cấu hình nguồn bài tập")
            if "settings_exercise_source" not in st.session_state:
                st.session_state.settings_exercise_source = active_config.get("exercise_source", "local")
            exercise_source = st.selectbox(
                "Nguồn bài tập",
                ["local", "api"],
                format_func=lambda x: "Cục bộ (templates.json)" if x == "local" else "API (Tải qua REST API)",
                key="settings_exercise_source"
            )
            
            exercise_api_url = ""
            exercise_api_token = ""
            if exercise_source == "api":
                exercise_api_url = st.text_input(
                    "API URL nạp bài tập",
                    value=active_config.get("exercise_api_url", ""),
                    key="settings_exercise_api_url"
                )
                exercise_api_token = st.text_input(
                    "API Token (Tùy chọn)",
                    value=active_config.get("exercise_api_token", ""),
                    type="password",
                    key="settings_exercise_api_token"
                )
                
                # Fetch button
                if st.button("🔄 Đồng bộ bài tập từ API"):
                    with st.spinner("Đang tải dữ liệu từ API..."):
                        try:
                            from core.exercise_service import ExerciseService
                            ExerciseService.sync_from_api_to_local(exercise_api_url, exercise_api_token)
                            st.success("✅ Đồng bộ bài tập từ API thành công!")
                            st.rerun()
                        except Exception as e:
                            st.error(f"Lỗi đồng bộ từ API: {str(e)}")
            else:
                exercise_api_url = active_config.get("exercise_api_url", "")
                exercise_api_token = active_config.get("exercise_api_token", "")

            # Auto-sync config to session state on change
            new_settings_config = {
                "provider": provider,
                "gemini_api_key": gemini_api_key,
                "gemini_model_name": gemini_model_name,
                "deepseek_api_key": deepseek_api_key,
                "deepseek_api_base_url": "https://api.deepseek.com",
                "deepseek_model_name": "deepseek-chat",
                "openrouter_api_key": openrouter_api_key,
                "openrouter_api_base_url": "https://openrouter.ai/api/v1",
                "openrouter_model_name": openrouter_model_name,
                "custom_api_key": custom_api_key,
                "custom_api_base_url": custom_api_base_url,
                "custom_model_name": custom_model_name,
                "local_model_name": local_model_name,
                "ollama_base_url": ollama_base_url,
                "github_token": github_token,
                "exercise_source": exercise_source,
                "exercise_api_url": exercise_api_url,
                "exercise_api_token": exercise_api_token,
                "grading_max_words": int(grading_max_words),
                "grading_max_score": int(grading_max_score),
                "grading_language": grading_language,
                "grading_cache_enabled": bool(grading_cache_enabled),
                "grading_cache_ttl": int(grading_cache_ttl),
                "max_project_files": int(max_project_files),
                "max_project_chars": int(max_project_chars),
                "local_data_root": local_data_root,
            }
            if st.session_state.get("ai_config") != new_settings_config:
                try:
                    # Validate before saving
                    Settings.validate(
                        provider=provider,
                        api_key=(
                            gemini_api_key if provider == "gemini" 
                            else (deepseek_api_key if provider == "deepseek" 
                            else (openrouter_api_key if provider == "openrouter"
                            else (custom_api_key if provider == "custom" else "")))
                        ),
                        api_base_url=custom_api_base_url if provider == "custom" else "",
                    )
                    st.session_state.ai_config = new_settings_config
                    from core.sync_service import sync_config_to_disk
                    sync_config_to_disk(new_settings_config)
                    st.success("✅ Đã cập nhật và đồng bộ cấu hình AI thành công!")
                except ValueError as ve:
                    st.error(f"Cấu hình không hợp lệ: {str(ve)}")

        with col_files:
            st.subheader("Nhập / Xuất cấu hình")
            
            uploaded_config_file = st.file_uploader(
                "Nạp cấu hình (config.json)", 
                type=["json"], 
                key="settings_config_uploader"
            )
            
            st.button(
                "Áp dụng cấu hình", 
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
                    
            st.download_button(
                label="Tải xuống config.json",
                data=json.dumps(active_config, ensure_ascii=False, indent=2),
                file_name="config.json",
                mime="application/json",
                use_container_width=True
            )

        # ── Cache Management Section ─────────────────────────────────
        st.markdown("---")
        st.subheader("Bộ nhớ đệm (Cache)")
        cache_stats = get_cache_stats()
        col_cache_info, col_cache_action = st.columns([2, 1])
        with col_cache_info:
            st.info(
                f"Đã lưu: **{cache_stats['total_entries']}** kết quả | "
                f"TTL: **{Settings.GRADING_CACHE_TTL_MINUTES} phút**"
            )
        with col_cache_action:
            if cache_stats["total_entries"] > 0:
                if st.button("Xóa cache", use_container_width=True):
                    clear_cache()
                    st.success("✅ Đã xóa toàn bộ cache!")
                    st.rerun()



if __name__ == "__main__":
    main()
