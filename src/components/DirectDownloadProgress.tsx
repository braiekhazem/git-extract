import React from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { X, Download, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DirectDownloadProgressProps {
  progress: number;
  isComplete: boolean;
  isError: boolean;
  itemName: string;
  onCancel: () => void;
  onClose: () => void;
}

const DirectDownloadProgress: React.FC<DirectDownloadProgressProps> = ({
  progress,
  isComplete,
  isError,
  itemName,
  onCancel,
  onClose,
}) => {
  return (
    <div
      className={cn(
        "fixed top-4 right-4 bg-card border border-border p-4 rounded-lg shadow-lg w-96 space-y-3 transition-all z-50",
        "animate-in slide-in-from-right duration-300",
        isComplete &&
          "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
        isError &&
          "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
      )}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3 flex-1">
          {isComplete ? (
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-2">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          ) : isError ? (
            <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          ) : (
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
              <Download className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-pulse" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">
              {isComplete
                ? "Download Complete!"
                : isError
                ? "Download Failed"
                : "Downloading..."}
            </p>
            <p className="text-xs text-muted-foreground truncate">{itemName}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 ml-2 flex-shrink-0"
          onClick={onClose}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {!isComplete && !isError && (
        <>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">{progress}% complete</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={onCancel}
            >
              Cancel
            </Button>
          </div>
        </>
      )}

      {(isComplete || isError) && (
        <p className="text-xs text-muted-foreground">
          {isComplete
            ? "Your download should start automatically."
            : "Please check the URL and try again."}
        </p>
      )}
    </div>
  );
};

export default DirectDownloadProgress;
