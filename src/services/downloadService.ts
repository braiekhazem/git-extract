
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { RepoFile, RepoData } from '../types/repo';
import { fetchFileContent } from './repoService';

// Find all selected files recursively
export const getSelectedFiles = (files: RepoFile[]): RepoFile[] => {
  let selectedFiles: RepoFile[] = [];
  
  for (const file of files) {
    if (file.isSelected) {
      if (file.type === 'file') {
        selectedFiles.push(file);
      } else if (file.children) {
        // If a directory is selected, include all its files
        const allChildFiles = getAllFilesInDir(file);
        selectedFiles = [...selectedFiles, ...allChildFiles];
      }
    } else if (file.type === 'dir' && file.children) {
      // Check children for selection even if directory itself is not selected
      const childSelectedFiles = getSelectedFiles(file.children);
      selectedFiles = [...selectedFiles, ...childSelectedFiles];
    }
  }
  
  return selectedFiles;
};

// Get all files in a directory (recursively)
export const getAllFilesInDir = (dir: RepoFile): RepoFile[] => {
  let allFiles: RepoFile[] = [];
  
  if (!dir.children) {
    return allFiles;
  }
  
  for (const file of dir.children) {
    if (file.type === 'file') {
      allFiles.push(file);
    } else if (file.type === 'dir' && file.children) {
      const childFiles = getAllFilesInDir(file);
      allFiles = [...allFiles, ...childFiles];
    }
  }
  
  return allFiles;
};

// Create and download ZIP file
export const createAndDownloadZip = async (
  repoData: RepoData,
  selectedFiles: RepoFile[],
  setProgress: (progress: number) => void
): Promise<void> => {
  const zip = new JSZip();
  let processed = 0;
  
  try {
    for (const file of selectedFiles) {
      try {
        const content = await fetchFileContent(
          repoData.owner,
          repoData.repo,
          file.path,
          repoData.currentBranch,
          repoData.type
        );
        
        // Add file to ZIP
        zip.file(file.path, content);
        
        // Update progress
        processed++;
        const progress = Math.floor((processed / selectedFiles.length) * 100);
        setProgress(progress);
      } catch (error) {
        console.error(`Error adding ${file.path} to ZIP:`, error);
      }
    }
    
    // Generate ZIP file
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    
    // Download ZIP file
    saveAs(zipBlob, `${repoData.owner}-${repoData.repo}.zip`);
    
    // Complete progress
    setProgress(100);
  } catch (error) {
    console.error('Error creating ZIP file:', error);
    throw error;
  }
};

// Format file size
export const formatFileSize = (bytes?: number): string => {
  if (bytes === undefined || bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

// Get file icon based on file name/extension
export const getFileIcon = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return 'file-code';
    case 'json':
      return 'file-json';
    case 'md':
      return 'file-text';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
      return 'file-image';
    case 'mp3':
    case 'wav':
    case 'ogg':
      return 'file-audio';
    case 'mp4':
    case 'mov':
    case 'avi':
      return 'file-video';
    case 'pdf':
      return 'file-pdf';
    case 'zip':
    case 'rar':
    case 'gz':
    case 'tar':
      return 'file-archive';
    default:
      return 'file';
  }
};
