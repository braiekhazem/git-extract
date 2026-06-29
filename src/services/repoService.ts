import axios from "axios";
import { RepoType, RepoFile, RepoData, SavedRepo } from "../types/repo";

// Classify an API error into an i18n key so the UI can show an actionable message
// instead of a generic "repository not found".
export const classifyApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    // GitHub/GitLab return 403 (rate limit, often with x-ratelimit-remaining: 0)
    // or 429 (too many requests) when the unauthenticated quota is exhausted.
    if (status === 429) return "errors.rateLimit";
    if (status === 403) {
      const remaining = error.response?.headers?.["x-ratelimit-remaining"];
      if (remaining === undefined || remaining === "0") return "errors.rateLimit";
    }
    if (status === 404) return "errors.notFound";
    if (!error.response) return "errors.networkError";
  }
  return "errors.unknownError";
};

// Enhanced repository URL parser that handles more URL formats
export const parseRepoUrl = (
  url: string
): {
  owner: string;
  repo: string;
  type: RepoType;
  path?: string;
  branch?: string;
} | null => {
  try {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);

    if (pathParts.length < 2) {
      return null;
    }

    let type: RepoType;
    if (parsedUrl.hostname === "github.com") {
      type = "github";
    } else if (parsedUrl.hostname === "gitlab.com") {
      type = "gitlab";
    } else {
      return null;
    }

    const owner = pathParts[0];
    const repo = pathParts[1];

    // Check if URL points to a file or folder (has more than owner/repo in path)
    let filePath: string | undefined;
    let branch: string | undefined;

    if (pathParts.length > 2) {
      if (type === "github") {
        // GitHub URL patterns:
        // https://github.com/user/repo/blob/branch/file.js
        // https://github.com/user/repo/tree/branch/folder
        if (pathParts[2] === "blob" || pathParts[2] === "tree") {
          if (pathParts.length > 3) {
            branch = pathParts[3];
            if (pathParts.length > 4) {
              filePath = pathParts.slice(4).join("/");
            }
          }
        }
        // Handle other GitHub patterns like releases, issues, etc.
        else if (
          pathParts[2] === "releases" ||
          pathParts[2] === "issues" ||
          pathParts[2] === "pulls"
        ) {
          // These are not file/folder paths, ignore them
          filePath = undefined;
        }
        // Direct file/folder path without blob/tree
        else {
          filePath = pathParts.slice(2).join("/");
        }
      } else if (type === "gitlab") {
        // GitLab URL patterns:
        // https://gitlab.com/user/repo/-/blob/branch/file.js
        // https://gitlab.com/user/repo/-/tree/branch/folder
        if (pathParts[2] === "-" && pathParts.length > 3) {
          if (pathParts[3] === "blob" || pathParts[3] === "tree") {
            if (pathParts.length > 4) {
              branch = pathParts[4];
              if (pathParts.length > 5) {
                filePath = pathParts.slice(5).join("/");
              }
            }
          }
        }
        // Handle other GitLab patterns
        else if (pathParts[2] !== "-") {
          // This might be a direct path or other GitLab feature
          filePath = pathParts.slice(2).join("/");
        }
      }
    }

    return {
      owner,
      repo,
      type,
      path: filePath,
      branch,
    };
  } catch (error) {
    console.error("Error parsing URL:", error);
    return null;
  }
};

// Fetch branches from repository
export const fetchBranches = async (
  owner: string,
  repo: string,
  type: RepoType
): Promise<string[]> => {
  try {
    if (type === "github") {
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/branches`
      );
      return response.data.map((branch: { name: string }) => branch.name);
    } else {
      // GitLab API
      const response = await axios.get(
        `https://gitlab.com/api/v4/projects/${encodeURIComponent(
          `${owner}/${repo}`
        )}/repository/branches`
      );
      return response.data.map((branch: { name: string }) => branch.name);
    }
  } catch (error) {
    console.error("Error fetching branches:", error);
    throw error;
  }
};

// Fetch repository files (top-level only, not recursive)
export const fetchRepoFiles = async (
  owner: string,
  repo: string,
  branch: string,
  type: RepoType,
  path = ""
): Promise<RepoFile[]> => {
  try {
    if (type === "github") {
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        { params: { ref: branch } }
      );

      const files: RepoFile[] = response.data.map(
        (item: {
          name: string;
          path: string;
          type: string;
          size: number;
          sha: string;
          url: string;
          download_url: string;
        }) => {
          const file: RepoFile = {
            name: item.name,
            path: item.path,
            type: item.type === "dir" ? "dir" : "file",
            size: item.size,
            sha: item.sha,
            url: item.url,
            downloadUrl: item.download_url,
            loaded: false, // Directories start with loaded=false
          };

          if (file.type === "dir") {
            file.children = []; // Initialize with empty array
          }

          return file;
        }
      );

      return files;
    } else {
      // GitLab API
      const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
      const encodedFilePath = path ? encodeURIComponent(path) : "";

      const response = await axios.get(
        `https://gitlab.com/api/v4/projects/${encodedProjectPath}/repository/tree`,
        { params: { path: encodedFilePath, ref: branch } }
      );

      const files: RepoFile[] = response.data.map(
        (item: { name: string; path: string; type: string; size: number }) => {
          const file: RepoFile = {
            name: item.name,
            path: item.path,
            type: item.type === "tree" ? "dir" : "file",
            size: item.size,
            loaded: false, // Directories start with loaded=false
          };

          if (file.type === "dir") {
            file.children = []; // Initialize with empty array
          } else {
            // The raw URL is static — no per-file blob API call needed.
            file.downloadUrl = `https://gitlab.com/${owner}/${repo}/-/raw/${branch}/${file.path}`;
          }

          return file;
        }
      );

      return files;
    }
  } catch (error) {
    console.error(`Error fetching repo files for ${path}:`, error);
    throw error;
  }
};

