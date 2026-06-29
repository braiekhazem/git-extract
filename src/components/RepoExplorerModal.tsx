import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { createAndDownloadZip } from "../services/downloadService";
import { Download, Loader2, Save, X, Folder, GitBranch } from "lucide-react";
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
  const { t } = useTranslation();
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
      const key =
        error instanceof Error && error.message.startsWith("errors.")
          ? error.message
          : "errors.unknownError";
      toast({
        title: t("errors.loadRepo"),
        description: t(key),
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
        title: t("errors.switchBranch"),
        description: `${t("errors.switchBranchDescription")} ${
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
        if (!prevData) return prevData;
        return { ...prevData, files: updateFileTree(prevData.files) };
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

        // Update the file tree with the loaded contents
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
          if (!prevData) return prevData;
          return {
            ...prevData,
            files: updateFileTreeWithContents(prevData.files),
          };
        });
      } catch (error) {
        console.error("Error loading folder contents:", error);
        toast({
          title: t("errors.loadFolder"),
          description: `${t("errors.loadFolder")} ${
            error instanceof Error ? `(${error.message})` : ""
          }`.trim(),
          variant: "destructive",
        });

        // Reset the loading state on error
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
          if (!prevData) return prevData;
          return { ...prevData, files: resetLoadingState(prevData.files) };
        });
        return;
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
    const paths: string[] = [];
    for (const file of files) {
      paths.push(file.path);
      if (file.type === "dir" && file.children) {
        paths.push(...getAllPaths(file.children));
      }
    }
    return paths;
  };

  const handleAutoDownload = async () => {
    if (!repoData) return;

    try {
      setDownloading(true);
      setProgress(0);
      setIsComplete(false);
      setIsError(false);
      setShowProgress(true);

      // Get all files for download
      const filesToDownload = await getFilesForDownload(true);

      if (filesToDownload.length === 0) {
        toast({
          title: t("modal.noFilesSelected"),
          description: t("modal.selectFilesToDownload"),
          variant: "destructive",
        });
        setDownloading(false);
        setShowProgress(false);
        return;
      }

      // Create and download the zip
      await createAndDownloadZip(repoData, filesToDownload, (progress) => {
        setProgress(progress);
      });

      setIsComplete(true);
      toast({
        title: t("success.downloadComplete"),
        description: t("success.downloadComplete"),
      });

      // Hide progress after a short delay
      setTimeout(() => {
        setShowProgress(false);
        setDownloading(false);
        setProgress(0);
        setIsComplete(false);
      }, 2000);
    } catch (error) {
      console.error("Error during auto download:", error);
      setIsError(true);
      toast({
        title: t("errors.download"),
        description: `${t("errors.download")} ${
          error instanceof Error ? `(${error.message})` : ""
        }`.trim(),
        variant: "destructive",
      });

      setTimeout(() => {
        setShowProgress(false);
        setDownloading(false);
        setProgress(0);
        setIsError(false);
      }, 3000);
    }
  };

  const handleDownload = async () => {
    if (!repoData || selectedFilePaths.size === 0) {
      toast({
        title: t("modal.noFilesSelected"),
        description: t("modal.selectFilesToDownload"),
        variant: "destructive",
      });
      return;
    }

    try {
      setDownloading(true);
      setProgress(0);
      setIsComplete(false);
      setIsError(false);
      setShowProgress(true);

      // Get files for download
      const filesToDownload = await getFilesForDownload();

      if (filesToDownload.length === 0) {
        toast({
          title: t("modal.noFilesSelected"),
          description: t("modal.selectFilesToDownload"),
          variant: "destructive",
        });
        setDownloading(false);
        setShowProgress(false);
        return;
      }

      // Create and download the zip
      await createAndDownloadZip(repoData, filesToDownload, (progress) => {
        setProgress(progress);
      });

      setIsComplete(true);
      toast({
        title: t("success.downloadComplete"),
        description: t("success.downloadComplete"),
      });

      // Hide progress after a short delay
      setTimeout(() => {
        setShowProgress(false);
        setDownloading(false);
        setProgress(0);
        setIsComplete(false);
      }, 2000);
    } catch (error) {
      console.error("Error during download:", error);
      setIsError(true);
      toast({
        title: t("errors.download"),
        description: `${t("errors.download")} ${
          error instanceof Error ? `(${error.message})` : ""
        }`.trim(),
        variant: "destructive",
      });

      setTimeout(() => {
        setShowProgress(false);
        setDownloading(false);
        setProgress(0);
        setIsError(false);
      }, 3000);
    }
  };

  const getFilesForDownload = async (getAll = false): Promise<RepoFile[]> => {
    if (!repoData) return [];

    const selectedPaths = getAll
      ? new Set(getAllPaths(repoData.files))
      : selectedFilePaths;

    const loadDirRecursively = async (dir: RepoFile): Promise<RepoFile[]> => {
      const files: RepoFile[] = [];

      if (!dir.loaded && dir.children && dir.children.length === 0) {
        try {
          const contents = await loadDirectoryContents(
            repoData.owner,
            repoData.repo,
            repoData.currentBranch,
            repoData.type,
            dir.path,
            repoData
          );
          dir.children = contents;
          dir.loaded = true;
        } catch (error) {
          console.error(`Error loading directory ${dir.path}:`, error);
          toast({
            title: t("errors.loadFolder"),
            description: `${t("errors.loadFolder")} ${dir.path} ${
              error instanceof Error ? `(${error.message})` : ""
            }`.trim(),
            variant: "destructive",
          });
          return [];
        }
      }

      if (dir.children) {
        for (const child of dir.children) {
          if (child.type === "file") {
            files.push(child);
          } else if (child.type === "dir") {
            const childFiles = await loadDirRecursively(child);
            files.push(...childFiles);
          }
        }
      }

      return files;
    };

    const collectFiles = async (files: RepoFile[], parentPath: string = "") => {
      const result: RepoFile[] = [];

      for (const file of files) {
        const fullPath = parentPath ? `${parentPath}/${file.name}` : file.name;

        if (selectedPaths.has(file.path)) {
          if (file.type === "file") {
            result.push(file);
          } else if (file.type === "dir") {
            const dirFiles = await loadDirRecursively(file);
            result.push(...dirFiles);
          }
        } else if (file.type === "dir" && file.children) {
          const childFiles = await collectFiles(file.children, file.path);
          result.push(...childFiles);
        }
      }

      return result;
    };

    try {
      const filesToDownload = await collectFiles(repoData.files);

      // Merge loaded data back into the main state tree
      const mergeLoadedData = (
        currentTree: RepoFile[],
        loadedTree: RepoFile[]
      ): RepoFile[] => {
        return currentTree.map((currentFile) => {
          // Find corresponding file in loaded tree
          const loadedFile = loadedTree.find(
            (f) => f.path === currentFile.path
          );

          if (loadedFile && currentFile.type === "dir") {
            // If this directory was loaded, update it
            return {
              ...currentFile,
              children: loadedFile.children || currentFile.children,
              loaded: loadedFile.loaded || currentFile.loaded,
            };
          } else if (currentFile.type === "dir" && currentFile.children) {
            // Recursively merge children
            return {
              ...currentFile,
              children: mergeLoadedData(currentFile.children, loadedTree),
            };
          }

          return currentFile;
        });
      };

      // Update the main state with any newly loaded directory contents
      setRepoData((prevData) => {
        if (!prevData) return prevData;
        return {
          ...prevData,
          files: mergeLoadedData(prevData.files, repoData.files),
        };
      });

      return filesToDownload;
    } catch (error) {
      console.error("Error collecting files for download:", error);
      toast({
        title: t("errors.download"),
        description: `${t("errors.download")} ${
          error instanceof Error ? `(${error.message})` : ""
        }`.trim(),
        variant: "destructive",
      });
      return [];
    }
  };

  const handleSaveRepo = () => {
    if (!repoData) return;

    saveRepoToExamples(repoData);
    setSaved(true);
    toast({
      title: t("modal.repositorySaved"),
      description: t("modal.repositorySavedDescription"),
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
      <DialogContent className="max-w-5xl w-full h-[85vh] p-0 flex flex-col gap-0 animate-slide-in-from-bottom">
        <DialogHeader className="p-4 border-b bg-gradient-primary-soft">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <GitBranch className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">
                  {loading
                    ? t("modal.loadingTitle")
                    : repoData
                    ? `${repoData.owner}/${repoData.repo}`
                    : t("modal.repositoryExplorer")}
                </DialogTitle>
                {repoData && !loading && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("modal.branch")}: {repoData.currentBranch}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {repoData && (
                <BranchSelector
                  branches={repoData.branches}
                  currentBranch={repoData.currentBranch}
                  onChange={handleBranchChange}
                  disabled={downloading}
                />
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full hover:bg-muted/50 h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1 p-12">
            <div className="p-4 rounded-full bg-primary/10 mb-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">
              {t("modal.loadingDescription")}
            </h3>
            <p className="text-muted-foreground text-center max-w-md">
              {t("modal.loadingDescription")}
            </p>
          </div>
        ) : !repoData ? (
          <div className="flex flex-col items-center justify-center flex-1 p-12">
            <div className="p-4 rounded-full bg-red-500/10 mb-6">
              <X className="h-12 w-12 text-red-500" />
            </div>
            <h3 className="text-2xl font-semibold text-red-500 mb-2">
              {t("modal.repositoryNotFound")}
            </h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              {t("modal.repositoryNotFoundDescription")}
            </p>
            <Button onClick={onClose} className="btn-primary-gradient">
              {t("modal.tryDifferentRepository")}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-4 bg-muted/30 border-b sticky top-0 z-10 backdrop-blur-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  disabled={downloading}
                  className="bg-background/80"
                >
                  {t("modal.selectAll")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={unselectAll}
                  disabled={downloading}
                  className="bg-background/80"
                >
                  {t("modal.unselectAll")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveRepo}
                  disabled={downloading || saved}
                  className="bg-background/80"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saved ? t("modal.saved") : t("modal.saveToExamples")}
                </Button>
                {selectedCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary"
                  >
                    {selectedCount} {t("modal.selected")}
                  </Badge>
                )}
              </div>
              <Button
                onClick={handleDownload}
                disabled={selectedCount === 0 || downloading}
                className="w-full lg:w-auto btn-primary-gradient"
              >
                {downloading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("modal.downloading")}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    {t("modal.download")} ({selectedCount})
                  </>
                )}
              </Button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {repoData.files && repoData.files.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-center p-4 bg-info/10 rounded-lg border border-info/20">
                    <div className="flex items-center justify-center gap-2 text-info mb-2">
                      <Folder className="h-4 w-4" />
                      <span className="font-medium">
                        {t("modal.fileExplorer")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("modal.fileExplorerDescription")}
                    </p>
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
                <div className="flex items-center justify-center h-full p-12 text-center">
                  <div className="space-y-4">
                    <div className="p-4 rounded-full bg-muted/50 mx-auto w-fit">
                      <Folder className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-2">
                        {t("modal.repositoryEmpty")}
                      </h3>
                      <p className="text-muted-foreground">
                        {t("modal.repositoryEmptyDescription")}
                      </p>
                    </div>
                  </div>
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
