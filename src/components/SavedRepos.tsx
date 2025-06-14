import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { SavedRepo } from "../types/repo";
import { Github, Gitlab, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { removeSavedRepo } from "../services/repoService";
import { formatDistanceToNow } from "date-fns";

interface SavedReposProps {
  savedRepos: SavedRepo[];
  onSelectRepo: (url: string) => void;
  onReposChange: () => void;
}

const SavedRepos: React.FC<SavedReposProps> = ({
  savedRepos,
  onSelectRepo,
  onReposChange,
}) => {
  const { t } = useTranslation();

  const handleDelete = (repo: SavedRepo) => {
    removeSavedRepo(repo.owner, repo.repo, repo.type);
    onReposChange();
  };

  if (savedRepos.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        <p>{t("savedRepos.noSaved")}</p>
        <p className="text-sm">{t("savedRepos.saveFirst")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {savedRepos.map((repo) => (
        <Card
          key={`${repo.type}-${repo.owner}-${repo.repo}`}
          className="cursor-pointer hover:bg-accent/50 transition-colors group"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div
              className="flex items-center gap-3"
              onClick={() => onSelectRepo(repo.url)}
            >
              {repo.type === "github" ? (
                <Github className="h-5 w-5" />
              ) : (
                <Gitlab className="h-5 w-5" />
              )}
              <div>
                <p className="font-medium">
                  {repo.owner}/{repo.repo}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("savedRepos.lastAccessed")}{" "}
                  {formatDistanceToNow(new Date(repo.savedAt))} ago
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(repo);
              }}
              title={t("savedRepos.remove")}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SavedRepos;
