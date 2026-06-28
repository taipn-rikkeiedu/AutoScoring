import re
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

TEMPLATES = {
    "☕ Java Spring Boot (Security & JWT)": {
        "assignment": "Viết một ứng dụng Spring Boot tích hợp Spring Security và JWT. Yêu cầu cấu hình đầy đủ SecurityConfig, JwtTokenProvider, JwtAuthenticationFilter, và một tác vụ @Scheduled để tự động dọn dẹp các token đã hết hạn (purging expired refresh tokens) trong cơ sở dữ liệu sau mỗi 6 giờ.",
        "criteria": "1. Cấu hình Spring Security chính xác, phân quyền các endpoint hợp lý. (40 điểm)\n2. Viết tác vụ dọn dẹp token hết hạn dùng @Scheduled và @EnableScheduling chạy đúng tần suất. (30 điểm)\n3. Tổ chức cấu trúc thư mục chuẩn, sử dụng các annotation Spring Boot hợp lý. (30 điểm)"
    },
    "🐍 Python OOP (Quản lý Học sinh & File)": {
        "assignment": "Viết chương trình Python quản lý học sinh sử dụng lập trình hướng đối tượng (OOP). Yêu cầu định nghĩa class Student, lưu trữ danh sách học sinh vào file CSV hoặc JSON, hỗ trợ các chức năng: thêm học sinh mới, hiển thị danh sách học sinh, tính điểm trung bình và phân loại học lực học sinh.",
        "criteria": "1. Áp dụng đúng lập trình hướng đối tượng (OOP), định nghĩa class rõ ràng. (40 điểm)\n2. Thực hiện đọc/ghi file CSV/JSON chính xác, xử lý ngoại lệ tốt khi thao tác file. (30 điểm)\n3. Thuật toán tính điểm trung bình, xếp loại học sinh đúng logic và code clean. (30 điểm)"
    },
    "🌐 Frontend HTML/CSS/JS (Landing Page)": {
        "assignment": "Thiết kế một trang landing page giới thiệu sản phẩm có responsive layout (tương thích mọi màn hình). Trang web cần sử dụng CSS Grid/Flexbox, có hiệu ứng hover mượt mà và sử dụng JavaScript để tạo menu ẩn/hiển thị (hamburger menu) trên mobile.",
        "criteria": "1. Bố cục HTML5 ngữ nghĩa và CSS Grid/Flexbox responsive tốt trên di động. (40 điểm)\n2. Menu mobile hoạt động trơn tru bằng JavaScript thuần (Vanilla JS). (30 điểm)\n3. Thiết kế thẩm mỹ, sử dụng hiệu ứng hover và transition đẹp mắt. (30 điểm)"
    }
}


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
        st.caption("Nhấp chọn để tự động điền đề bài và tiêu chí mẫu:")
        for name, data in TEMPLATES.items():
            if st.button(name, use_container_width=True):
                st.session_state.assignment_val = data["assignment"]
                st.session_state.criteria_val = data["criteria"]
                st.rerun()

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
