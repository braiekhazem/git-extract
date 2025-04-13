import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "../components/ThemeToggle";
import { ThemeProvider } from "../context/ThemeContext";
import RepoForm from "../components/RepoForm";
import { Github, Gitlab } from "lucide-react";
import RepoExplorerModal from "../components/RepoExplorerModal";
import { SavedRepo } from "../types/repo";
import {
  getSavedRepos,
  loadRepoData,
  fetchFileContent,
  parseRepoUrl,
} from "../services/repoService";
import SavedRepos from "../components/SavedRepos";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [repoUrl, setRepoUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [savedRepos, setSavedRepos] = useState<SavedRepo[]>([]);
  const [activeTab, setActiveTab] = useState("repo");
  const { toast } = useToast();

  useEffect(() => {
    // Load saved repos on initial load
    loadSavedRepos();
  }, []);

  const loadSavedRepos = () => {
    const repos = getSavedRepos();
    setSavedRepos(repos);

    // If we have saved repos and none are selected, switch to the saved tab
    if (repos.length > 0 && savedRepos.length === 0) {
      setActiveTab("saved");
    }
  };

  const handleRepoSubmit = async (
    url: string,
    action: "explore" | "download-file" | "download-folder"
  ) => {
    setRepoUrl(url);
    setIsLoading(true);

    try {
      if (action === "explore") {
        // Original explore behavior
        setIsModalOpen(true);
      } else {
        // Direct download behavior
        const parsedRepo = parseRepoUrl(url);
        if (!parsedRepo || !parsedRepo.path) {
          toast({
            title: "Invalid URL",
            description: "Could not parse repository path from URL",
            variant: "destructive",
          });
          return;
        }

        const { owner, repo, type, path } = parsedRepo;

        // Load repo data to get branches
        const repoData = await loadRepoData(url);
        if (!repoData) {
          toast({
            title: "Repository Not Found",
            description: "Could not load repository data",
            variant: "destructive",
          });
          return;
        }

        // Use the current branch from repoData
        const branch = repoData.currentBranch;

        if (action === "download-file") {
          // Download single file
          try {
            const fileContent = await fetchFileContent(
              owner,
              repo,
              path,
              branch,
              type
            );

            // Get the file name from the path
            const fileName = path.split("/").pop() || "file";

            // Create a blob and download it
            const blob = new Blob([fileContent], {
              type: "application/octet-stream",
            });
            saveAs(blob, fileName);

            toast({
              title: "File Downloaded",
              description: `File ${fileName} has been downloaded successfully.`,
            });
          } catch (error) {
            toast({
              title: "Download Failed",
              description:
                "Could not download the file. It might not exist or be a directory.",
              variant: "destructive",
            });
          }
        } else if (action === "download-folder") {
          // For folder, we need to open the explorer modal with the path pre-selected
          setIsModalOpen(true);
        }
      }
    } catch (error) {
      toast({
        title: "Operation Failed",
        description: "An error occurred while processing your request.",
        variant: "destructive",
      });
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setRepoUrl("");
    // Refresh saved repos when modal closes
    loadSavedRepos();
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <header className="border-b py-4 px-6">
          <div className="container flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
                GitExtract
              </span>
              <div className="hidden md:flex gap-2 items-center">
                <Github className="h-4 w-4" />
                <Gitlab className="h-4 w-4" />
                <span className="text-sm text-muted-foreground">
                  GitHub & GitLab file downloader
                </span>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 container py-6 px-4 md:py-8">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center text-2xl md:text-3xl">
                Download files from GitHub or GitLab repositories
              </CardTitle>
              <CardDescription className="text-center text-base">
                Browse, select, and download files from any public repository
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="mb-6"
              >
                <TabsList className="grid grid-cols-3 w-[400px] mx-auto">
                  <TabsTrigger value="repo">Repository URL</TabsTrigger>
                  <TabsTrigger value="saved">Saved Repos</TabsTrigger>
                  <TabsTrigger value="example">Examples</TabsTrigger>
                </TabsList>

                <TabsContent value="repo" className="mt-6">
                  <RepoForm onSubmit={handleRepoSubmit} isLoading={isLoading} />
                </TabsContent>

                <TabsContent value="saved" className="mt-6">
                  <SavedRepos
                    savedRepos={savedRepos}
                    onSelectRepo={(url) => handleRepoSubmit(url, "explore")}
                    onReposChange={loadSavedRepos}
                  />
                </TabsContent>

                <TabsContent value="example" className="mt-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">Try these examples:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Card
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() =>
                          handleRepoSubmit(
                            "https://github.com/facebook/react",
                            "explore"
                          )
                        }
                      >
                        <CardContent className="p-4 flex items-center gap-3">
                          <Github className="h-5 w-5" />
                          <div>
                            <p className="font-medium">facebook/react</p>
                            <p className="text-xs text-muted-foreground">
                              React JavaScript library
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() =>
                          handleRepoSubmit(
                            "https://gitlab.com/gitlab-org/gitlab-foss",
                            "explore"
                          )
                        }
                      >
                        <CardContent className="p-4 flex items-center gap-3">
                          <Gitlab className="h-5 w-5" />
                          <div>
                            <p className="font-medium">
                              gitlab-org/gitlab-foss
                            </p>
                            <p className="text-xs text-muted-foreground">
                              GitLab FOSS edition
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() =>
                          handleRepoSubmit(
                            "https://github.com/vercel/next.js",
                            "explore"
                          )
                        }
                      >
                        <CardContent className="p-4 flex items-center gap-3">
                          <Github className="h-5 w-5" />
                          <div>
                            <p className="font-medium">vercel/next.js</p>
                            <p className="text-xs text-muted-foreground">
                              The React Framework
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() =>
                          handleRepoSubmit(
                            "https://github.com/shadcn-ui/ui",
                            "explore"
                          )
                        }
                      >
                        <CardContent className="p-4 flex items-center gap-3">
                          <Github className="h-5 w-5" />
                          <div>
                            <p className="font-medium">shadcn-ui/ui</p>
                            <p className="text-xs text-muted-foreground">
                              UI components
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="space-y-4">
                <h3 className="font-medium">Features:</h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-green-500/20 text-green-700 dark:text-green-400 p-1">
                      ✓
                    </div>
                    Visual file tree explorer
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-green-500/20 text-green-700 dark:text-green-400 p-1">
                      ✓
                    </div>
                    Multi-select files and folders
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-green-500/20 text-green-700 dark:text-green-400 p-1">
                      ✓
                    </div>
                    GitHub and GitLab support
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-green-500/20 text-green-700 dark:text-green-400 p-1">
                      ✓
                    </div>
                    Branch selection
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-green-500/20 text-green-700 dark:text-green-400 p-1">
                      ✓
                    </div>
                    File size and type information
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-green-500/20 text-green-700 dark:text-green-400 p-1">
                      ✓
                    </div>
                    Direct file/folder links
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-green-500/20 text-green-700 dark:text-green-400 p-1">
                      ✓
                    </div>
                    Save favorite repositories
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-green-500/20 text-green-700 dark:text-green-400 p-1">
                      ✓
                    </div>
                    Mobile-friendly design
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </main>

        <footer className="border-t py-4 px-6">
          <div className="container flex flex-col md:flex-row justify-between items-center gap-2 text-sm text-muted-foreground">
            <div>
              <span>RepoZip - Download repository files with ease</span>
            </div>
            <div>
              <p>Supports GitHub and GitLab public repositories</p>
            </div>
          </div>
        </footer>

        <RepoExplorerModal
          repoUrl={repoUrl}
          open={isModalOpen}
          onClose={handleCloseModal}
        />
      </div>
    </ThemeProvider>
  );
};

export default Index;
