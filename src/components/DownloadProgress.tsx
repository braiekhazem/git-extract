import React from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { X, DownloadCloud, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

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
  selectedCount,
}) => {
  const status = isComplete ? "complete" : isError ? "error" : "downloading";

  const statusConfig = {
    downloading: {
      icon: <DownloadCloud className="h-6 w-6 text-primary" />,
      title: `Downloading ${selectedCount} files...`,
      description: `${progress}% complete`,
      color: "bg-card",
    },
    complete: {
      icon: <CheckCircle2 className="h-6 w-6 text-green-500" />,
      title: "Download Complete!",
      description: "Your files have been saved.",
      color: "border-green-500/50 bg-green-500/10",
    },
    error: {
      icon: <AlertTriangle className="h-6 w-6 text-red-500" />,
      title: "Download Failed",
      description: "An error occurred. Please try again.",
      color: "border-red-500/50 bg-red-500/10",
    },
  };

  const currentStatus = statusConfig[status];

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 w-full max-w-sm rounded-lg border shadow-lg transition-all",
        "animate-in slide-in-from-bottom-5",
        currentStatus.color
      )}
    >
      <div className="flex items-start p-4">
        <div className="shrink-0">{currentStatus.icon}</div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium">{currentStatus.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {currentStatus.description}
          </p>
          {status === "downloading" && (
            <Progress value={progress} className="mt-2 h-2" />
          )}
        </div>
        <div className="ml-4 flex shrink-0">
          {status === "downloading" ? (
            <Button
              variant="ghost"
              size="sm"
              className="-my-1"
              onClick={onCancel}
            >
              Cancel
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 -my-1"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DownloadProgress;
