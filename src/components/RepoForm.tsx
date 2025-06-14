import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { RepoActionType } from "../types/repo";
import { saveAs } from "file-saver";
import {
  loadRepoData,
  fetchFileContent,
  parseRepoUrl,
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

    if (action === "download-link") {
      const link = generateDownloadLink(url);
      navigator.clipboard.writeText(link);
      toast({
        title: "Link Copied",
        description:
          "A shareable download link has been copied to your clipboard.",
      });
      return;
    }

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
        // For explore, just submit. The main page will handle opening the modal.
        onSubmit(url, "explore");
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Could not process the URL. Please ensure it's correct.",
        variant: "destructive",
      });
    }
  };

  const ActionButtonContent = () => {
    switch (action) {
      case "explore":
        return (
          <>
            <Search className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Explore</span>
            <span className="sm:hidden">Browse</span>
          </>
        );
      case "download":
        return (
          <>
            <Download className="h-4 w-4 mr-2" />
            Download
          </>
        );
      case "download-link":
        return (
          <>
            <Link className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Get Link</span>
            <span className="sm:hidden">Link</span>
          </>
        );
    }
  };

  return (
    <div className="max-w-xl mx-auto px-2 sm:px-0">
      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        <div className="space-y-3 md:space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="repo-url"
              className="font-semibold text-sm md:text-base animate-fade-in-up"
            >
              Enter a public repository URL
            </label>
            <div className="relative animate-fade-in-up animation-delay-200">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Link className="h-4 w-4" />
              </span>
              <Input
                id="repo-url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="e.g., https://github.com/facebook/react"
                className="pl-10 h-11 md:h-12 text-sm md:text-base focus-enhanced border-2 hover:border-primary/30 transition-colors"
                disabled={isLoading || downloading}
                autoFocus
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm text-muted-foreground animate-fade-in-up animation-delay-300">
            <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-primary/10 rounded-full">
              <Github className="h-3 md:h-3.5 w-3 md:w-3.5 text-primary" />
              <span className="font-medium">GitHub</span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-orange-500/10 rounded-full">
              <Gitlab className="h-3 md:h-3.5 w-3 md:w-3.5 text-orange-500" />
              <span className="font-medium">GitLab</span>
            </div>
            <span className="text-xs hidden sm:inline">
              Supports public repository, folder, and file URLs.
            </span>
            <span className="text-xs sm:hidden">Supports public URLs</span>
          </div>
        </div>

        <div className="flex animate-fade-in-up animation-delay-400">
          <Button
            type="submit"
            disabled={!url || isLoading || downloading}
            className="flex-1 rounded-r-none h-11 md:h-12 text-sm md:text-base font-semibold btn-primary-gradient"
          >
            {isLoading || downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ActionButtonContent />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="w-11 md:w-12 h-11 md:h-12 rounded-l-none border-l-0 bg-background/50 hover:bg-primary/10 border-2 hover:border-primary/30 transition-colors"
                disabled={isLoading || downloading}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 sm:w-48">
              <DropdownMenuItem
                onSelect={() => setAction("explore")}
                className="cursor-pointer hover:bg-primary/10 p-3"
              >
                <Search className="h-4 w-4 mr-2 text-primary" />
                <div>
                  <div className="font-medium text-sm">Explore Files</div>
                  <div className="text-xs text-muted-foreground">
                    Browse and select files
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setAction("download")}
                className="cursor-pointer hover:bg-primary/10 p-3"
              >
                <Download className="h-4 w-4 mr-2 text-primary" />
                <div>
                  <div className="font-medium text-sm">Direct Download</div>
                  <div className="text-xs text-muted-foreground">
                    Download entire repository
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setAction("download-link")}
                className="cursor-pointer hover:bg-primary/10 p-3"
              >
                <Link className="h-4 w-4 mr-2 text-primary" />
                <div>
                  <div className="font-medium text-sm">Get Download Link</div>
                  <div className="text-xs text-muted-foreground">
                    Copy shareable link
                  </div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </form>

      {showProgress && (
        <div className="mt-4 md:mt-6 animate-slide-in-from-bottom">
          <DirectDownloadProgress
            progress={downloadProgress}
            isComplete={downloadProgress === 100 && !downloadError}
            isError={downloadError}
            itemName={downloadingItemName}
            onCancel={() => {
              setDownloading(false);
              setShowProgress(false);
            }}
            onClose={() => {
              setShowProgress(false);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default RepoForm;
