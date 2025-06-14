import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RepoData, RepoFile, RepoActionType } from "../types/repo";
import BranchSelector from "./BranchSelector";
import FileTree from "./FileTree";
import { Button } from "@/components/ui/button";
import {
  loadRepoData,
  saveRepoToExamples,
  loadDirectoryContents,
} from "../services/repoService";
import {
  createAndDownloadZip,
  getSelectedFiles,
} from "../services/downloadService";
import { Download, Loader2, Save, X, Folder } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import DownloadProgress from "./DownloadProgress";
import { useToast } from "@/hooks/use-toast";

interface RepoExplorerModalProps {
  repoUrl: string;
  open: boolean;
  onClose: () => void;
  initialAction?: RepoActionType | null;
}

const RepoExplorerModal: React.FC<RepoExplorerModalProps> = ({
  repoUrl,
  open,
  onClose,
  initialAction,
}) => {
  const [repoData, setRepoData] = useState<RepoData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
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
  const [saved, setSaved] = useState<boolean>(false);
  const { toast } = useToast();

  // Reset state when modal opens with new URL
  useEffect(() => {
    if (open && repoUrl) {
      setLoading(true);
      setSelectedFilePaths(new Set());
      setExpandedFolders(new Set()); // Initialize with empty set (all folders collapsed)
      setSaved(false);
      loadRepo(repoUrl);
    }
  }, [repoUrl, open]);

  useEffect(() => {
    if (open && repoData && !loading && initialAction === "download") {
      handleAutoDownload();
    }
  }, [open, repoData, loading, initialAction]);

  const loadRepo = async (url: string, branch?: string) => {
    setLoading(true);
    try {
      const data = await loadRepoData(url, branch);
      setRepoData(data);

      if (data) {
        // If initialPath is provided (direct file/folder link), preselect and expand those paths
        if (data.initialPath) {
          const pathParts = data.initialPath.split("/");
          let currentPath = "";

          // Expand all parent folders to the initial path
          pathParts.forEach((part, index) => {
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            // Only expand if this is a directory (not the last part or last part is a directory)
            if (index < pathParts.length - 1) {
              setExpandedFolders((prev) => new Set([...prev, currentPath]));
            }
          });

          // Select the target file/folder
          setSelectedFilePaths(new Set([data.initialPath]));
        }
      }
    } catch (error) {
      toast({
        title: "Error loading repository",
        description:
          `Failed to load repository data. Please check the URL and try again. ${
            error instanceof Error ? `(${error.message})` : ""
          }`.trim(),
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
    setExpandedFolders(new Set()); // Reset to all folders collapsed when changing branch

    try {
      await loadRepo(repoUrl, branch);
    } catch (error) {
      console.error("Error switching branch:", error);
      toast({
        title: "Error switching branch",
        description: `Failed to load the new branch. Please try again. ${
          error instanceof Error ? `(${error.message})` : ""
        }`.trim(),
        variant: "destructive",
      });
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
          description: `Failed to load folder contents. Please try again. ${
            error instanceof Error ? `(${error.message})` : ""
          }`.trim(),
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

  const handleAutoDownload = async () => {
    if (!repoData || downloading) return;

    setDownloading(true);
    setProgress(0);
    setIsComplete(false);
    setIsError(false);
    setShowProgress(true);

    try {
      // Get all files for download, bypassing selection state
      const allFiles = await getFilesForDownload(true); // Pass a flag to get all files

      if (allFiles.length === 0) {
        toast({
          title: "Repository is empty",
          description: "There are no files to download in this repository.",
        });
        setDownloading(false);
        setShowProgress(false);
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
      console.error("Auto download error:", error);
      setIsError(true);
      toast({
        title: "Download failed",
        description: `An error occurred while creating your ZIP file. ${
          error instanceof Error ? `(${error.message})` : ""
        }`.trim(),
        variant: "destructive",
      });
    } finally {
      // Do not set `downloading` to false here, to allow the progress UI to be shown
      // until the user manually closes it.
    }
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
      // Get all selected files and their data, loading contents if necessary
      const allFiles = await getFilesForDownload();

      if (allFiles.length === 0) {
        toast({
          title: "No files to download",
          description:
            "The selected folders might be empty or could not be loaded.",
          variant: "destructive", // Changed to "default" to be less alarming
        });
        setDownloading(false);
        setShowProgress(false);
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
        description: `An error occurred while creating your ZIP file. ${
          error instanceof Error ? `(${error.message})` : ""
        }`.trim(),
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const getFilesForDownload = async (getAll = false): Promise<RepoFile[]> => {
    if (!repoData) return [];

    const updatedRepoData = { ...repoData }; // Work on a copy
    const filesToDownload: RepoFile[] = [];
    let stateNeedsUpdate = false;

    // Recursive function to load directory contents
    const loadDirRecursively = async (dir: RepoFile): Promise<RepoFile[]> => {
      let children = dir.children || [];
      if (!dir.loaded) {
        try {
          const contents = await loadDirectoryContents(
            updatedRepoData.owner,
            updatedRepoData.repo,
            updatedRepoData.currentBranch,
            updatedRepoData.type,
            dir.path,
            updatedRepoData
          );
          children = contents;
          dir.loaded = true; // Mutate the copy
          dir.children = children; // Mutate the copy
          stateNeedsUpdate = true;
        } catch (error) {
          console.error(
            `Error loading folder contents for ${dir.path}:`,
            error
          );
          toast({
            title: "Error loading folder",
            description: `Failed to load contents for ${
              dir.path
            }. It will be skipped. ${
              error instanceof Error ? `(${error.message})` : ""
            }`.trim(),
            variant: "destructive",
          });
          return [];
        }
      }

      const files: RepoFile[] = [];
      for (const child of children) {
        if (child.type === "file") {
          files.push(child);
        } else if (child.type === "dir") {
          files.push(...(await loadDirRecursively(child)));
        }
      }
      return files;
    };

    // Main logic to collect files
    const collectFiles = async (files: RepoFile[], parentPath: string = "") => {
      for (const file of files) {
        const isSelected = getAll || selectedFilePaths.has(file.path);
        const isDescendant =
          !getAll && parentPath && selectedFilePaths.has(parentPath);

        if (isSelected || isDescendant) {
          if (file.type === "file") {
            filesToDownload.push(file);
          } else if (file.type === "dir") {
            const allNestedFiles = await loadDirRecursively(file);
            filesToDownload.push(...allNestedFiles);
          }
        } else if (file.type === "dir" && file.children) {
          // If not selected, continue searching in its children
          await collectFiles(file.children, file.path);
        }
      }
    };

    // Create a deep enough copy for mutation during collection
    const repoFilesCopy = JSON.parse(JSON.stringify(updatedRepoData.files));
    await collectFiles(repoFilesCopy);

    // Update the main state tree if any directories were loaded
    if (stateNeedsUpdate) {
      const mergeLoadedData = (
        currentTree: RepoFile[],
        loadedTree: RepoFile[]
      ): RepoFile[] => {
        return currentTree.map((currentItem) => {
          const loadedItem = loadedTree.find(
            (item) => item.path === currentItem.path
          );

          if (
            currentItem.type === "dir" &&
            loadedItem &&
            loadedItem.type === "dir"
          ) {
            // Merge the loaded data into the current state.
            // The loaded item has the most up-to-date content (children),
            // while the current item has the latest UI state (like `isLoading`).
            return {
              ...currentItem,
              ...loadedItem,
              children:
                currentItem.children &&
                currentItem.children.length > 0 &&
                loadedItem.children
                  ? mergeLoadedData(currentItem.children, loadedItem.children)
                  : loadedItem.children || currentItem.children,
            };
          }

          // For files or items that weren't loaded, keep the current version.
          return currentItem;
        });
      };

      setRepoData((prevData) => {
        if (!prevData) return null;
        return {
          ...prevData,
          files: mergeLoadedData(prevData.files, repoFilesCopy),
        };
      });
    }

    // Remove duplicates
    return Array.from(
      new Map(filesToDownload.map((f) => [f.path, f])).values()
    );
  };

  const handleSaveRepo = () => {
    if (!repoData) return;

    saveRepoToExamples(repoData);
    setSaved(true);
    toast({
      title: "Repository saved",
      description: "This repository has been added to your examples.",
    });
  };

  if (!open) return null;

  const selectedCount = selectedFilePaths.size;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="max-w-4xl w-full h-[80vh] p-0 flex flex-col">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              {loading
                ? "Loading Repository..."
                : repoData
                ? `${repoData.owner}/${repoData.repo}`
                : "Repository Explorer"}
            </DialogTitle>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1 p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h3 className="text-xl font-medium">Loading repository data...</h3>
            <p className="text-muted-foreground">
              This may take a moment for large repositories.
            </p>
          </div>
        ) : !repoData ? (
          <div className="flex flex-col items-center justify-center flex-1 p-8">
            <h3 className="text-xl font-medium text-red-500">
              Repository not found
            </h3>
            <p className="text-muted-foreground mb-4">
              Unable to load the repository data.
            </p>
            <Button onClick={onClose}>Try a different repository</Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 bg-card border-b">
              <div className="space-y-1">
                <h2 className="text-lg font-bold flex items-center gap-2">
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
                <div className="flex items-center gap-2 flex-wrap">
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
                    variant="outline"
                    size="sm"
                    onClick={handleSaveRepo}
                    disabled={downloading || saved}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saved ? "Saved" : "Save to Examples"}
                  </Button>
                  <Button
                    onClick={handleDownload}
                    disabled={selectedCount === 0 || downloading}
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

            <div className="flex-1 overflow-auto">
              {repoData.files && repoData.files.length > 0 ? (
                <div className="p-2">
                  <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1 justify-center">
                    <Folder className="h-3 w-3" /> Click on folders to
                    expand/collapse them
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
                    This repository is empty or doesn't have any files in the
                    current branch.
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RepoExplorerModal;
