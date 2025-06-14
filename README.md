# 🚀 GitExtract

**Download files from Git repositories without cloning the entire project**

GitExtract is a modern, fast, and user-friendly web application that allows you to browse, select, and download specific files and folders from any public GitHub or GitLab repository without the need to clone the entire project.

![GitExtract Demo](https://img.shields.io/badge/Status-Live-brightgreen)
![React](https://img.shields.io/badge/React-18+-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3+-blue)

## ✨ Features

### 🎯 Core Functionality

- **Visual File Explorer** - Browse repository structure with an intuitive tree view
- **Multi-file Selection** - Select multiple files and folders for batch download
- **Direct Download** - Download entire repositories or specific paths instantly
- **Branch Selection** - Switch between different branches and tags
- **Lazy Loading** - Efficiently load folder contents on demand

### 🌐 Platform Support

- **GitHub Integration** - Full support for public GitHub repositories
- **GitLab Integration** - Complete GitLab public repository support
- **URL Flexibility** - Supports repository, folder, and direct file URLs

### 💾 Smart Features

- **Save Repositories** - Bookmark frequently used repositories
- **Shareable Links** - Generate direct download links for sharing
- **Progress Tracking** - Real-time download progress with cancellation
- **Error Handling** - Comprehensive error messages and recovery

### 🎨 User Experience

- **Modern UI** - Beautiful, responsive design with smooth animations
- **Dark Mode** - Full dark/light theme support
- **Mobile Friendly** - Optimized for all device sizes
- **Fast Performance** - Optimized loading and minimal API calls

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn package manager

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/gitextract.git
   cd gitextract
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start development server**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

## 📖 Usage

### Basic Usage

1. **Enter Repository URL**

   - Paste any public GitHub or GitLab repository URL
   - Supports repository, folder, or file URLs

2. **Choose Action**

   - **Explore Files**: Browse and select specific files
   - **Direct Download**: Download entire repository immediately
   - **Get Link**: Generate a shareable download link

3. **Browse & Select** (Explore mode)

   - Navigate through folders by clicking to expand
   - Select files and folders using checkboxes
   - Use "Select All" or "Unselect All" for bulk operations

4. **Download**
   - Click "Download" to create a ZIP file
   - Monitor progress with the built-in progress tracker

### Supported URL Formats

```bash
# Repository URLs
https://github.com/facebook/react
https://gitlab.com/gitlab-org/gitlab-foss

# Folder URLs
https://github.com/facebook/react/tree/main/packages
https://gitlab.com/gitlab-org/gitlab-foss/-/tree/master/app

# File URLs
https://github.com/facebook/react/blob/main/README.md
https://gitlab.com/gitlab-org/gitlab-foss/-/blob/master/README.md
```

### Advanced Features

#### Branch Selection

- Switch between different branches and tags
- Automatically detects available branches
- Preserves your file selection when switching branches

#### Save Repositories

- Bookmark frequently used repositories
- Quick access from the "Saved Repos" tab
- Persistent storage in browser

#### Shareable Links

- Generate direct download links
- Share with team members
- Supports auto-download via URL parameters

## 🛠️ Technology Stack

### Frontend

- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework

### UI Components

- **Radix UI** - Accessible, unstyled UI primitives
- **Lucide React** - Beautiful, customizable icons
- **Sonner** - Toast notifications

### State Management

- **React Hooks** - Built-in state management
- **Context API** - Theme and global state management

### File Processing

- **JSZip** - Client-side ZIP file creation
- **FileSaver.js** - Cross-browser file downloading

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (buttons, inputs, etc.)
│   ├── FileTree.tsx    # File explorer component
│   ├── RepoForm.tsx    # Repository input form
│   └── ...
├── pages/              # Main application pages
│   └── Index.tsx       # Home page
├── services/           # API and business logic
│   ├── repoService.ts  # Repository data fetching
│   └── downloadService.ts # File download logic
├── types/              # TypeScript type definitions
├── hooks/              # Custom React hooks
├── context/            # React context providers
└── lib/                # Utility functions
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Optional: GitHub Personal Access Token for higher rate limits
VITE_GITHUB_TOKEN=your_github_token_here

# Optional: GitLab Personal Access Token
VITE_GITLAB_TOKEN=your_gitlab_token_here
```

### Build Configuration

The project uses Vite for building. Customize `vite.config.ts` for your needs:

```typescript
export default defineConfig({
  plugins: [react()],
  // Add your custom configuration here
});
```

## 📦 Building for Production

```bash
# Build the application
npm run build

# Preview the production build
npm run preview

# Deploy to your hosting platform
npm run deploy
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Use meaningful commit messages
- Add tests for new features
- Ensure responsive design
- Maintain accessibility standards

## 🐛 Known Issues & Limitations

- **Rate Limits**: GitHub/GitLab API rate limits may apply for unauthenticated requests
- **Large Files**: Very large files (>100MB) may cause browser memory issues
- **Private Repositories**: Only public repositories are supported
- **Binary Files**: Some binary files may not display correctly in preview

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Hazem Braiek**

- LinkedIn: [Hazem Braiek](https://www.linkedin.com/in/braiek-hazem/)
- GitHub: [@hazem-braiek](https://github.com/hazem-braiek)

## 🙏 Acknowledgments

- [GitHub API](https://docs.github.com/en/rest) for repository data
- [GitLab API](https://docs.gitlab.com/ee/api/) for GitLab integration
- [Radix UI](https://www.radix-ui.com/) for accessible components
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Lucide](https://lucide.dev/) for beautiful icons

## 📊 Stats

![GitHub stars](https://img.shields.io/github/stars/yourusername/gitextract)
![GitHub forks](https://img.shields.io/github/forks/yourusername/gitextract)
![GitHub issues](https://img.shields.io/github/issues/yourusername/gitextract)
![GitHub license](https://img.shields.io/github/license/yourusername/gitextract)

---

**Built with ❤️ by [Hazem Braiek](https://www.linkedin.com/in/braiek-hazem/) © 2025**
