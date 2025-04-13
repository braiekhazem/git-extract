import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseRepoUrl } from "../services/repoService";
import { Github, GitBranch, Gitlab, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RepoFormProps {
  onSubmit: (
    url: string,
    action: "explore" | "download-file" | "download-folder"
  ) => void;
  isLoading: boolean;
}

const RepoForm: React.FC<RepoFormProps> = ({ onSubmit, isLoading }) => {
  const [url, setUrl] = useState("");
  const [action, setAction] = useState<
    "explore" | "download-file" | "download-folder"
  >("explore");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedRepo = parseRepoUrl(url.trim());
    if (!parsedRepo) {
      toast({
        title: "Invalid Repository URL",
        description: "Please enter a valid GitHub or GitLab repository URL",
        variant: "destructive",
      });
      return;
    }

    // For direct download actions, make sure we have a path
    if (
      (action === "download-file" || action === "download-folder") &&
      !parsedRepo.path
    ) {
      toast({
        title: "Invalid URL for direct download",
        description: `Please enter a direct ${
          action === "download-file" ? "file" : "folder"
        } URL to download`,
        variant: "destructive",
      });
      return;
    }

    onSubmit(url.trim(), action);
  };

  const getActionLabel = () => {
    switch (action) {
      case "explore":
        return "Explore";
      case "download-file":
        return "Download File";
      case "download-folder":
        return "Download Folder";
      default:
        return "Explore";
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Github className="h-5 w-5" />
        <GitBranch className="h-5 w-5" />
        <Gitlab className="h-5 w-5" />
        <h2 className="text-lg font-medium">Enter Repository URL</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="text"
          placeholder="https://github.com/user/repository or https://gitlab.com/user/repository"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-grow"
          required
        />
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1">
                {getActionLabel()} <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setAction("explore")}>
                Explore Repository
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAction("download-file")}>
                Download File
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAction("download-folder")}>
                Download Folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Loading..." : "Go"}
          </Button>
        </div>
      </form>

      <p className="text-xs text-muted-foreground">
        Enter the URL of a public GitHub or GitLab repository, file, or folder.
      </p>
    </div>
  );
};

export default RepoForm;