// Load directory contents on demand
export const loadDirectoryContents = async (
  owner: string,
  repo: string,
  branch: string,
  type: RepoType,
  path: string,
  repoData: RepoData
): Promise<RepoFile[]> => {
  try {
    // Fetch the directory contents. The caller (RepoExplorerModal) owns merging
    // these into its file-tree state, so we just return them here.
    const dirContents = await fetchRepoFiles(owner, repo, branch, type, path);
    return dirContents;
  } catch (error) {
    console.error(`Error loading directory contents for ${path}:`, error);
    return [];
  }
};

// Fetch file content
export const fetchFileContent = async (
  owner: string,
  repo: string,
  filePath: string,
  branch: string,
  type: RepoType
): Promise<ArrayBuffer> => {
  try {
    let downloadUrl: string;

    if (type === "github") {
      downloadUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
    } else {
      downloadUrl = `https://gitlab.com/${owner}/${repo}/-/raw/${branch}/${filePath}`;
    }

    const response = await axios.get(downloadUrl, {
      responseType: "arraybuffer",
    });

    return response.data;
  } catch (error) {
    console.error(`Error fetching file content for ${filePath}:`, error);
    throw error;
  }
};

// Load repository data
export const loadRepoData = async (
  url: string,
  branch?: string
): Promise<RepoData | null> => {
  const parsedRepo = parseRepoUrl(url);
  if (!parsedRepo) {
    return null;
  }

  const { owner, repo, type, path } = parsedRepo;

  let branches: string[];
  let files: RepoFile[];
  let currentBranch: string;
  try {
    branches = await fetchBranches(owner, repo, type);

    if (branches.length === 0) {
      throw new Error("errors.notFound");
    }

    const mainBranch = branches.find((b) => b.toLowerCase() === "main");
    currentBranch = branch || mainBranch || branches[0];
    files = await fetchRepoFiles(owner, repo, currentBranch, type);
  } catch (error) {
    // Re-throw as an i18n key so the UI can show an actionable message
    // (rate limit / not found / network) instead of a generic failure.
    throw new Error(
      error instanceof Error && error.message.startsWith("errors.")
        ? error.message
        : classifyApiError(error)
    );
  }

  return {
    owner,
    repo,
    type,
    branches,
    currentBranch,
    files,
    initialPath: path,
  };
};

// Save and load repositories from local storage
const SAVED_REPOS_KEY = "repozip_saved_repos";

export const saveRepoToExamples = (repoData: RepoData): void => {
  const savedRepo: SavedRepo = {
    url: `https://${repoData.type}.com/${repoData.owner}/${repoData.repo}`,
    owner: repoData.owner,
    repo: repoData.repo,
    type: repoData.type,
    savedAt: new Date().toISOString(),
  };

  try {
    // Get existing saved repos
    const existingSaved = getSavedRepos();

    // Check if repo already exists
    const existingIndex = existingSaved.findIndex(
      (r) =>
        r.owner === savedRepo.owner &&
        r.repo === savedRepo.repo &&
        r.type === savedRepo.type
    );

    // Update saved repos
    if (existingIndex >= 0) {
      existingSaved[existingIndex] = savedRepo;
    } else {
      existingSaved.push(savedRepo);
    }

    // Save back to localStorage
    localStorage.setItem(SAVED_REPOS_KEY, JSON.stringify(existingSaved));
  } catch (error) {
    console.error("Error saving repo:", error);
  }
};

export const getSavedRepos = (): SavedRepo[] => {
  try {
    const saved = localStorage.getItem(SAVED_REPOS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Error loading saved repos:", error);
    return [];
  }
};

export const removeSavedRepo = (
  owner: string,
  repo: string,
  type: RepoType
): void => {
  try {
    const existingSaved = getSavedRepos();
    const filtered = existingSaved.filter(
      (r) => !(r.owner === owner && r.repo === repo && r.type === type)
    );
    localStorage.setItem(SAVED_REPOS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error removing saved repo:", error);
  }
};
