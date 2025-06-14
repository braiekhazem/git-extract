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
      icon: <DownloadCloud className="h-6 w-6 text-primary animate-pulse" />,
      title: `Downloading ${selectedCount} files...`,
      description: `${progress}% complete`,
      bgColor: "bg-card border-primary/20",
      progressColor: "bg-primary",
    },
    complete: {
      icon: (
        <CheckCircle2 className="h-6 w-6 text-success animate-pulse-glow" />
      ),
      title: "Download Complete!",
      description: "Your files have been saved successfully.",
      bgColor: "bg-success/10 border-success/30",
      progressColor: "bg-success",
    },
    error: {
      icon: <AlertTriangle className="h-6 w-6 text-red-500" />,
      title: "Download Failed",
      description: "An error occurred. Please try again.",
      bgColor: "bg-red-500/10 border-red-500/30",
      progressColor: "bg-red-500",
    },
  };

  const currentStatus = statusConfig[status];

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 w-full max-w-sm rounded-xl border-2 shadow-2xl transition-all backdrop-blur-sm",
        "animate-slide-in-from-bottom",
        currentStatus.bgColor
      )}
    >
      <div className="flex items-start p-5">
        <div className="shrink-0 p-2 rounded-lg bg-background/50">
          {currentStatus.icon}
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-semibold mb-1">{currentStatus.title}</p>
          <p className="text-xs text-muted-foreground mb-3">
            {currentStatus.description}
          </p>
          {status === "downloading" && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2 bg-muted/50" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span className="font-medium">{progress}%</span>
              </div>
            </div>
          )}
          {status === "complete" && (
            <div className="w-full h-2 bg-success/20 rounded-full overflow-hidden">
              <div className="h-full bg-success rounded-full animate-shimmer" />
            </div>
          )}
        </div>
        <div className="ml-4 flex shrink-0">
          {status === "downloading" ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs hover:bg-background/50 transition-colors"
              onClick={onCancel}
            >
              Cancel
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-background/50 transition-colors rounded-full"
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
