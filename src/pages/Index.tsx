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
import { SavedRepo, RepoActionType } from "../types/repo";
import { getSavedRepos } from "../services/repoService";
import SavedRepos from "../components/SavedRepos";
import { Toaster } from "@/components/ui/toaster";

const Index = () => {
  const [repoUrl, setRepoUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [savedRepos, setSavedRepos] = useState<SavedRepo[]>([]);
  const [activeTab, setActiveTab] = useState("repo");

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

  const handleRepoSubmit = async (url: string, action: RepoActionType) => {
    setRepoUrl(url);
    setIsLoading(true);

    try {
      if (action === "explore") {
        // Original explore behavior
        setIsModalOpen(true);
      }
      // The download and download-link functionality is now handled directly by the RepoForm component
    } catch (error) {
      console.error("Error handling repository:", error);
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
                  GitHub & GitLab file extractor
                </span>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 container py-8 px-4">
          <Card className="max-w-4xl mx-auto shadow-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold tracking-tight">
                Download files from Git repositories
              </CardTitle>
              <CardDescription className="text-base max-w-xl mx-auto mt-2">
                Easily browse, select, and download files from any public GitHub
                or GitLab repository
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="mb-8"
              >
                <TabsList className="grid grid-cols-3 max-w-md mx-auto">
                  <TabsTrigger value="repo">Repository</TabsTrigger>
                  <TabsTrigger value="saved">Saved</TabsTrigger>
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
                    <h3 className="font-medium text-center mb-4">
                      Try these example repositories:
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Card
                        className="cursor-pointer hover:bg-accent/50 transition-all hover:shadow-md"
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
                        className="cursor-pointer hover:bg-accent/50 transition-all hover:shadow-md"
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
                        className="cursor-pointer hover:bg-accent/50 transition-all hover:shadow-md"
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
                        className="cursor-pointer hover:bg-accent/50 transition-all hover:shadow-md"
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

              <div className="space-y-4 bg-accent/25 p-6 rounded-lg">
                <h3 className="font-semibold text-center">Features</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <li className="flex items-center gap-2 bg-background p-3 rounded-md shadow-sm">
                    <div className="rounded-full bg-green-500/20 text-green-700 dark:text-green-400 p-1">
                      ✓
                    </div>
                    <span>Visual file explorer</span>
                  </li>
                  <li className="flex items-center gap-2 bg-background p-3 rounded-md shadow-sm">
                    <div className="rounded-full bg-green-500/20 text-green-700 dark:text-green-400 p-1">
                      ✓
                    </div>
                    <span>Multi-file selection</span>
                  </li>
                  <li className="flex items-center gap-2 bg-background p-3 rounded-md shadow-sm">
                    <div className="rounded-full bg-green-500/20 text-green-700 dark:text-green-400 p-1">
                      ✓
                    </div>
                    <span>GitHub & GitLab</span>
                  </li>
                  <li className="flex items-center gap-2 bg-background p-3 rounded-md shadow-sm">
                    <div className="rounded-full bg-green-500/20 text-green-700 dark:text-green-400 p-1">
                      ✓
                    </div>
                    <span>Branch selection</span>
                  </li>
                  <li className="flex items-center gap-2 bg-background p-3 rounded-md shadow-sm">
                    <div className="rounded-full bg-green-500/20 text-green-700 dark:text-green-400 p-1">
                      ✓
                    </div>
                    <span>File size info</span>
                  </li>
                  <li className="flex items-center gap-2 bg-background p-3 rounded-md shadow-sm">
                    <div className="rounded-full bg-green-500/20 text-green-700 dark:text-green-400 p-1">
                      ✓
                    </div>
                    <span>Direct file links</span>
                  </li>
                  <li className="flex items-center gap-2 bg-background p-3 rounded-md shadow-sm">
                    <div className="rounded-full bg-green-500/20 text-green-700 dark:text-green-400 p-1">
                      ✓
                    </div>
                    <span>Save repositories</span>
                  </li>
                  <li className="flex items-center gap-2 bg-background p-3 rounded-md shadow-sm">
                    <div className="rounded-full bg-green-500/20 text-green-700 dark:text-green-400 p-1">
                      ✓
                    </div>
                    <span>Mobile friendly</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </main>

        <footer className="border-t py-4 px-6 mt-8">
          <div className="container flex flex-col md:flex-row justify-between items-center gap-2 text-sm text-muted-foreground">
            <div>
              <span>GitExtract - Download repository files with ease</span>
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
        <Toaster />
      </div>
    </ThemeProvider>
  );
};

export default Index;
