import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { RepoActionType } from "../types/repo";
import { saveAs } from "file-saver";
import {
  loadRepoData,
  fetchFileContent,
  parseRepoUrl,
  fetchRepoFiles,
} from "../services/repoService";
import {
  createAndDownloadZip,
  generateDownloadLink,
  collectAllFilesFromDirectory,
} from "../services/downloadService";
import {
  Github,
  Gitlab,
  Download,
  Search,
  Loader2,
  Share2,
  Link,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DirectDownloadProgress from "./DirectDownloadProgress";

interface RepoFormProps {
  onSubmit: (url: string, action: RepoActionType) => void;
  isLoading: boolean;
}

const RepoForm: React.FC<RepoFormProps> = ({ onSubmit, isLoading }) => {
  const [url, setUrl] = useState("");
  const [action, setAction] = useState<RepoActionType>("explore");
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadError, setDownloadError] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [downloadingItemName, setDownloadingItemName] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    try {
      const parsedRepo = parseRepoUrl(url);
      if (!parsedRepo) {
        toast({
          title: "Invalid URL",
          description: "Please enter a valid GitHub or GitLab repository URL",
          variant: "destructive",
        });
        return;
      }

      if (action === "download") {
        const { owner, repo, type, path } = parsedRepo;

        const repoData = await loadRepoData(url);
        if (!repoData) {
          toast({
            title: "Repository Not Found",
            description: "Could not load repository data",
            variant: "destructive",
          });
          return;
        }

        // Use the current branch from repoData or the parsed branch
        const branch = parsedRepo.branch || repoData.currentBranch;

        // Start download with progress tracking
        setDownloading(true);
        setDownloadProgress(0);
        setDownloadError(false);
        setShowProgress(true);
        setDownloadingItemName(
          path ? `${owner}/${repo}/${path}` : `${owner}/${repo}`
        );

        try {
          if (!path) {
            // This is a repository, download all files
            const allFiles = await collectAllFilesFromDirectory(repoData, "");

            await createAndDownloadZip(repoData, allFiles, (progress) => {
              setDownloadProgress(progress);
            });

            toast({
              title: "Repository Downloaded",
              description:
                "The repository has been downloaded successfully as a ZIP file.",
            });
          } else {
            // For files or folders, use the enhanced collection method
            try {
              // First try to get it as a single file
              const fileContent = await fetchFileContent(
                owner,
                repo,
                path,
                branch,
                type
              );

              // If we got here, it's a file - download it
              const fileName = path.split("/").pop() || "file";
              const blob = new Blob([fileContent], {
                type: "application/octet-stream",
              });
              saveAs(blob, fileName);
              setDownloadProgress(100);

              toast({
                title: "File Downloaded",
                description: `File ${fileName} has been downloaded successfully.`,
              });
            } catch (fileError) {
              // If file fetch failed, it's probably a directory
              const allFiles = await collectAllFilesFromDirectory(
                repoData,
                path
              );

              if (allFiles.length > 0) {
                await createAndDownloadZip(repoData, allFiles, (progress) => {
                  setDownloadProgress(progress);
                });

                toast({
                  title: "Folder Downloaded",
                  description: `The folder has been downloaded successfully with ${allFiles.length} files.`,
                });
              } else {
                toast({
                  title: "Download Failed",
                  description: "No files found in the specified path.",
                  variant: "destructive",
                });
              }
            }
          }
        } catch (error) {
          setDownloadError(true);
          toast({
            title: "Download Failed",
            description:
              "Could not download the content. It might not exist or you might not have access to it.",
            variant: "destructive",
          });

          setTimeout(() => {
            setDownloading(false);
            setShowProgress(false);
            setDownloadProgress(0);
            setDownloadError(false);
            setDownloadingItemName("");
          }, 3000);
        } finally {
          // Hide progress after a short delay to show completion (if no error)
          if (!downloadError) {
            setTimeout(() => {
              setDownloading(false);
              setShowProgress(false);
              setDownloadProgress(0);
              setDownloadingItemName("");
            }, 1000);
          }
        }
      } else if (action === "explore") {
        // Explore mode - open modal for repo/folder, download for file
        const { owner, repo, type, path } = parsedRepo;

        // For repositories, open the modal immediately
        if (!path) {
          // This is a repository, open modal
          onSubmit(url, "explore");
          return;
        }

        // Load repo data to get branches
        const repoData = await loadRepoData(url);
        if (!repoData) {
          toast({
            title: "Repository Not Found",
            description: "Could not load repository data",
            variant: "destructive",
          });
          return;
        }

        const branch = parsedRepo.branch || repoData.currentBranch;

        try {
          // Check if it's a file or folder by attempting to fetch file content first
          try {
            // Try to get the file content
            const fileContent = await fetchFileContent(
              owner,
              repo,
              path,
              branch,
              type
            );

            // If we got here, it's a file - download it
            setDownloading(true);
            setDownloadProgress(0);
            setDownloadError(false);
            setShowProgress(true);

            const fileName = path.split("/").pop() || "file";
            setDownloadingItemName(fileName);
            const blob = new Blob([fileContent], {
              type: "application/octet-stream",
            });
            saveAs(blob, fileName);
            setDownloadProgress(100);

            toast({
              title: "File Downloaded",
              description: `File ${fileName} has been downloaded successfully.`,
            });

            // Hide progress after a short delay
            setTimeout(() => {
              setDownloading(false);
              setShowProgress(false);
              setDownloadProgress(0);
              setDownloadingItemName("");
            }, 1000);
          } catch (fileError) {
            // If we couldn't get file content, it's probably a folder - open the modal
            console.log("Not a file, trying as a folder", fileError);
            onSubmit(url, "explore");
          }
        } catch (error) {
          console.error("Error:", error);
          toast({
            title: "Operation Failed",
            description: "Could not process the content. Please check the URL.",
            variant: "destructive",
          });
        }
      } else if (action === "download-link") {
        // Generate download link
        const downloadLink = generateDownloadLink(url, "download");

        // Copy to clipboard
        try {
          await navigator.clipboard.writeText(downloadLink);
          toast({
            title: "Download Link Generated",
            description: "The download link has been copied to your clipboard!",
          });
        } catch (error) {
          // If clipboard API fails, show the link to user
          console.error("Failed to copy to clipboard:", error);
          toast({
            title: "Download Link Generated",
            description: downloadLink,
            duration: 10000,
          });
        }
      }
    } catch (error) {
      console.error("Error processing repository:", error);
      toast({
        title: "Error",
        description: "An error occurred while processing the repository",
        variant: "destructive",
      });
    }
  };

  const getActionIcon = () => {
    switch (action) {
      case "download":
        return <Download className="h-4 w-4" />;
      case "explore":
        return <Search className="h-4 w-4" />;
      case "download-link":
        return <Link className="h-4 w-4" />;
      default:
        return <Download className="h-4 w-4" />;
    }
  };

  const getActionLabel = () => {
    switch (action) {
      case "download":
        return "Download";
      case "explore":
        return "Explore";
      case "download-link":
        return "Get Link";
      default:
        return "Download";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-4 mb-2">
        <Github className="h-8 w-8 text-slate-800 dark:text-slate-200" />
        <Gitlab className="h-8 w-8 text-orange-500" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="repo-url" className="text-sm font-medium">
            Repository URL
          </Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="repo-url"
              type="text"
              placeholder="https://github.com/user/repo or https://gitlab.com/user/repo"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-grow"
              required
            />
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 w-full sm:w-auto whitespace-nowrap"
                  >
                    {getActionIcon()}
                    {getActionLabel()}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setAction("explore")}>
                    <Search className="h-4 w-4 mr-2" />
                    Explore
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAction("download")}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAction("download-link")}>
                    <Link className="h-4 w-4 mr-2" />
                    Get Download Link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Go"
                )}
              </Button>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          Enter a repository URL to explore or download content. You can specify
          a repository, folder, or file path.
          <br />
          <span className="font-medium">Download:</span> Direct download
          &middot;
          <span className="font-medium">Explore:</span> Browse content &middot;
          <span className="font-medium">Get Link:</span> Copy a download link
        </p>
      </form>

      {/* Download Progress Modal */}
      {showProgress && (
        <DirectDownloadProgress
          progress={downloadProgress}
          isComplete={downloadProgress === 100}
          isError={downloadError}
          itemName={downloadingItemName}
          onCancel={() => {
            setDownloading(false);
            setShowProgress(false);
            setDownloadProgress(0);
            setDownloadError(false);
            setDownloadingItemName("");
          }}
          onClose={() => {
            setDownloading(false);
            setShowProgress(false);
            setDownloadProgress(0);
            setDownloadError(false);
            setDownloadingItemName("");
          }}
        />
      )}
    </div>
  );
};

export default RepoForm;
