import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { Github, Gitlab, Check, GitBranch } from "lucide-react";
import RepoExplorerModal from "../components/RepoExplorerModal";
import { SavedRepo, RepoActionType } from "../types/repo";
import { getSavedRepos } from "../services/repoService";
import SavedRepos from "../components/SavedRepos";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [repoUrl, setRepoUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [savedRepos, setSavedRepos] = useState<SavedRepo[]>([]);
  const [activeTab, setActiveTab] = useState("repo");
  const [initialAction, setInitialAction] = useState<RepoActionType | null>(
    null
  );
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    // Load saved repos on initial load
    loadSavedRepos();

    // Check for URL parameters for auto-download
    const urlParam = searchParams.get("url");
    const actionParam = searchParams.get("action");

    if (urlParam) {
      const decodedUrl = decodeURIComponent(urlParam);
      const action = actionParam === "download" ? "download" : "explore";
      handleRepoSubmit(decodedUrl, action);
    }
  }, [searchParams]);

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
      if (action === "explore" || action === "download") {
        setInitialAction(action);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error("Error handling repository:", error);
      toast({
        title: "Error processing repository",
        description: `Could not perform the requested action. ${
          error instanceof Error ? `(${error.message})` : ""
        }`.trim(),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setRepoUrl("");
    setInitialAction(null);
    // Refresh saved repos when modal closes
    loadSavedRepos();
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            <div className="mr-4 hidden md:flex">
              <a className="mr-6 flex items-center space-x-2" href="/">
                <GitBranch className="h-6 w-6" />
                <span className="hidden font-bold sm:inline-block">
                  GitExtract
                </span>
              </a>
            </div>
            <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
              <div className="flex-1">
                <span className="text-sm text-muted-foreground hidden md:inline">
                  GitHub & GitLab File Extractor
                </span>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="container relative">
            <section className="mx-auto flex max-w-5xl flex-col items-center gap-2 py-8 md:py-12 md:pb-8 lg:py-24 lg:pb-20">
              <h1 className="text-center text-3xl font-bold leading-tight tracking-tighter md:text-5xl lg:leading-[1.1]">
                Download Files from Git Repositories
              </h1>
              <p className="max-w-3xl text-center text-lg text-muted-foreground sm:text-xl">
                Easily browse, select, and download files and folders from any
                public GitHub or GitLab repository without cloning the entire
                project.
              </p>
            </section>
          </div>

          <Card className="max-w-4xl mx-auto shadow-sm border-0 md:border md:shadow-lg">
            <CardContent className="p-4 md:p-6">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
                  <TabsTrigger value="repo">From Repository</TabsTrigger>
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
                    <h3 className="font-medium text-center mb-4 text-muted-foreground">
                      Or try one of these popular repositories:
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Card
                        className="cursor-pointer hover:border-primary/60 transition-colors"
                        onClick={() =>
                          handleRepoSubmit(
                            "https://github.com/facebook/react",
                            "explore"
                          )
                        }
                      >
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4">
                          <Github className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <p className="font-semibold">facebook/react</p>
                            <p className="text-sm text-muted-foreground">
                              The library for web and native user interfaces.
                            </p>
                          </div>
                        </CardHeader>
                      </Card>

                      <Card
                        className="cursor-pointer hover:border-primary/60 transition-colors"
                        onClick={() =>
                          handleRepoSubmit(
                            "https://gitlab.com/gitlab-org/gitlab-foss",
                            "explore"
                          )
                        }
                      >
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4">
                          <Gitlab className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <p className="font-semibold">
                              gitlab-org/gitlab-foss
                            </p>
                            <p className="text-sm text-muted-foreground">
                              The open-source version of GitLab.
                            </p>
                          </div>
                        </CardHeader>
                      </Card>

                      <Card
                        className="cursor-pointer hover:border-primary/60 transition-colors"
                        onClick={() =>
                          handleRepoSubmit(
                            "https://github.com/vercel/next.js",
                            "explore"
                          )
                        }
                      >
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4">
                          <Github className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <p className="font-semibold">vercel/next.js</p>
                            <p className="text-sm text-muted-foreground">
                              The React framework for the web.
                            </p>
                          </div>
                        </CardHeader>
                      </Card>

                      <Card
                        className="cursor-pointer hover:border-primary/60 transition-colors"
                        onClick={() =>
                          handleRepoSubmit(
                            "https://github.com/shadcn-ui/ui",
                            "explore"
                          )
                        }
                      >
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4">
                          <Github className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <p className="font-semibold">shadcn-ui/ui</p>
                            <p className="text-sm text-muted-foreground">
                              Beautifully designed components.
                            </p>
                          </div>
                        </CardHeader>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <section className="container mx-auto max-w-4xl py-12">
            <div className="space-y-4 bg-muted/50 p-6 rounded-lg border">
              <h3 className="font-bold text-center text-2xl">
                Powerful Features
              </h3>
              <p className="text-muted-foreground text-center max-w-2xl mx-auto">
                GitExtract is packed with features to make downloading files
                from repositories as easy as possible.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4">
                {[
                  "Visual File Explorer",
                  "Multi-file Selection",
                  "GitHub & GitLab",
                  "Branch Selection",
                  "Lazy-loaded folders",
                  "Direct File Links",
                  "Save Repositories",
                  "Dark Mode",
                  "Mobile Friendly",
                ].map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-3 bg-background p-3 rounded-md shadow-sm"
                  >
                    <div className="rounded-full bg-green-500/20 text-green-700 dark:text-green-400 p-1.5">
                      <Check className="h-4 w-4" />
                    </div>
                    <span className="font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </main>

        <footer className="py-6 md:py-8 mt-8 border-t bg-muted/20">
          <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
            <p className="text-sm leading-loose text-center text-muted-foreground md:text-left">
              Built with ❤️ and open-source tools.
            </p>
            <p className="text-sm leading-loose text-center text-muted-foreground md:text-left">
              GitExtract - Download repository files with ease.
            </p>
          </div>
        </footer>

        <RepoExplorerModal
          repoUrl={repoUrl}
          open={isModalOpen}
          onClose={handleCloseModal}
          initialAction={initialAction}
        />
        <Toaster />
      </div>
    </ThemeProvider>
  );
};

export default Index;
