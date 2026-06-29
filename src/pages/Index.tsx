import React, { useEffect, useState, Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "../components/ThemeToggle";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { ThemeProvider } from "../context/ThemeContext";
import RepoForm from "../components/RepoForm";
import {
  Github,
  Gitlab,
  Check,
  GitBranch,
  Heart,
  Linkedin,
} from "lucide-react";
const RepoExplorerModal = lazy(
  () => import("../components/RepoExplorerModal")
);
import { SavedRepo, RepoActionType } from "../types/repo";
import { getSavedRepos } from "../services/repoService";
import SavedRepos from "../components/SavedRepos";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";

const EXAMPLE_REPOS = [
  {
    url: "https://github.com/facebook/react",
    name: "facebook/react",
    provider: "github",
    i18nKey: "examples.react",
  },
  {
    url: "https://gitlab.com/gitlab-org/gitlab-foss",
    name: "gitlab-org/gitlab-foss",
    provider: "gitlab",
    i18nKey: "examples.gitlab",
  },
  {
    url: "https://github.com/vercel/next.js",
    name: "vercel/next.js",
    provider: "github",
    i18nKey: "examples.nextjs",
  },
  {
    url: "https://github.com/shadcn-ui/ui",
    name: "shadcn-ui/ui",
    provider: "github",
    i18nKey: "examples.shadcn",
  },
] as const;

const Index = () => {
  const { t } = useTranslation();
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
        title: t("errors.loadRepo"),
        description: `${t("errors.unknownError")} ${
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
      <div className="min-h-screen flex flex-col bg-background text-foreground relative overflow-hidden">
        {/* Palestine Solidarity Banner */}
        <div className="w-full bg-gradient-to-r from-green-600 via-white to-red-600 py-2 px-4 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-green-600/90 via-white/90 to-red-600/90"></div>
          <div className="relative z-10 flex items-center justify-center gap-2 text-sm font-medium">
            <Heart className="h-4 w-4 text-red-600 animate-pulse" />
            <span className="text-gray-800">{t("header.palestine")}</span>
            <span className="text-green-700">🇵🇸</span>
            <Heart className="h-4 w-4 text-red-600 animate-pulse" />
          </div>
        </div>

        {/* Enhanced background gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent -z-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/10 via-transparent to-transparent rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-primary/5 via-transparent to-transparent rounded-full blur-3xl -z-10" />

        <header className="sticky top-0 z-50 w-full border-b-2 border-border/50 shadow-lg bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center">
            <div className="mr-4 hidden md:flex">
              <a
                className="mr-6 flex items-center space-x-2 hover:opacity-80 transition-opacity"
                href="/"
              >
                <div className="p-2 rounded-lg bg-gradient-primary shadow-md">
                  <GitBranch className="h-5 w-5 text-white" />
                </div>
                <span className="hidden font-bold text-lg sm:inline-block text-gradient-primary">
                  {t("header.title")}
                </span>
              </a>
            </div>
            <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
              <div className="flex-1">
                <span className="text-sm text-muted-foreground hidden md:inline">
                  {t("header.subtitle")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="container relative">
            <section className="mx-auto flex max-w-5xl flex-col items-center gap-3 md:gap-4 py-6 md:py-8 lg:py-12 xl:py-16">
              {/* <div className="flex items-center gap-2 animate-fade-in-up">
                <Sparkles className="h-4 md:h-5 w-4 md:w-5 text-primary" />
                <span className="text-xs md:text-sm font-medium text-primary bg-primary/10 px-2 md:px-3 py-1 rounded-full">
                  Free & Open Source
                </span>
              </div> */}

              <h1 className="text-center text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold leading-tight tracking-tighter animate-fade-in-up animation-delay-200 px-4">
                {t("hero.title")
                  .split("Git Repositories")
                  .map((part, index) =>
                    index === 0 ? (
                      <span key={index}>
                        {part}
                        <span className="text-gradient-primary">
                          Git Repositories
                        </span>
                      </span>
                    ) : (
                      part
                    )
                  )}
              </h1>

              <p className="max-w-4xl text-center text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground animate-fade-in-up animation-delay-300 px-4">
                {t("hero.subtitle")}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 text-xs md:text-sm text-muted-foreground animate-fade-in-up animation-delay-400 px-4">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Github className="h-3 md:h-4 w-3 md:w-4 text-primary" />
                  <span>{t("hero.github")}</span>
                </div>
                <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Gitlab className="h-3 md:h-4 w-3 md:w-4 text-orange-500" />
                  <span>{t("hero.gitlab")}</span>
                </div>
                <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                <span>{t("hero.noRegistration")}</span>
              </div>
            </section>
          </div>

          <div className="px-4">
            <Card className="max-w-4xl mx-auto card-enhanced animate-fade-in-up animation-delay-500">
              <CardContent className="p-4 sm:p-6 md:p-8">
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-3 max-w-sm sm:max-w-md mx-auto h-10 sm:h-12 bg-muted/50 text-xs sm:text-sm">
                    <TabsTrigger
                      value="repo"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-2 sm:px-4"
                    >
                      <span className="hidden sm:inline">
                        {t("tabs.repository")}
                      </span>
                      <span className="sm:hidden">
                        {t("tabs.repositoryShort")}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="saved"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-2 sm:px-4"
                    >
                      <span className="hidden sm:inline">
                        {t("tabs.saved")}
                      </span>
                      <span className="sm:hidden">{t("tabs.savedShort")}</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="example"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-2 sm:px-4"
                    >
                      {t("tabs.examples")}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="repo" className="mt-6 md:mt-8">
                    <RepoForm
                      onSubmit={handleRepoSubmit}
                      isLoading={isLoading}
                    />
                  </TabsContent>

                  <TabsContent value="saved" className="mt-6 md:mt-8">
                    <SavedRepos
                      savedRepos={savedRepos}
                      onSelectRepo={(url) => handleRepoSubmit(url, "explore")}
                      onReposChange={loadSavedRepos}
                    />
                  </TabsContent>

                  <TabsContent value="example" className="mt-6 md:mt-8">
                    <div className="space-y-4 md:space-y-6">
                      <div className="text-center">
                        <h3 className="font-semibold text-base md:text-lg mb-2">
                          {t("examples.title")}
                        </h3>
                        <p className="text-sm md:text-base text-muted-foreground">
                          {t("examples.subtitle")}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                        {EXAMPLE_REPOS.map((repo) => {
                          const isGitlab = repo.provider === "gitlab";
                          const Icon = isGitlab ? Gitlab : Github;
                          return (
                            <Card
                              key={repo.url}
                              className="cursor-pointer card-enhanced hover-lift group"
                              onClick={() =>
                                handleRepoSubmit(repo.url, "explore")
                              }
                            >
                              <CardHeader className="flex flex-row items-center gap-3 md:gap-4 space-y-0 p-4 md:p-6">
                                <div
                                  className={`p-2 md:p-3 rounded-lg transition-colors ${
                                    isGitlab
                                      ? "bg-orange-500/10 group-hover:bg-orange-500/20"
                                      : "bg-primary/10 group-hover:bg-primary/20"
                                  }`}
                                >
                                  <Icon
                                    className={`h-5 md:h-6 w-5 md:w-6 ${
                                      isGitlab ? "text-orange-500" : "text-primary"
                                    }`}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm md:text-lg truncate">
                                    {repo.name}
                                  </p>
                                  <p className="text-xs md:text-sm text-muted-foreground">
                                    {t(repo.i18nKey)}
                                  </p>
                                </div>
                              </CardHeader>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <section className="container mx-auto max-w-5xl py-8 md:py-12 lg:py-16 animate-fade-in-up animation-delay-600 px-4">
            <div className="space-y-6 md:space-y-8 bg-gradient-primary-soft p-6 md:p-8 rounded-2xl border">
              <div className="text-center space-y-3 md:space-y-4">
                <h3 className="font-bold text-xl md:text-2xl lg:text-3xl text-gradient-primary">
                  {t("features.title")}
                </h3>
                <p className="text-muted-foreground text-sm md:text-base lg:text-lg max-w-2xl mx-auto">
                  {t("features.subtitle")}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {[
                  { key: "visualExplorer", delay: 0 },
                  { key: "multiSelection", delay: 100 },
                  { key: "platforms", delay: 200 },
                  { key: "branchSelection", delay: 300 },
                  { key: "lazyLoading", delay: 400 },
                  { key: "directLinks", delay: 500 },
                  { key: "saveRepos", delay: 600 },
                  { key: "darkMode", delay: 700 },
                  { key: "mobileFriendly", delay: 800 },
                ].map(({ key, delay }) => (
                  <div
                    key={key}
                    className="flex items-center gap-2 md:gap-3 bg-background/80 backdrop-blur-sm p-3 md:p-4 rounded-xl shadow-sm card-enhanced"
                    style={{ animationDelay: `${delay}ms` }}
                  >
                    <div className="rounded-full bg-primary/20 text-primary p-1.5 md:p-2 animate-pulse-glow shrink-0">
                      <Check className="h-3 md:h-4 w-3 md:w-4" />
                    </div>
                    <span className="font-medium text-sm md:text-base">
                      {t(`features.${key}`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        <footer className="mt-16 border-t border-border/50 bg-gradient-primary-soft">
          <div className="container py-10 md:py-12">
            <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
              {/* Brand + author */}
              <div className="max-w-sm space-y-3">
                <a href="/" className="flex w-fit items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-primary shadow-md">
                    <GitBranch className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-bold text-lg text-gradient-primary">
                    {t("header.title")}
                  </span>
                </a>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t("footer.description")}
                </p>
                <a
                  href="https://www.linkedin.com/in/braiek-hazem/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  <Linkedin className="h-4 w-4" />
                  {t("footer.madeBy")}{" "}
                  <span className="font-semibold">Hazem Braiek</span>
                </a>
              </div>

              {/* Supported platforms */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">
                  {t("footer.supportedPlatforms")}
                </h4>
                <div className="flex items-center gap-5 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Github className="h-4 w-4 text-primary" />
                    {t("hero.github")}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Gitlab className="h-4 w-4 text-orange-500" />
                    {t("hero.gitlab")}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border/50 pt-6 sm:flex-row">
              <p className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} {t("header.title")}.{" "}
                {t("footer.rights")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("footer.openSource")}
              </p>
            </div>
          </div>
        </footer>

        <Suspense fallback={null}>
          <RepoExplorerModal
            repoUrl={repoUrl}
            open={isModalOpen}
            onClose={handleCloseModal}
            initialAction={initialAction}
          />
        </Suspense>
        <Toaster />
      </div>
    </ThemeProvider>
  );
};

export default Index;
