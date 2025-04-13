export type RepoType = "github" | "gitlab";
export type RepoActionType = "explore" | "download-file-folder";

export interface RepoFile {
  name: string;
  path: string;
  type: "file" | "dir";
  size?: number;
  sha?: string;
  url?: string;
  downloadUrl?: string;
  children?: RepoFile[];
  isSelected?: boolean;
}

export interface RepoData {
  owner: string;
  repo: string;
  type: RepoType;
  branches: string[];
  currentBranch: string;
  files: RepoFile[];
  initialPath?: string;
}

export interface SavedRepo {
  url: string;
  owner: string;
  repo: string;
  type: RepoType;
  savedAt: string;
}
