# GitExtract

Grab a few files out of a GitHub or GitLab repo without cloning the whole thing.

I kept running into the same annoyance: I need one folder from some 400MB repo, and my options are clone it all, or click through the web UI downloading files one at a time. So this does the obvious thing — paste a repo URL, tick the files you want, get a ZIP.

Live at [gitextract](https://git-extract.netlify.app).

## What it does

Paste a URL and pick one of three things:

- **Explore** — opens a file tree. Expand folders, tick what you want, download a ZIP of just that.
- **Direct download** — skips the tree, zips the whole repo (or whatever path the URL points at).
- **Get link** — gives you a shareable URL that reruns either of the above when someone opens it.

URLs can point at a repo root, a subfolder, or a single file:

```
https://github.com/facebook/react
https://github.com/facebook/react/tree/main/packages
https://github.com/facebook/react/blob/main/README.md

https://gitlab.com/gitlab-org/gitlab-foss
https://gitlab.com/gitlab-org/gitlab-foss/-/tree/master/app
```

Other things that are in there: branch and tag switching (your selection survives the switch), bookmarking repos you come back to, dark mode, and English/French/Arabic.

Folder contents load only when you expand them, so opening a huge repo doesn't hammer the API up front.

## Running it locally

Needs Node 18+.

```bash
git clone https://github.com/braiekhazem/git-extract.git
cd git-extract
npm install
npm run dev
```

That serves on `http://localhost:8080` (set in `vite.config.ts`, not the Vite default).

For a production build:

```bash
npm run build     # output lands in dist/
npm run preview   # serve the build locally to check it
```

`dist/` is a plain static bundle — drop it on Netlify, Vercel, S3, whatever.

## How it's built

React 18 + TypeScript on Vite, Tailwind for styling, Radix primitives underneath the components. Zipping happens in the browser with JSZip and FileSaver — there's no backend, every request goes straight from your browser to the GitHub or GitLab API.

Layout:

```
src/
├── components/     # UI, with shadcn-style primitives in ui/
├── pages/          # Index.tsx is the whole app, really
├── services/       # repoService.ts (API), downloadService.ts (zip + share links)
├── context/        # theme
├── i18n/           # en, fr, ar
├── hooks/
├── types/
└── lib/
```

State is just hooks and one context for the theme. Saved repos and theme live in localStorage.

## Limits worth knowing about

- **No auth, so you get the anonymous rate limit.** GitHub is 60 requests/hour per IP. Browse a couple of large repos and you'll hit it.
- **Public repos only.** No token support yet, which is what would fix both this and the rate limit.
- **gitlab.com only** — self-hosted GitLab instances aren't handled, the host is hardcoded.
- **Everything zips in memory.** Very large repos will make the tab struggle or die. There's no streaming.

## Contributing

Fork it, branch, PR. Run `npm run lint` before you open one. No test suite yet — if you want to add one, that'd be genuinely useful.

## License

MIT — see [LICENSE](LICENSE).

## Author

Hazem Braiek — [GitHub](https://github.com/braiekhazem) · [LinkedIn](https://www.linkedin.com/in/braiek-hazem/)
