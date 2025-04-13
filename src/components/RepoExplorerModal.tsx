
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RepoData, RepoFile } from '../types/repo';
import BranchSelector from './BranchSelector';
import FileTree from './FileTree';
import { Button } from '@/components/ui/button';
import { loadRepoData, saveRepoToExamples } from '../services/repoService';
import { createAndDownloadZip, getSelectedFiles } from '../services/downloadService';
import { Download, Loader2, Save, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import DownloadProgress from './DownloadProgress';
import { useToast } from '@/hooks/use-toast';

interface RepoExplorerModalProps {
  repoUrl: string;
  open: boolean;
  onClose: () => void;
}

const RepoExplorerModal: React.FC<RepoExplorerModalProps> = ({ 
  repoUrl,
  open,
  onClose
}) => {
  const [repoData, setRepoData] = useState<RepoData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedFilePaths, setSelectedFilePaths] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [showProgress, setShowProgress] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const { toast } = useToast();

  // Reset state when modal opens with new URL
  useEffect(() => {
    if (open && repoUrl) {
      setLoading(true);
      setSelectedFilePaths(new Set());
      setExpandedFolders(new Set());
      setSaved(false);
      loadRepo(repoUrl);
    }
  }, [repoUrl, open]);

  const loadRepo = async (url: string, branch?: string) => {
    setLoading(true);
    try {
      const data = await loadRepoData(url, branch);
      setRepoData(data);
      
      if (data) {
        // Expand the root folders by default
        const rootFolders = data.files
          .filter(file => file.type === 'dir')
          .map(file => file.path);
        
        setExpandedFolders(new Set(rootFolders));
        
        // If initialPath is provided (direct file/folder link), preselect and expand those paths
        if (data.initialPath) {
          const pathParts = data.initialPath.split('/');
          let currentPath = '';
          
          // Expand all parent folders
          pathParts.forEach((part, index) => {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            
            // Only expand if this is a directory (not the last part or last part is a directory)
            if (index < pathParts.length - 1) {
              setExpandedFolders(prev => new Set([...prev, currentPath]));
            }
          });
          
          // Select the target file/folder
          setSelectedFilePaths(new Set([data.initialPath]));
        }
      }
    } catch (error) {
      toast({
        title: "Error loading repository",
        description: "Failed to load repository data. Please check the URL and try again.",
        variant: "destructive"
      });
      console.error("Error loading repository:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBranchChange = async (branch: string) => {
    if (!repoData) return;
    
    setLoading(true);
    setSelectedFilePaths(new Set());
    setExpandedFolders(new Set());
    
    try {
      await loadRepo(repoUrl, branch);
    } catch (error) {
      console.error("Error switching branch:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (path: string, isSelected: boolean) => {
    setSelectedFilePaths(prevSelected => {
      const newSelected = new Set(prevSelected);
      
      if (isSelected) {
        newSelected.add(path);
      } else {
        newSelected.delete(path);
      }
      
      return newSelected;
    });
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prevExpanded => {
      const newExpanded = new Set(prevExpanded);
      
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
      } else {
        newExpanded.add(path);
      }
      
      return newExpanded;
    });
  };

  const selectAll = () => {
    if (!repoData) return;
    
    const allPaths = getAllPaths(repoData.files);
    setSelectedFilePaths(new Set(allPaths));
  };

  const unselectAll = () => {
    setSelectedFilePaths(new Set());
  };

  const getAllPaths = (files: RepoFile[]): string[] => {
    let paths: string[] = [];
    
    for (const file of files) {
      paths.push(file.path);
      
      if (file.type === 'dir' && file.children) {
        paths = [...paths, ...getAllPaths(file.children)];
      }
    }
    
    return paths;
  };

  const handleDownload = async () => {
    if (!repoData) return;
    
    if (selectedFilePaths.size === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file or folder to download.",
        variant: "destructive"
      });
      return;
    }
    
    setDownloading(true);
    setProgress(0);
    setIsComplete(false);
    setIsError(false);
    setShowProgress(true);
    
    try {
      // Get all selected files and their data
      const allFiles = getSelectedFilesToDownload();
      
      // Create and download the ZIP
      await createAndDownloadZip(repoData, allFiles, setProgress);
      
      setIsComplete(true);
      toast({
        title: "Download complete",
        description: `Successfully downloaded ${allFiles.length} files.`
      });
    } catch (error) {
      console.error("Download error:", error);
      setIsError(true);
      toast({
        title: "Download failed",
        description: "An error occurred while creating your ZIP file.",
        variant: "destructive"
      });
    } finally {
      setDownloading(false);
    }
  };

  const getSelectedFilesToDownload = (): RepoFile[] => {
    if (!repoData) return [];
    
    const getFilesToDownload = (files: RepoFile[]): RepoFile[] => {
      let result: RepoFile[] = [];
      
      for (const file of files) {
        const isSelected = selectedFilePaths.has(file.path);
        
        if (isSelected) {
          if (file.type === 'dir' && file.children) {
            // If a directory is selected, include all of its files
            const allChildFiles = getAllFilesInDir(file);
            result = [...result, ...allChildFiles];
          } else if (file.type === 'file') {
            result.push(file);
          }
        } else if (file.type === 'dir' && file.children) {
          // If directory is not selected, check its children
          const childrenToDownload = getFilesToDownload(file.children);
          result = [...result, ...childrenToDownload];
        }
      }
      
      return result;
    };
    
    const getAllFilesInDir = (dir: RepoFile): RepoFile[] => {
      let result: RepoFile[] = [];
      
      if (!dir.children) return result;
      
      for (const child of dir.children) {
        if (child.type === 'file') {
          result.push(child);
        } else if (child.type === 'dir' && child.children) {
          result = [...result, ...getAllFilesInDir(child)];
        }
      }
      
      return result;
    };
    
    return getFilesToDownload(repoData.files);
  };

  const handleSaveRepo = () => {
    if (!repoData) return;
    
    saveRepoToExamples(repoData);
    setSaved(true);
    toast({
      title: "Repository saved",
      description: "This repository has been added to your examples."
    });
  };

  if (!open) return null;

  const selectedCount = repoData ? getSelectedFilesToDownload().length : 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) onClose();
    }}>
      <DialogContent className="max-w-4xl w-full h-[80vh] p-0 flex flex-col">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              {loading ? "Loading Repository..." : repoData ? `${repoData.owner}/${repoData.repo}` : "Repository Explorer"}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1 p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h3 className="text-xl font-medium">Loading repository data...</h3>
            <p className="text-muted-foreground">This may take a moment for large repositories.</p>
          </div>
        ) : !repoData ? (
          <div className="flex flex-col items-center justify-center flex-1 p-8">
            <h3 className="text-xl font-medium text-red-500">Repository not found</h3>
            <p className="text-muted-foreground mb-4">Unable to load the repository data.</p>
            <Button onClick={onClose}>Try a different repository</Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 bg-card border-b">
              <div className="space-y-1">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  {repoData.type === 'github' ? (
                    <Badge className="bg-black text-white">GitHub</Badge>
                  ) : (
                    <Badge className="bg-orange-600 text-white">GitLab</Badge>
                  )}
                  {repoData.owner}/{repoData.repo}
                </h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BranchSelector
                    branches={repoData.branches}
                    currentBranch={repoData.currentBranch}
                    onChange={handleBranchChange}
                    disabled={downloading}
                  />
                </div>
              </div>
              
              <div className="flex flex-col w-full md:w-auto gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={selectAll}
                    disabled={downloading}
                  >
                    Select All
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={unselectAll}
                    disabled={downloading}
                  >
                    Unselect All
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSaveRepo}
                    disabled={downloading || saved}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saved ? "Saved" : "Save to Examples"}
                  </Button>
                  <Button 
                    onClick={handleDownload}
                    disabled={selectedCount === 0 || downloading}
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download ({selectedCount})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto">
              {repoData.files && repoData.files.length > 0 ? (
                <div className="p-2">
                  <FileTree
                    files={repoData.files}
                    onFileSelect={handleFileSelect}
                    selectedFiles={selectedFilePaths}
                    expandedFolders={expandedFolders}
                    toggleFolder={toggleFolder}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full p-8 text-center">
                  <p className="text-muted-foreground">
                    This repository is empty or doesn't have any files in the current branch.
                  </p>
                </div>
              )}
            </div>
            
            {showProgress && (
              <DownloadProgress
                progress={progress}
                isComplete={isComplete}
                isError={isError}
                onCancel={() => {
                  setDownloading(false);
                  setShowProgress(false);
                }}
                onClose={() => setShowProgress(false)}
                selectedCount={selectedCount}
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RepoExplorerModal;
