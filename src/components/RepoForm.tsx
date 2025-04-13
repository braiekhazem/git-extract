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
import {
  Github,
  Gitlab,
  Download,
  Search,
  Loader2,
  Share2,
  Link,
} from "lucide-react";
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
  const [action, setAction] = useState<RepoActionType>("download");
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
        // Direct download behavior (repo, folder, or file)
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
          if (!path) {
            // This is a repository, download all files
            await createAndDownloadZip(repoData, repoData.files, (progress) => {
              console.log(`Download progress: ${progress}%`);
            });

            toast({
              title: "Repository Downloaded",
              description:
                "The repository has been downloaded successfully as a ZIP file.",
            });
          } else {
            // Check if it's a file or folder
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
          }
        } catch (error) {
          console.error("Download error:", error);
          toast({
            title: "Download Failed",
            description:
              "Could not download the content. It might not exist or you might not have access to it.",
            variant: "destructive",
          });
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

        const branch = repoData.currentBranch;

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
            const fileName = path.split("/").pop() || "file";
            const blob = new Blob([fileContent], {
              type: "application/octet-stream",
            });
            saveAs(blob, fileName);

            toast({
              title: "File Downloaded",
              description: `File ${fileName} has been downloaded successfully.`,
            });
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
        // Create and copy download link
        const { owner, repo, type, path } = parsedRepo;

        if (!path) {
          // For the entire repository, we can use the GitHub/GitLab download URL
          let downloadUrl = "";
          if (type === "github") {
            downloadUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/main.zip`;
          } else {
            downloadUrl = `https://gitlab.com/${owner}/${repo}/-/archive/main/${repo}-main.zip`;
          }

          // Copy the link to clipboard
          await navigator.clipboard.writeText(downloadUrl);

          toast({
            title: "Download Link Copied",
            description:
              "Repository download link has been copied to clipboard.",
          });
        } else {
          // For files or folders, we need to create a special link
          // This would ideally point to your own service that handles direct downloads
          // For demonstration, we'll create a URL with query parameters

          // Create a URL that would trigger a download when accessed
          const appUrl = window.location.origin;
          const downloadUrl = `${appUrl}/api/download?owner=${owner}&repo=${repo}&path=${encodeURIComponent(
            path
          )}&type=${type}`;

          // Copy the link to clipboard
          await navigator.clipboard.writeText(downloadUrl);

          toast({
            title: "Download Link Copied",
            description: "Direct download link has been copied to clipboard.",
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
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setAction("download")}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAction("explore")}>
                    <Search className="h-4 w-4 mr-2" />
                    Explore
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
    </div>
  );
};

// At the bottom of the file before the export
// Add this function to handle the API route for direct downloads

// This code would be used in an API route like /api/download
// You'd need to create this file and export this function
export const handleDownloadRequest = async (req: any, res: any) => {
  const { owner, repo, path, type } = req.query;

  if (!owner || !repo || !type) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    // Load repo data to get the current branch
    const url =
      type === "github"
        ? `https://github.com/${owner}/${repo}${
            path ? `/blob/main/${path}` : ""
          }`
        : `https://gitlab.com/${owner}/${repo}${
            path ? `/-/blob/main/${path}` : ""
          }`;

    const repoData = await loadRepoData(url);
    if (!repoData) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const branch = repoData.currentBranch;

    if (path) {
      // Check if it's a file or folder
      const files = await fetchRepoFiles(owner, repo, branch, type, path);

      if (files.length > 0) {
        // This is a directory, create a zip of all files
        const allFiles = files.map((file) => ({
          ...file,
          isSelected: true,
        }));

        // Create a zip file in memory
        const JSZip = require("jszip");
        const zip = new JSZip();

        for (const file of allFiles) {
          if (file.type === "file") {
            const content = await fetchFileContent(
              owner,
              repo,
              file.path,
              branch,
              type
            );
            zip.file(file.path, content);
          }
        }

        // Generate ZIP and send it as response
        const zipContent = await zip.generateAsync({ type: "nodebuffer" });
        res.setHeader("Content-Type", "application/zip");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${owner}-${repo}-${path.split("/").pop()}.zip"`
        );
        return res.send(zipContent);
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

        // Detect content type based on file extension
        const extension = fileName.split(".").pop()?.toLowerCase();
        let contentType = "application/octet-stream";

        // Set appropriate content type for common file types
        if (["js", "jsx", "ts", "tsx"].includes(extension))
          contentType = "text/javascript";
        else if (["html", "htm"].includes(extension)) contentType = "text/html";
        else if (extension === "css") contentType = "text/css";
        else if (["jpg", "jpeg"].includes(extension))
          contentType = "image/jpeg";
        else if (extension === "png") contentType = "image/png";
        else if (extension === "json") contentType = "application/json";
        else if (extension === "md") contentType = "text/markdown";

        res.setHeader("Content-Type", contentType);
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${fileName}"`
        );
        return res.send(fileContent);
      }
    } else {
      // This is a repository, return a zip of all files
      // For simplicity, we'll redirect to GitHub/GitLab's own download link
      if (type === "github") {
        return res.redirect(
          `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`
        );
      } else {
        return res.redirect(
          `https://gitlab.com/${owner}/${repo}/-/archive/${branch}/${repo}-${branch}.zip`
        );
      }
    }
  } catch (error) {
    console.error("Download error:", error);
    return res
      .status(500)
      .json({ error: "Failed to process download request" });
  }
};

export default RepoForm;
