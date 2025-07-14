// GitHub integration configuration
export const GITHUB_CONFIG = {
  // Repository information
  owner: 'biilmann',
  repo: 'volks-typo',

  // Authorized users who can publish articles
  authorizedUsers: ['biilmann'],

  // Branch naming
  branchPrefix: 'add-article-',

  // Pull request settings
  defaultBranch: 'main',
} as const;
