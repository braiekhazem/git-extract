import React from "react";
import { RepoFile } from "../types/repo";
import { Checkbox } from "@/components/ui/checkbox";
import {
  File,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileImage,
  FileAudio,
  FileVideo,
  File as FileIcon,
  ChevronRight,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { getFileIcon, formatFileSize } from "../services/downloadService";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FileTreeProps {
  files: RepoFile[];
  onFileSelect: (path: string, isSelected: boolean) => void;
  selectedFiles: Set<string>;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  level?: number;
}

const FileTree: React.FC<FileTreeProps> = ({
  files,
  onFileSelect,
  selectedFiles,
  expandedFolders,
  toggleFolder,
  level = 0,
}) => {
  const getFileIconComponent = (file: RepoFile) => {
    if (file.type === "dir") {
      if (file.isLoading) {
        return (
          <Loader2 size={18} className="shrink-0 text-blue-500 animate-spin" />
        );
      }

      return expandedFolders.has(file.path) ? (
        <FolderOpen size={18} className="shrink-0 text-amber-500" />
      ) : (
        <Folder size={18} className="shrink-0 text-amber-500" />
      );
    }

    const iconType = getFileIcon(file.name);
    switch (iconType) {
      case "file-code":
        return <FileCode size={18} className="shrink-0 text-blue-500" />;
      case "file-text":
        return <FileText size={18} className="shrink-0 text-gray-500" />;
      case "file-image":
        return <FileImage size={18} className="shrink-0 text-green-500" />;
      case "file-audio":
        return <FileAudio size={18} className="shrink-0 text-purple-500" />;
      case "file-video":
        return <FileVideo size={18} className="shrink-0 text-red-500" />;
      default:
        return <FileIcon size={16} className="shrink-0 text-gray-500" />;
    }
  };

  return (
    <TooltipProvider>
      <ul className="space-y-0.5">
        {files
          .sort((a, b) => {
            // Sort directories first, then files
            if (a.type !== b.type) {
              return a.type === "dir" ? -1 : 1;
            }
            // Then sort alphabetically
            return a.name.localeCompare(b.name);
          })
          .map((file) => (
            <li key={file.path} className="select-none text-sm">
              <div
                className={`flex items-center p-1.5 rounded-md transition-colors ${
                  selectedFiles.has(file.path)
                    ? "bg-primary/10"
                    : "hover:bg-muted"
                }`}
                style={{ paddingLeft: `${level * 24 + 6}px` }}
              >
                <Checkbox
                  id={`select-${file.path}`}
                  checked={selectedFiles.has(file.path)}
                  onCheckedChange={(checked) =>
                    onFileSelect(file.path, checked === true)
                  }
                  className="mr-3"
                />

                <div
                  className="flex items-center gap-2.5 flex-1 cursor-pointer truncate"
                  onClick={() =>
                    file.type === "dir"
                      ? toggleFolder(file.path)
                      : onFileSelect(file.path, !selectedFiles.has(file.path))
                  }
                >
                  <span className="w-5 flex items-center shrink-0">
                    {getFileIconComponent(file)}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="truncate">{file.name}</span>
                    </TooltipTrigger>
                    {file.type === "dir" && !file.isLoading && (
                      <TooltipContent side="right">
                        <p>
                          Click to{" "}
                          {expandedFolders.has(file.path)
                            ? "collapse"
                            : "expand"}{" "}
                          folder
                        </p>
                      </TooltipContent>
                    )}
                    {file.type === "dir" && file.isLoading && (
                      <TooltipContent side="right">
                        <p>Loading folder contents...</p>
                      </TooltipContent>
                    )}
                    {file.name.length > 30 && (
                      <TooltipContent side="right">
                        <p>{file.name}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>

                  {file.type === "file" && file.size !== undefined && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatFileSize(file.size)}
                    </span>
                  )}

                  {file.type === "dir" && (
                    <span className="text-xs text-muted-foreground ml-auto pr-2">
                      {expandedFolders.has(file.path) ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </span>
                  )}
                </div>
              </div>

              {file.type === "dir" &&
                file.children &&
                expandedFolders.has(file.path) && (
                  <FileTree
                    files={file.children}
                    onFileSelect={onFileSelect}
                    selectedFiles={selectedFiles}
                    expandedFolders={expandedFolders}
                    toggleFolder={toggleFolder}
                    level={level + 1}
                  />
                )}
            </li>
          ))}
      </ul>
    </TooltipProvider>
  );
};

export default FileTree;
