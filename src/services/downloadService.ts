import JSZip from "jszip";
import { saveAs } from "file-saver";
import { RepoFile, RepoData } from "../types/repo";
import { fetchFileContent, fetchRepoFiles } from "./repoService";

// Find all selected files recursively
export const getSelectedFiles = (files: RepoFile[]): RepoFile[] => {
  let selectedFiles: RepoFile[] = [];

  for (const file of files) {
    if (file.isSelected) {
      if (file.type === "file") {
        selectedFiles.push(file);
      } else if (file.type === "dir") {
        // If a directory is selected, include all its files
        const allChildFiles = getAllFilesInDir(file);
        selectedFiles = [...selectedFiles, ...allChildFiles];
      }
    } else if (file.type === "dir" && file.children) {
      // Check children for selection even if directory itself is not selected
      const childSelectedFiles = getSelectedFiles(file.children);
      selectedFiles = [...selectedFiles, ...childSelectedFiles];
    }
  }

  return selectedFiles;
};

// Get all files in a directory (recursively) - improved version
export const getAllFilesInDir = (dir: RepoFile): RepoFile[] => {
  let allFiles: RepoFile[] = [];

  if (!dir.children) {
    return allFiles;
  }

  for (const file of dir.children) {
    if (file.type === "file") {
      allFiles.push(file);
    } else if (file.type === "dir") {
      // Recursively get files from subdirectories
      const childFiles = getAllFilesInDir(file);
      allFiles = [...allFiles, ...childFiles];
    }
  }

  return allFiles;
};

// New function to collect all files from directories by loading them from API if needed
export const collectAllFilesFromDirectory = async (
  repoData: RepoData,
  dirPath: string
): Promise<RepoFile[]> => {
  try {
    const files = await fetchRepoFiles(
      repoData.owner,
      repoData.repo,
      repoData.currentBranch,
      repoData.type,
      dirPath
    );

    let allFiles: RepoFile[] = [];

    for (const file of files) {
      if (file.type === "file") {
        allFiles.push(file);
      } else if (file.type === "dir") {
        // Recursively collect files from subdirectories
        const subDirFiles = await collectAllFilesFromDirectory(
          repoData,
          file.path
        );
        allFiles = [...allFiles, ...subDirFiles];
      }
    }

    return allFiles;
  } catch (error) {
    console.error(`Error collecting files from directory ${dirPath}:`, error);
    return [];
  }
};

// Enhanced function to get selected files with proper directory handling
export const getSelectedFilesWithDirectoryExpansion = async (
  repoData: RepoData,
  selectedPaths: Set<string>
): Promise<RepoFile[]> => {
  let allSelectedFiles: RepoFile[] = [];

  // Find files in the current file tree
  const findFileByPath = (
    files: RepoFile[],
    targetPath: string
  ): RepoFile | null => {
    for (const file of files) {
      if (file.path === targetPath) {
        return file;
      }
      if (file.type === "dir" && file.children) {
        const found = findFileByPath(file.children, targetPath);
        if (found) return found;
      }
    }
    return null;
  };

  for (const selectedPath of selectedPaths) {
    const file = findFileByPath(repoData.files, selectedPath);

    if (file) {
      if (file.type === "file") {
        allSelectedFiles.push(file);
      } else if (file.type === "dir") {
        // For directories, collect all files (even if not loaded in UI)
        const allDirFiles = await collectAllFilesFromDirectory(
          repoData,
          file.path
        );
        allSelectedFiles = [...allSelectedFiles, ...allDirFiles];
      }
    }
  }

  return allSelectedFiles;
};

// Create and download ZIP file with enhanced progress tracking
export const createAndDownloadZip = async (
  repoData: RepoData,
  selectedFiles: RepoFile[],
  setProgress: (progress: number) => void
): Promise<void> => {
  const zip = new JSZip();
  let processed = 0;
  const totalFiles = selectedFiles.length;

  if (totalFiles === 0) {
    throw new Error("No files to download");
  }

  try {
    // Process files in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < selectedFiles.length; i += batchSize) {
      const batch = selectedFiles.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (file) => {
          try {
            const content = await fetchFileContent(
              repoData.owner,
              repoData.repo,
              file.path,
              repoData.currentBranch,
              repoData.type
            );

            // Add file to ZIP with proper path structure
            zip.file(file.path, content);

            // Update progress
            processed++;
            const progress = Math.floor((processed / totalFiles) * 90); // Reserve 10% for ZIP generation
            setProgress(progress);
          } catch (error) {
            console.error(`Error adding ${file.path} to ZIP:`, error);
            // Continue with other files even if one fails
            processed++;
            const progress = Math.floor((processed / totalFiles) * 90);
            setProgress(progress);
          }
        })
      );
    }

    // Generate ZIP file
    setProgress(95);
    const zipBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    // Download ZIP file
    const zipName =
      selectedFiles.length === 1 && selectedFiles[0].path.includes("/")
        ? `${repoData.owner}-${repoData.repo}-${selectedFiles[0].path
            .split("/")
            .pop()}.zip`
        : `${repoData.owner}-${repoData.repo}.zip`;

    saveAs(zipBlob, zipName);

    // Complete progress
    setProgress(100);
  } catch (error) {
    console.error("Error creating ZIP file:", error);
    throw error;
  }
};

// Generate download link for sharing
export const generateDownloadLink = (
  url: string,
  action: "download" | "explore" = "download"
): string => {
  const baseUrl = window.location.origin;
  const params = new URLSearchParams({
    url: encodeURIComponent(url),
    action,
  });
  return `${baseUrl}?${params.toString()}`;
};

// Format file size
export const formatFileSize = (bytes?: number): string => {
  if (bytes === undefined || bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

// Get file icon based on file name/extension
export const getFileIcon = (fileName: string): string => {
  const extension = fileName.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
      return "file-code";
    case "json":
      return "file-json";
    case "md":
      return "file-text";
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "svg":
      return "file-image";
    case "mp3":
    case "wav":
    case "ogg":
      return "file-audio";
    case "mp4":
    case "mov":
    case "avi":
      return "file-video";
    case "pdf":
      return "file-pdf";
    case "zip":
    case "rar":
    case "gz":
    case "tar":
      return "file-archive";
    default:
      return "file";
  }
};
