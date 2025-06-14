import React from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  const getFileIconComponent = (file: RepoFile) => {
    if (file.type === "dir") {
      if (file.isLoading) {
        return (
          <Loader2 size={16} className="shrink-0 text-primary animate-spin" />
        );
      }

      return expandedFolders.has(file.path) ? (
        <FolderOpen
          size={16}
          className="shrink-0 text-warning transition-colors"
        />
      ) : (
        <Folder size={16} className="shrink-0 text-warning transition-colors" />
      );
    }

    const iconType = getFileIcon(file.name);
    switch (iconType) {
      case "file-code":
        return (
          <FileCode
            size={16}
            className="shrink-0 text-primary transition-colors"
          />
        );
      case "file-text":
        return (
          <FileText
            size={16}
            className="shrink-0 text-muted-foreground transition-colors"
          />
        );
      case "file-image":
        return (
          <FileImage
            size={16}
            className="shrink-0 text-success transition-colors"
          />
        );
      case "file-audio":
        return (
          <FileAudio
            size={16}
            className="shrink-0 text-purple-500 transition-colors"
          />
        );
      case "file-video":
        return (
          <FileVideo
            size={16}
            className="shrink-0 text-red-500 transition-colors"
          />
        );
      default:
        return (
          <FileIcon
            size={16}
            className="shrink-0 text-muted-foreground transition-colors"
          />
        );
    }
  };

  return (
    <TooltipProvider>
      <ul className="space-y-1">
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
                className={`flex items-center p-2 rounded-lg transition-all duration-200 group ${
                  selectedFiles.has(file.path)
                    ? "bg-primary/15 border border-primary/30 shadow-sm"
                    : "hover:bg-primary/5 hover:shadow-sm"
                }`}
                style={{ paddingLeft: `${level * 20 + 8}px` }}
              >
                <Checkbox
                  id={`select-${file.path}`}
                  checked={selectedFiles.has(file.path)}
                  onCheckedChange={(checked) =>
                    onFileSelect(file.path, checked === true)
                  }
                  className="mr-3 data-[state=checked]:border-primary data-[state=checked]:bg-primary transition-colors"
                />

                <div
                  className="flex items-center gap-3 flex-1 cursor-pointer truncate"
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
                      <span
                        className={`truncate font-medium transition-colors ${
                          selectedFiles.has(file.path)
                            ? "text-primary"
                            : "group-hover:text-foreground"
                        }`}
                      >
                        {file.name}
                      </span>
                    </TooltipTrigger>
                    {file.type === "dir" && !file.isLoading && (
                      <TooltipContent
                        side="right"
                        className="bg-popover border"
                      >
                        <p>
                          {expandedFolders.has(file.path)
                            ? t("fileTree.clickToCollapse")
                            : t("fileTree.clickToExpand")}
                        </p>
                      </TooltipContent>
                    )}
                    {file.type === "dir" && file.isLoading && (
                      <TooltipContent
                        side="right"
                        className="bg-popover border"
                      >
                        <p>{t("fileTree.loadingContents")}</p>
                      </TooltipContent>
                    )}
                    {file.name.length > 30 && (
                      <TooltipContent
                        side="right"
                        className="bg-popover border"
                      >
                        <p>{file.name}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>

                  <div className="flex items-center gap-2 ml-auto">
                    {file.type === "file" && file.size !== undefined && (
                      <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                        {formatFileSize(file.size)}
                      </span>
                    )}

                    {file.type === "dir" && (
                      <span className="text-muted-foreground transition-transform duration-200 group-hover:text-primary">
                        {expandedFolders.has(file.path) ? (
                          <ChevronDown
                            size={16}
                            className="transform rotate-0 transition-transform"
                          />
                        ) : (
                          <ChevronRight
                            size={16}
                            className="transform rotate-0 transition-transform group-hover:rotate-90"
                          />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {file.type === "dir" &&
                file.children &&
                expandedFolders.has(file.path) && (
                  <div className="overflow-hidden animate-fade-in">
                    <FileTree
                      files={file.children}
                      onFileSelect={onFileSelect}
                      selectedFiles={selectedFiles}
                      expandedFolders={expandedFolders}
                      toggleFolder={toggleFolder}
                      level={level + 1}
                    />
                  </div>
                )}
            </li>
          ))}
      </ul>
    </TooltipProvider>
  );
};

export default FileTree;
