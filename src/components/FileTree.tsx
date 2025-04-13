
import React from 'react';
import { RepoFile } from '../types/repo';
import { Checkbox } from '@/components/ui/checkbox';
import { File, Folder, FolderOpen, FileCode, FileText, FileImage, FileAudio, FileVideo, File as FileIcon } from 'lucide-react';
import { getFileIcon, formatFileSize } from '../services/downloadService';

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
  level = 0
}) => {
  const getFileIconComponent = (file: RepoFile) => {
    if (file.type === 'dir') {
      return expandedFolders.has(file.path) ? (
        <FolderOpen size={18} className="shrink-0 text-amber-500" />
      ) : (
        <Folder size={18} className="shrink-0 text-amber-500" />
      );
    }

    const iconType = getFileIcon(file.name);
    switch (iconType) {
      case 'file-code':
        return <FileCode size={18} className="shrink-0 text-blue-500" />;
      case 'file-text':
        return <FileText size={18} className="shrink-0 text-gray-500" />;
      case 'file-image':
        return <FileImage size={18} className="shrink-0 text-green-500" />;
      case 'file-audio':
        return <FileAudio size={18} className="shrink-0 text-purple-500" />;
      case 'file-video':
        return <FileVideo size={18} className="shrink-0 text-red-500" />;
      default:
        return <FileIcon size={18} className="shrink-0 text-gray-500" />;
    }
  };

  return (
    <ul className="space-y-1">
      {files.sort((a, b) => {
        // Sort directories first, then files
        if (a.type !== b.type) {
          return a.type === 'dir' ? -1 : 1;
        }
        // Then sort alphabetically
        return a.name.localeCompare(b.name);
      }).map((file) => (
        <li key={file.path} className="select-none">
          <div 
            className={`flex items-center gap-2 p-1 rounded-md hover:bg-muted ${
              selectedFiles.has(file.path) ? 'bg-muted' : ''
            }`}
            style={{ paddingLeft: `${level * 12 + 4}px` }}
          >
            <Checkbox 
              checked={selectedFiles.has(file.path)} 
              onCheckedChange={(checked) => onFileSelect(file.path, checked === true)}
              className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
            />
            
            <div 
              className="flex items-center gap-2 flex-1 cursor-pointer"
              onClick={() => file.type === 'dir' ? toggleFolder(file.path) : null}
            >
              {getFileIconComponent(file)}
              <span className="text-sm truncate">{file.name}</span>
              
              {file.type === 'file' && file.size !== undefined && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatFileSize(file.size)}
                </span>
              )}
            </div>
          </div>
          
          {file.type === 'dir' && file.children && expandedFolders.has(file.path) && (
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
  );
};

export default FileTree;
