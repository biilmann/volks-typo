export const GITHUB_CONFIG = {
  owner: 'YOUR_GITHUB_USERNAME',        // Replace with your GitHub username
  repo: 'YOUR_REPO_NAME',               // Replace with your repository name
  authorizedUsers: ['YOUR_GITHUB_USERNAME'], // Replace with authorized users
  branchPrefix: 'add-article-',
  defaultBranch: 'main',
} as const;

export const SITE_CONFIG = {
  contentDir: 'src/content/articles',    // Adjust to your content directory
  imageDir: 'public/images',             // Adjust to your image directory
} as const;