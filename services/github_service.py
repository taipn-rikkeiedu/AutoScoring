import io
import zipfile
import requests
import xml.etree.ElementTree as ET
from urllib.parse import quote
from config.settings import Settings


class GitHubService:
    def __init__(self):
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "AutoScoring/1.0",
        }
        if Settings.GITHUB_TOKEN:
            self.headers["Authorization"] = f"token {Settings.GITHUB_TOKEN}"

    def _parse_url(self, repo_url: str) -> tuple[str, str]:
        # Validate that the domain is strictly github.com
        clean_input = repo_url.strip().lower()
        if not ("github.com" in clean_input or clean_input.startswith("git@github.com:")):
            raise ValueError("Chỉ chấp nhận các liên kết từ tên miền chính thức github.com")
            
        try:
            clean_url = repo_url.strip().rstrip("/")
            if clean_url.startswith("git@github.com:"):
                clean_url = clean_url.replace("git@github.com:", "https://github.com/")
            if clean_url.startswith("https://github.com/"):
                clean_url = clean_url[len("https://github.com/") :]
            elif clean_url.startswith("http://github.com/"):
                clean_url = clean_url[len("http://github.com/") :]
            clean_url = clean_url.removesuffix(".git")
            parts = [part for part in clean_url.split("/") if part]
            if len(parts) < 2:
                raise ValueError()
            return parts[0], parts[1]
        except Exception as e:
            raise ValueError(
                str(e) if "tên miền" in str(e) else "Đường dẫn sai. Định dạng chuẩn: https://github.com/user/repo-name"
            )

    def _parse_docx_bytes(self, content_bytes: bytes) -> str:
        try:
            with zipfile.ZipFile(io.BytesIO(content_bytes)) as docx:
                xml_content = docx.read("word/document.xml")
                root = ET.fromstring(xml_content)
                ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
                paragraphs = []
                for p in root.findall(".//w:p", ns):
                    text_parts = [t.text for t in p.findall(".//w:t", ns) if t.text]
                    if text_parts:
                        paragraphs.append("".join(text_parts))
                return "\n".join(paragraphs)
        except Exception as e:
            return f"\n[Lỗi đọc file docx: {str(e)}]\n"

    def _get_default_branch(self, username: str, repo: str) -> str | None:
        api_url = f"https://api.github.com/repos/{username}/{repo}"
        response = requests.get(api_url, headers=self.headers, timeout=30)
        if response.status_code == 200:
            data = response.json()
            branch = data.get("default_branch")
            if isinstance(branch, str) and branch.strip():
                return branch.strip()
        return None

    def _list_tree_files(self, username: str, repo: str, branch: str) -> list[dict]:
        encoded_branch = quote(branch, safe="")
        api_url = (
            f"https://api.github.com/repos/{username}/{repo}/git/trees/"
            f"{encoded_branch}?recursive=1"
        )
        response = requests.get(api_url, headers=self.headers, timeout=30)
        if response.status_code != 200:
            return []

        data = response.json()
        return data.get("tree", []) if isinstance(data, dict) else []

    def _list_repo_contents(self, username: str, repo: str, branch: str) -> list[dict]:
        api_url = f"https://api.github.com/repos/{username}/{repo}/contents?ref={quote(branch, safe='')}"
        response = requests.get(api_url, headers=self.headers, timeout=30)
        if response.status_code != 200:
            return []

        data = response.json()
        if not isinstance(data, list):
            return []
        return data

    def _download_archive(
        self, username: str, repo: str, branch: str, on_progress=None
    ) -> str | None:
        archive_url = (
            f"https://codeload.github.com/{username}/{repo}/zip/refs/heads/{branch}"
        )
        response = requests.get(archive_url, headers=self.headers, timeout=60)
        if response.status_code != 200:
            return None
        try:
            with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
                names = sorted(archive.namelist())

                # Detect the common top-level prefix added by GitHub
                # (e.g. "repo-main/") so we can strip it for cleaner paths.
                prefix = ""
                if names and names[0].endswith("/"):
                    prefix = names[0]

                payload = ""
                processed_files = 0
                for name in names:
                    if not name.endswith(Settings.ALLOWED_EXTENSIONS):
                        continue
                    if any(ex_dir in name for ex_dir in Settings.EXCLUDED_DIRS):
                        continue
                    basename = name.split("/")[-1]
                    if basename in Settings.EXCLUDED_FILES:
                        continue
                    if name.endswith("/"):
                        continue
                    try:
                        if name.endswith(".docx"):
                            content = self._parse_docx_bytes(archive.read(name))
                        else:
                            content = archive.read(name).decode("utf-8")
                    except UnicodeDecodeError:
                        continue
                    # Strip top-level prefix for a clean path
                    display_path = name[len(prefix):] if prefix and name.startswith(prefix) else name
                    payload += "\n\n=============================================\n"
                    payload += f"FILE PATH: {display_path}\n"
                    payload += "=============================================\n"
                    payload += content
                    processed_files += 1
                    if processed_files > Settings.MAX_PROJECT_FILES:
                        raise ValueError(
                            f"Dự án quá lớn! Số lượng tập tin mã nguồn vượt quá giới hạn {Settings.MAX_PROJECT_FILES}."
                        )
                    if len(payload) > Settings.MAX_PROJECT_CHARS:
                        raise ValueError(
                            f"Dự án quá lớn! Dung lượng mã nguồn vượt quá giới hạn {Settings.MAX_PROJECT_CHARS} ký tự."
                        )
                    if on_progress:
                        on_progress(
                            "file_extracted",
                            file_path=display_path,
                            current=processed_files,
                        )
                if processed_files == 0:
                    return None
                return payload
        except zipfile.BadZipFile:
            return None

    def get_repo_contents(self, repo_url: str, on_progress=None) -> dict:
        """Fetch repository source code with optional progress callback.

        The optimised flow tries to download the entire repository as a
        single ZIP archive first (1 HTTP request) and only falls back to
        the per-file approach when the archive is unavailable.

        Args:
            repo_url: GitHub repository URL.
            on_progress: Optional callback ``fn(step, **details)`` called at
                each major step so the caller can update the UI in real time.
                Supported step names:
                  - ``"parse_url"``: URL parsed → ``username``, ``repo``
                  - ``"detect_branch"``: querying default branch → ``branch`` or None
                  - ``"try_archive"``: trying ZIP archive download → ``branch``
                  - ``"file_extracted"``: file extracted from ZIP → ``file_path``, ``current``
                  - ``"try_tree_api"``: (fallback) trying Git Trees API → ``branch``, ``success``
                  - ``"try_contents_api"``: (fallback) trying Contents API → ``branch``, ``success``
                  - ``"download_files"``: (fallback) downloading individual files → ``current``, ``total``
                  - ``"file_downloaded"``: (fallback) single file fetched → ``file_path``, ``current``
                  - ``"done"``: finished → ``total_files``
        """
        _progress = on_progress or (lambda step, **kw: None)

        # --- Step 1: Parse URL ---
        username, repo = self._parse_url(repo_url)
        _progress("parse_url", username=username, repo=repo)

        # --- Step 2: Detect default branch ---
        _progress("detect_branch_start")
        default_branch = self._get_default_branch(username, repo)
        _progress(
            "detect_branch",
            branch=default_branch,
            note="từ GitHub API" if default_branch else "không tìm thấy, dùng fallback",
        )

        candidate_branches = []
        if default_branch:
            candidate_branches.append(default_branch)
        candidate_branches.extend(["main", "master"])

        seen_branches = set()
        branches_to_try = []
        for branch in candidate_branches:
            if branch and branch not in seen_branches:
                branches_to_try.append(branch)
                seen_branches.add(branch)

        # --- Step 3: Try ZIP archive download FIRST (fastest path) ---
        code_payload = ""
        processed_files = 0

        for branch in branches_to_try:
            _progress("try_archive", branch=branch)
            archive_payload = self._download_archive(
                username, repo, branch, on_progress=on_progress
            )
            if archive_payload:
                code_payload = archive_payload
                processed_files = code_payload.count("FILE PATH: ")
                _progress("done", total_files=processed_files)
                return {"total_files": processed_files, "content": code_payload}

        # --- Step 4 (FALLBACK): Tree API + individual file download ---
        _progress("fallback_start")

        tree_data = None
        detected_branch = None
        for branch in branches_to_try:
            _progress("try_tree_api", branch=branch)
            tree_data = self._list_tree_files(username, repo, branch)
            if tree_data:
                detected_branch = branch
                _progress("try_tree_api", branch=branch, success=True)
                break
            _progress("try_tree_api", branch=branch, success=False)

        if not tree_data:
            for branch in branches_to_try:
                _progress("try_contents_api", branch=branch)
                tree_data = self._list_repo_contents(username, repo, branch)
                if tree_data:
                    detected_branch = branch
                    _progress("try_contents_api", branch=branch, success=True)
                    break
                _progress("try_contents_api", branch=branch, success=False)

        if isinstance(tree_data, list):
            eligible = []
            for item in tree_data:
                if not isinstance(item, dict):
                    continue
                item_type = item.get("type")
                item_path = item.get("path", "")
                if item_type not in ("file", "blob") or not isinstance(item_path, str):
                    continue
                if not item_path.endswith(Settings.ALLOWED_EXTENSIONS):
                     continue
                if any(ex_dir in item_path for ex_dir in Settings.EXCLUDED_DIRS):
                     continue
                basename = item_path.split("/")[-1]
                if basename in Settings.EXCLUDED_FILES:
                     continue
                eligible.append(item)

            total_eligible = len(eligible)
            if total_eligible > Settings.MAX_PROJECT_FILES:
                raise ValueError(
                    f"Dự án quá lớn! Số lượng tập tin mã nguồn ({total_eligible}) vượt quá giới hạn {Settings.MAX_PROJECT_FILES}."
                )
            if total_eligible > 0:
                _progress("download_files", current=0, total=total_eligible)

            for item in eligible:
                item_path = item["path"]
                item_type = item.get("type")

                if item_type == "file":
                    download_url = item.get("download_url")
                    if not download_url:
                        continue
                    file_response = requests.get(
                        download_url, headers=self.headers, timeout=30
                    )
                elif item_type == "blob":
                    raw_url = (
                        f"https://raw.githubusercontent.com/{username}/{repo}/"
                        f"{quote(detected_branch, safe='')}/{quote(item_path, safe='/')}"
                    )
                    file_response = requests.get(
                        raw_url, headers=self.headers, timeout=30
                    )
                else:
                    continue

                if file_response.status_code == 200:
                    code_payload += (
                        "\n\n=============================================\n"
                    )
                    code_payload += f"FILE PATH: {item_path}\n"
                    code_payload += (
                        "=============================================\n"
                    )
                    if item_path.endswith(".docx"):
                        code_payload += self._parse_docx_bytes(file_response.content)
                    else:
                        code_payload += file_response.text
                    if len(code_payload) > Settings.MAX_PROJECT_CHARS:
                        raise ValueError(
                            f"Dự án quá lớn! Dung lượng mã nguồn vượt quá giới hạn {Settings.MAX_PROJECT_CHARS} ký tự."
                        )
                    processed_files += 1
                    _progress(
                        "file_downloaded",
                        file_path=item_path,
                        current=processed_files,
                        total=total_eligible,
                    )

        if processed_files == 0:
            raise RuntimeError(
                f"Không thể truy xuất dữ liệu từ GitHub cho repo {username}/{repo}."
            )

        _progress("done", total_files=processed_files)
        return {"total_files": processed_files, "content": code_payload}
