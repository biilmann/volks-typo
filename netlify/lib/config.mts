export const GITHUB_CONFIG = {
  owner: 'your-username',           // GitHub repository owner
  repo: 'your-repo-name',           // Repository name
  authorizedUsers: ['your-username'], // Users allowed to publish
  branchPrefix: 'add-article-',     // Branch naming prefix
  defaultBranch: 'main',            // Default branch
} as const;

export const SITE_CONFIG = {
  contentDir: 'src/pages/blog',     // Path to your markdown files
  imageDir: 'public/images',        // Public image directory
} as const;