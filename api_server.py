import os
os.environ["PYTHONDONTWRITEBYTECODE"] = "1"
import traceback
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional

from core.settings import Settings
from core.github_service import GitHubService
from core.ai_service import AIService
from core.exercise_service import ExerciseService
from core.storage_service import get_ai_config, provider_display_name
from core.cache_service import get_cached_report, save_cached_report
from utils.helpers import parse_score

app = FastAPI(
    title="AI GitHub Grader API Backend",
    description="API backend for Chrome/Edge Extension",
    version=Settings.APP_VERSION,
)

# Enable CORS for all origins so chrome extension can access it
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GradeRequest(BaseModel):
    repo_url: str = Field(..., examples=["https://github.com/octocat/hello-world"])
    chapter: Optional[str] = Field(None, examples=["Chương 1"])
    session: Optional[str] = Field(None, examples=["Session 1"])
    assignment_name: Optional[str] = Field(None, examples=["Bài tập 1"])
    custom_assignment: Optional[str] = Field(None, description="Đề bài tùy chỉnh (nếu có)")
    custom_criteria: Optional[str] = Field(None, description="Tiêu chí tùy chỉnh (nếu có)")

@app.get("/api/config")
def get_config():
    """Return active provider configuration (safe public fields)."""
    try:
        config = get_ai_config()
        return {
            "app_version": Settings.APP_VERSION,
            "provider": config.get("provider", "gemini"),
            "provider_display": provider_display_name(config),
            "exercise_source": config.get("exercise_source", "local"),
            "exercise_api_url": config.get("exercise_api_url", ""),
            "has_github_token": bool(config.get("github_token")),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tải cấu hình: {str(e)}")

@app.get("/api/exercises")
def get_exercises():
    """Return list of exercise templates."""
    try:
        templates = ExerciseService.load_templates()
        return templates
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy danh sách bài tập: {str(e)}")

@app.post("/api/grade")
def grade_assignment(request: GradeRequest):
    """Fetch GitHub repo and run AI grading."""
    repo_url = request.repo_url.strip()
    if not repo_url:
        raise HTTPException(status_code=400, detail="Thiếu GitHub Repository URL.")

    # 1. Resolve assignment description and criteria
    assignment_val = ""
    criteria_val = ""

    if request.custom_assignment and request.custom_criteria:
        assignment_val = request.custom_assignment
        criteria_val = request.custom_criteria
    else:
        # Load from templates
        if not request.chapter or not request.session or not request.assignment_name:
            raise HTTPException(
                status_code=400,
                detail="Cần cung cấp đầy đủ thông tin bài tập (chapter, session, assignment_name) hoặc đề bài tùy chỉnh."
            )
        
        templates = ExerciseService.load_templates()
        try:
            chapter_data = templates.get(request.chapter, {})
            session_data = chapter_data.get(request.session, {})
            ass_data = session_data.get(request.assignment_name, {})
            
            if not ass_data:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Không tìm thấy bài tập '{request.assignment_name}' trong hệ thống."
                )
            
            assignment_val = ass_data.get("assignment", "")
            criteria_val = ass_data.get("criteria", "")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Lỗi tìm kiếm bài tập: {str(e)}")

    if not assignment_val or not criteria_val:
        raise HTTPException(status_code=400, detail="Không lấy được nội dung đề bài hoặc tiêu chí chấm điểm.")

    # 2. Fetch code from GitHub
    try:
        github_engine = GitHubService()
        extracted_payload = github_engine.get_repo_contents(repo_url, on_progress=None)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Lỗi tải mã nguồn từ GitHub: {str(e)}"
        )

    # 3. Grade using cache or AI
    try:
        report = get_cached_report(
            assignment_val,
            criteria_val,
            extracted_payload["content"]
        )
        
        cache_hit = True
        if not report:
            cache_hit = False
            ai_config = get_ai_config()
            ai_engine = AIService(config=ai_config)
            report = ai_engine.generate_grading_report(
                assignment_val,
                criteria_val,
                extracted_payload["content"]
            )
            save_cached_report(
                assignment_val,
                criteria_val,
                extracted_payload["content"],
                report
            )
            
        score = parse_score(report)
        return {
            "success": True,
            "cache_hit": cache_hit,
            "total_files": extracted_payload.get("total_files", 0),
            "score": score,
            "report": report,
        }
    except Exception as e:
        # Log error trace for debugging
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi trong quá trình chấm điểm AI: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("api_server:app", host="0.0.0.0", port=port, reload=True)
