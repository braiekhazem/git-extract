import React, { useState, useEffect } from "react";
import { RepoData, RepoFile } from "../types/repo";
import BranchSelector from "./BranchSelector";
import FileTree from "./FileTree";
import { Button } from "@/components/ui/button";
import { loadRepoData, loadDirectoryContents } from "../services/repoService";
import {
  createAndDownloadZip,
  getSelectedFiles,
  getSelectedFilesWithDirectoryExpansion,
} from "../services/downloadService";
import { Download, Loader2, Folder } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import DownloadProgress from "./DownloadProgress";
import { useToast } from "@/hooks/use-toast";

interface RepoExplorerProps {
  repoUrl: string;
  initialRepoData?: RepoData;
  onReset: () => void;
}

const RepoExplorer: React.FC<RepoExplorerProps> = ({
  repoUrl,
  initialRepoData,
  onReset,
}) => {
  const [repoData, setRepoData] = useState<RepoData | null>(
    initialRepoData || null
  );
  const [loading, setLoading] = useState<boolean>(!initialRepoData);
  const [selectedFilePaths, setSelectedFilePaths] = useState<Set<string>>(
    new Set()
  );
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [downloading, setDownloading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [showProgress, setShowProgress] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!initialRepoData && repoUrl) {
      loadRepo(repoUrl);
    }
  }, [initialRepoData, repoUrl]);

  const loadRepo = async (url: string, branch?: string) => {
    setLoading(true);
    try {
      const data = await loadRepoData(url, branch);
      setRepoData(data);

      // No longer auto-expanding root folders, all folders start collapsed
    } catch (error) {
      toast({
        title: "Error loading repository",
        description:
          "Failed to load repository data. Please check the URL and try again.",
        variant: "destructive",
      });
      console.error("Error loading repository:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBranchChange = async (branch: string) => {
    if (!repoData) return;

    setLoading(true);
    setSelectedFilePaths(new Set());
    setExpandedFolders(new Set());

    try {
      await loadRepo(repoUrl, branch);
    } catch (error) {
      console.error("Error switching branch:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (path: string, isSelected: boolean) => {
    setSelectedFilePaths((prevSelected) => {
      const newSelected = new Set(prevSelected);

      if (isSelected) {
        newSelected.add(path);
      } else {
        newSelected.delete(path);
      }

      return newSelected;
    });
  };

  const toggleFolder = async (path: string) => {
    // First check if this folder is already expanded
    const isExpanded = expandedFolders.has(path);

    if (isExpanded) {
      // If it's already expanded, just collapse it
      setExpandedFolders((prevExpanded) => {
        const newExpanded = new Set(prevExpanded);
        newExpanded.delete(path);
        return newExpanded;
      });
      return;
    }

    // Find the folder in the file tree
    const findFolder = (files: RepoFile[]): RepoFile | null => {
      for (const file of files) {
        if (file.path === path) {
          return file;
        }
        if (file.type === "dir" && file.children) {
          const found = findFolder(file.children);
          if (found) return found;
        }
      }
      return null;
    };

    if (!repoData) return;

    const folder = findFolder(repoData.files);

    if (!folder || folder.type !== "dir") return;

    // Check if the folder's contents are already loaded
    if (!folder.loaded && folder.children && folder.children.length === 0) {
      // If not loaded, set a loading state for this folder
      const updatedFolder = { ...folder, isLoading: true };

      // Update the repo data to show loading state
      const updateFileTree = (files: RepoFile[]): RepoFile[] => {
        return files.map((file) => {
          if (file.path === path) {
            return updatedFolder;
          } else if (
            file.type === "dir" &&
            file.children &&
            path.startsWith(file.path + "/")
          ) {
            return { ...file, children: updateFileTree(file.children) };
          } else {
            return file;
          }
        });
      };

      setRepoData((prevData) => {
        if (!prevData) return null;
        return {
          ...prevData,
          files: updateFileTree(prevData.files),
        };
      });

      try {
        // Load the directory contents
        const contents = await loadDirectoryContents(
          repoData.owner,
          repoData.repo,
          repoData.currentBranch,
          repoData.type,
          path,
          repoData
        );

        // Update the repo data with the loaded contents
        const updateFileTreeWithContents = (files: RepoFile[]): RepoFile[] => {
          return files.map((file) => {
            if (file.path === path) {
              return {
                ...file,
                children: contents,
                loaded: true,
                isLoading: false,
              };
            } else if (
              file.type === "dir" &&
              file.children &&
              path.startsWith(file.path + "/")
            ) {
              return {
                ...file,
                children: updateFileTreeWithContents(file.children),
              };
            } else {
              return file;
            }
          });
        };

        setRepoData((prevData) => {
          if (!prevData) return null;
          return {
            ...prevData,
            files: updateFileTreeWithContents(prevData.files),
          };
        });
      } catch (error) {
        console.error(`Error loading folder contents for ${path}:`, error);
        toast({
          title: "Error loading folder",
          description: "Failed to load folder contents. Please try again.",
          variant: "destructive",
        });

        // Reset loading state in case of error
        const resetLoadingState = (files: RepoFile[]): RepoFile[] => {
          return files.map((file) => {
            if (file.path === path) {
              return { ...file, isLoading: false };
            } else if (
              file.type === "dir" &&
              file.children &&
              path.startsWith(file.path + "/")
            ) {
              return { ...file, children: resetLoadingState(file.children) };
            } else {
              return file;
            }
          });
        };

        setRepoData((prevData) => {
          if (!prevData) return null;
          return {
            ...prevData,
            files: resetLoadingState(prevData.files),
          };
        });

        return; // Don't expand the folder if loading failed
      }
    }

    // Expand the folder
    setExpandedFolders((prevExpanded) => {
      const newExpanded = new Set(prevExpanded);
      newExpanded.add(path);
      return newExpanded;
    });
  };

  const selectAll = () => {
    if (!repoData) return;

    const allPaths = getAllPaths(repoData.files);
    setSelectedFilePaths(new Set(allPaths));
  };

  const unselectAll = () => {
    setSelectedFilePaths(new Set());
  };

  const getAllPaths = (files: RepoFile[]): string[] => {
    let paths: string[] = [];

    for (const file of files) {
      paths.push(file.path);

      if (file.type === "dir" && file.children) {
        paths = [...paths, ...getAllPaths(file.children)];
      }
    }

    return paths;
  };

  const handleDownload = async () => {
    if (!repoData) return;

    if (selectedFilePaths.size === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file or folder to download.",
        variant: "destructive",
      });
      return;
    }

    setDownloading(true);
    setProgress(0);
    setIsComplete(false);
    setIsError(false);
    setShowProgress(true);

    try {
      // Use enhanced file collection that properly handles directories
      const allFiles = await getSelectedFilesWithDirectoryExpansion(
        repoData,
        selectedFilePaths
      );

      if (allFiles.length === 0) {
        toast({
          title: "No files found",
          description: "No files were found in the selected directories.",
          variant: "destructive",
        });
        return;
      }

      // Create and download the ZIP
      await createAndDownloadZip(repoData, allFiles, setProgress);

      setIsComplete(true);
      toast({
        title: "Download complete",
        description: `Successfully downloaded ${allFiles.length} files.`,
      });
    } catch (error) {
      console.error("Download error:", error);
      setIsError(true);
      toast({
        title: "Download failed",
        description: "An error occurred while creating your ZIP file.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const getSelectedCount = (): number => {
    if (!repoData || selectedFilePaths.size === 0) return 0;

    // For display purposes, we'll show the number of selected items
    // The actual file count will be calculated during download
    return selectedFilePaths.size;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h3 className="text-xl font-medium">Loading repository data...</h3>
        <p className="text-muted-foreground">
          This may take a moment for large repositories.
        </p>
      </div>
    );
  }

  if (!repoData) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16">
        <h3 className="text-xl font-medium text-red-500">
          Repository not found
        </h3>
        <p className="text-muted-foreground mb-4">
          Unable to load the repository data.
        </p>
        <Button onClick={onReset}>Try a different repository</Button>
      </div>
    );
  }

  const selectedCount = getSelectedCount();

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 p-4 bg-card rounded-md border">
        <div className="space-y-1">
          <h2 className="text-xl font-bold flex items-center gap-2">
            {repoData.type === "github" ? (
              <Badge className="bg-black text-white">GitHub</Badge>
            ) : (
              <Badge className="bg-orange-600 text-white">GitLab</Badge>
            )}
            {repoData.owner}/{repoData.repo}
          </h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BranchSelector
              branches={repoData.branches}
              currentBranch={repoData.currentBranch}
              onChange={handleBranchChange}
              disabled={downloading}
            />
          </div>
        </div>

        <div className="flex flex-col w-full md:w-auto gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              disabled={downloading}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={unselectAll}
              disabled={downloading}
            >
              Unselect All
            </Button>
            <Button
              onClick={handleDownload}
              disabled={selectedCount === 0 || downloading}
              className="ml-auto md:ml-0"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download ({selectedCount})
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 border rounded-md overflow-auto">
        {repoData.files && repoData.files.length > 0 ? (
          <div className="p-2">
            <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1 justify-center">
              <Folder className="h-3 w-3" /> Click on folders to expand/collapse
              them
            </div>
            <FileTree
              files={repoData.files}
              onFileSelect={handleFileSelect}
              selectedFiles={selectedFilePaths}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full p-8 text-center">
            <p className="text-muted-foreground">
              This repository is empty or doesn't have any files in the current
              branch.
            </p>
          </div>
        )}
      </div>

      {showProgress && (
        <DownloadProgress
          progress={progress}
          isComplete={isComplete}
          isError={isError}
          onCancel={() => {
            setDownloading(false);
            setShowProgress(false);
          }}
          onClose={() => setShowProgress(false)}
          selectedCount={selectedCount}
        />
      )}
    </div>
  );
};

export default RepoExplorer;
