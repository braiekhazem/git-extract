export type RepoType = "github" | "gitlab";
export type RepoActionType = "download" | "explore" | "download-link";

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
  loaded?: boolean;
  isLoading?: boolean;
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
