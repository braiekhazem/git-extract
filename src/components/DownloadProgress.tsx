
import React, { useEffect } from 'react';
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { X, Download, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DownloadProgressProps {
  progress: number;
  isComplete: boolean;
  isError: boolean;
  onCancel: () => void;
  onClose: () => void;
  selectedCount: number;
}

const DownloadProgress: React.FC<DownloadProgressProps> = ({
  progress,
  isComplete,
  isError,
  onCancel,
  onClose,
  selectedCount
}) => {
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isComplete || isError) {
      timeoutId = setTimeout(() => {
        onClose();
      }, 3000);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isComplete, isError, onClose]);
  
  return (
    <div className={cn(
      "fixed bottom-6 right-6 bg-card border border-border p-4 rounded-lg shadow-lg w-80 space-y-3 transition-all",
      "animate-slide-in-right",
      isComplete && "bg-green-50 dark:bg-green-900/20",
      isError && "bg-red-50 dark:bg-red-900/20"
    )}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
          ) : isError ? (
            <X className="h-5 w-5 text-red-600 dark:text-red-400" />
          ) : (
            <Download className="h-5 w-5 animate-pulse" />
          )}
          
          <span className="font-medium">
            {isComplete 
              ? "Download Complete!" 
              : isError 
              ? "Download Failed" 
              : `Downloading ${selectedCount} files...`}
          </span>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {!isComplete && !isError ? (
        <>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progress}% complete</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 p-0 text-xs"
              onClick={onCancel}
            >
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {isComplete 
            ? "Your files have been downloaded successfully." 
            : "An error occurred while downloading your files. Please try again."}
        </p>
      )}
    </div>
  );
};

export default DownloadProgress;
