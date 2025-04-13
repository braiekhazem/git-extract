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
import { createAndDownloadZip } from "../services/downloadService";
import { Github, Gitlab, Download, Search, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RepoFormProps {
  onSubmit: (url: string, action: RepoActionType) => void;
  isLoading: boolean;
}

const RepoForm: React.FC<RepoFormProps> = ({ onSubmit, isLoading }) => {
  const [url, setUrl] = useState("");
  const [action, setAction] = useState<RepoActionType>("explore");
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

      if (action === "download-file-folder") {
        // Direct download behavior
        if (!parsedRepo.path) {
          toast({
            title: "Invalid URL",
            description: "Please specify a file or folder path in the URL",
            variant: "destructive",
          });
          return;
        }

        const { owner, repo, type, path } = parsedRepo;

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

        // Use the current branch from repoData
        const branch = repoData.currentBranch;

        try {
          // First try to get the file/folder info to determine if it's a file or directory
          const files = await fetchRepoFiles(owner, repo, branch, type, path);

          if (files.length > 0) {
            // This is a directory, create a zip of all files
            const allFiles = files.map((file) => ({
              ...file,
              isSelected: true,
            }));

            await createAndDownloadZip(repoData, allFiles, (progress) => {
              console.log(`Download progress: ${progress}%`);
            });

            toast({
              title: "Folder Downloaded",
              description:
                "The folder has been downloaded successfully as a ZIP file.",
            });
          } else {
            // This is a single file
            const fileContent = await fetchFileContent(
              owner,
              repo,
              path,
              branch,
              type
            );

            // Get the file name from the path
            const fileName = path.split("/").pop() || "file";

            // Create a blob and download it
            const blob = new Blob([fileContent], {
              type: "application/octet-stream",
            });
            saveAs(blob, fileName);

            toast({
              title: "File Downloaded",
              description: `File ${fileName} has been downloaded successfully.`,
            });
          }
        } catch (error) {
          console.error("Download error:", error);
          toast({
            title: "Download Failed",
            description:
              "Could not download the file or folder. It might not exist or you might not have access to it.",
            variant: "destructive",
          });
        }
      } else {
        // For explore action, open the modal
        onSubmit(url, action);
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
                    {action === "explore" ? (
                      <>
                        <Search className="h-4 w-4" /> Explore
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" /> Download
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setAction("explore")}>
                    <Search className="h-4 w-4 mr-2" />
                    Explore Repository
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setAction("download-file-folder")}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download File/Folder
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
          Enter a repository URL to explore its contents or download specific
          files/folders.
          <br />
          For direct downloads, include the file or folder path in the URL.
        </p>
      </form>
    </div>
  );
};

export default RepoForm;
