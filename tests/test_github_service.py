import io
import unittest
import zipfile
from unittest.mock import Mock, patch

from services.github_service import GitHubService


class GitHubServiceTest(unittest.TestCase):
    @patch("services.github_service.requests.get")
    def test_uses_default_branch_when_main_and_master_fail(self, mock_get):
        service = GitHubService()

        def side_effect(url, headers=None, timeout=None):
            if url == "https://api.github.com/repos/octocat/hello-world":
                return Mock(status_code=200, json=lambda: {"default_branch": "develop"})
            if (
                url
                == "https://api.github.com/repos/octocat/hello-world/git/trees/develop?recursive=1"
            ):
                return Mock(
                    status_code=200,
                    json=lambda: {"tree": [{"path": "app.py", "type": "blob"}]},
                )
            if (
                url
                == "https://raw.githubusercontent.com/octocat/hello-world/develop/app.py"
            ):
                return Mock(status_code=200, text="print('hello')")
            return Mock(status_code=404, json=lambda: {})

        mock_get.side_effect = side_effect

        result = service.get_repo_contents("https://github.com/octocat/hello-world")

        self.assertEqual(result["total_files"], 1)
        self.assertIn("FILE PATH: app.py", result["content"])

    @patch("services.github_service.requests.get")
    def test_falls_back_to_archive_when_tree_api_fails(self, mock_get):
        service = GitHubService()

        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as zf:
            zf.writestr("session19_bt3-main/app.py", "print('hello')")
        archive_bytes = buffer.getvalue()

        def side_effect(url, headers=None, timeout=None):
            if url == "https://api.github.com/repos/octocat/hello-world":
                return Mock(status_code=200, json=lambda: {"default_branch": "main"})
            if (
                url
                == "https://api.github.com/repos/octocat/hello-world/git/trees/main?recursive=1"
            ):
                return Mock(status_code=404, json=lambda: {})
            if (
                url
                == "https://api.github.com/repos/octocat/hello-world/contents?ref=main"
            ):
                return Mock(status_code=404, json=lambda: {})
            if (
                url
                == "https://codeload.github.com/octocat/hello-world/zip/refs/heads/main"
            ):
                return Mock(status_code=200, content=archive_bytes)
            return Mock(status_code=404, json=lambda: {})

        mock_get.side_effect = side_effect

        result = service.get_repo_contents("https://github.com/octocat/hello-world")

        self.assertEqual(result["total_files"], 1)
        self.assertIn("app.py", result["content"])

    @patch("services.github_service.requests.get")
    def test_progress_callback_is_called(self, mock_get):
        service = GitHubService()
        progress_steps = []

        def track_progress(step, **details):
            progress_steps.append(step)

        def side_effect(url, headers=None, timeout=None):
            if url == "https://api.github.com/repos/octocat/hello-world":
                return Mock(status_code=200, json=lambda: {"default_branch": "main"})
            if (
                url
                == "https://api.github.com/repos/octocat/hello-world/git/trees/main?recursive=1"
            ):
                return Mock(
                    status_code=200,
                    json=lambda: {"tree": [{"path": "app.py", "type": "blob"}]},
                )
            if (
                url
                == "https://raw.githubusercontent.com/octocat/hello-world/main/app.py"
            ):
                return Mock(status_code=200, text="print('hello')")
            return Mock(status_code=404, json=lambda: {})

        mock_get.side_effect = side_effect

        service.get_repo_contents(
            "https://github.com/octocat/hello-world", on_progress=track_progress
        )

        self.assertIn("parse_url", progress_steps)
        self.assertIn("detect_branch", progress_steps)
        self.assertIn("done", progress_steps)


if __name__ == "__main__":
    unittest.main()
