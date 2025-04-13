import axios from "axios";
import { RepoType, RepoFile, RepoData, SavedRepo } from "../types/repo";

// Parse repository URL to extract owner, repo name, and type
export const parseRepoUrl = (
  url: string
): { owner: string; repo: string; type: RepoType; path?: string } | null => {
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

    // Check if URL points to a file or folder (has more than owner/repo in path)
    let filePath: string | undefined;
    if (pathParts.length > 2) {
      // Skip "blob" or "tree" part for GitHub, or "-/blob" or "-/tree" for GitLab
      const skipIndex =
        type === "github" &&
        (pathParts[2] === "blob" || pathParts[2] === "tree")
          ? 3
          : type === "gitlab" &&
            pathParts[2] === "-" &&
            (pathParts[3] === "blob" || pathParts[3] === "tree")
          ? 4
          : 2;

      filePath = pathParts.slice(skipIndex).join("/");
    }

    return {
      owner: pathParts[0],
      repo: pathParts[1],
      type,
      path: filePath,
    };
  } catch (error) {
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
      return response.data.map((branch: any) => branch.name);
    } else {
      // GitLab API
      const response = await axios.get(
        `https://gitlab.com/api/v4/projects/${encodeURIComponent(
          `${owner}/${repo}`
        )}/repository/branches`
      );
      return response.data.map((branch: any) => branch.name);
    }
  } catch (error) {
    console.error("Error fetching branches:", error);
    return [];
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

      const files: RepoFile[] = response.data.map((item: any) => {
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
      });

      return files;
    } else {
      // GitLab API
      const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
      const encodedFilePath = path ? encodeURIComponent(path) : "";

      const response = await axios.get(
        `https://gitlab.com/api/v4/projects/${encodedProjectPath}/repository/tree`,
        { params: { path: encodedFilePath, ref: branch } }
      );

      const files: RepoFile[] = await Promise.all(
        response.data.map(async (item: any) => {
          const file: RepoFile = {
            name: item.name,
            path: item.path,
            type: item.type === "tree" ? "dir" : "file",
            size: item.size,
            loaded: false, // Directories start with loaded=false
          };

          if (file.type === "dir") {
            file.children = []; // Initialize with empty array
          } else if (file.type === "file") {
            // For GitLab, we need to get the blob for download URL
            const blobResponse = await axios.get(
              `https://gitlab.com/api/v4/projects/${encodedProjectPath}/repository/files/${encodeURIComponent(
                file.path
              )}`,
              { params: { ref: branch } }
            );
            file.downloadUrl = `https://gitlab.com/${owner}/${repo}/-/raw/${branch}/${file.path}`;
            file.sha = blobResponse.data.blob_id;
          }

          return file;
        })
      );

      return files;
    }
  } catch (error) {
    console.error(`Error fetching repo files for ${path}:`, error);
    return [];
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
    // Fetch the directory contents
    const dirContents = await fetchRepoFiles(owner, repo, branch, type, path);

    // Update the repo data tree with the loaded contents
    const updateFileTree = (files: RepoFile[]): RepoFile[] => {
      return files.map((file) => {
        if (file.path === path && file.type === "dir") {
          // Found the directory to update
          return {
            ...file,
            children: dirContents,
            loaded: true,
          };
        } else if (
          file.type === "dir" &&
          file.children &&
          path.startsWith(file.path + "/")
        ) {
          // This is a parent directory, recurse into its children
          return {
            ...file,
            children: updateFileTree(file.children),
          };
        } else {
          // Not the directory we're looking for
          return file;
        }
      });
    };

    // Return the directory contents for immediate use
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
  const branches = await fetchBranches(owner, repo, type);

  if (branches.length === 0) {
    return null;
  }

  const currentBranch = branch || branches[0];
  const files = await fetchRepoFiles(owner, repo, currentBranch, type);

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
