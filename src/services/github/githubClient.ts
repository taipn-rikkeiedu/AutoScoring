import { FastApiClient, GitHubFetchResponsePayload } from '~/src/services/api';

/**
 * GitHubService (Frontend API Client)
 * Chuyển toàn bộ việc tải repo ZIP và giải nén mã nguồn xuống Backend FastAPI Server.
 * Phía Frontend chỉ gọi API để nhận danh sách file và nội dung code đã xử lý.
 */
export class GitHubService {
  private token: string;
  private ignoreItems: string[];

  constructor(token = "", customIgnoreItems: string[] | null = null) {
    this.token = token ? token.trim() : "";
    this.ignoreItems = customIgnoreItems || [];
  }

  /**
   * Tải nội dung repository thông qua Backend API
   */
  async getRepoContents(
    repoUrl: string, 
    onProgress: (msg: string) => void = () => {},
    baseUrl?: string,
    apiKey?: string
  ): Promise<{ content: string; totalFiles: number; fileList: string[] }> {
    onProgress("Đang yêu cầu Backend tải và giải nén mã nguồn từ GitHub...");

    const res: GitHubFetchResponsePayload = await FastApiClient.fetchGitHubRepo(
      repoUrl,
      this.token || undefined,
      undefined,
      this.ignoreItems.length > 0 ? this.ignoreItems : undefined,
      baseUrl,
      apiKey
    );

    return {
      content: res.code_content,
      totalFiles: res.total_files,
      fileList: res.file_list
    };
  }
}
