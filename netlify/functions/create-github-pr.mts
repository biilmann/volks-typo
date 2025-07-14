import type { Config } from "@netlify/functions";
import { requireAuth } from '../lib/auth.mts';
import { getStore } from "@netlify/blobs";
import { Octokit } from "@octokit/rest";

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  const auth = requireAuth(req);
  if (!auth) {
    return new Response('Unauthorized', { status: 401 });
  }
  try {
    const { id } = await req.json();
    if (!id) {
      return new Response('Document ID required', { status: 400 });
    }
    const drafts = getStore("drafts");
    const draftData = await drafts.get(id, { type: "json" });
    if (!draftData) {
      return new Response('Draft not found', { status: 404 });
    }
    const { meta, markdown } = draftData;
    const octokit = new Octokit({ auth: auth.github_token });
    const { GITHUB_CONFIG } = await import('../lib/config.mts');
    const repoOwner = GITHUB_CONFIG.owner;
    const repoName = GITHUB_CONFIG.repo;
    const slug = meta.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .substring(0, 50);
    let existingFile = null;
    let existingBranch = null;
    let existingPR = null;
    if (meta.notionId) {
      try {
        const searchQuery = `repo:${repoOwner}/${repoName} path:src/pages/blog notionId:"${meta.notionId}"`;
        const { data: searchResults } = await octokit.rest.search.code({ q: searchQuery });
        if (searchResults.items.length > 0) {
          existingFile = searchResults.items[0];
        }
        const { data: openPRs } = await octokit.rest.pulls.list({ owner: repoOwner, repo: repoName, state: 'open' });
        for (const pr of openPRs) {
          if (pr.title.includes(`[Notion:${meta.notionId}]`) || pr.body?.includes(`notionId: "${meta.notionId}"`)) {
            existingPR = pr;
            existingBranch = pr.head.ref;
            break;
          }
        }
      } catch {
        // proceed if search fails
      }
    }
    const branchName = existingBranch || `${GITHUB_CONFIG.branchPrefix}${slug}-${Date.now()}`;
    const { data: repo } = await octokit.rest.repos.get({ owner: repoOwner, repo: repoName });
    const defaultBranch = repo.default_branch;
    const { data: ref } = await octokit.rest.git.getRef({ owner: repoOwner, repo: repoName, ref: `heads/${defaultBranch}` });
    if (!existingBranch) {
      await octokit.rest.git.createRef({ owner: repoOwner, repo: repoName, ref: `refs/heads/${branchName}`, sha: ref.object.sha });
    }
    const filePath = existingFile ? existingFile.path : `src/pages/blog/${slug}.md`;
    let existingFileSha = null;
    if (existingFile || existingBranch) {
      try {
        const { data: fileData } = await octokit.rest.repos.getContent({ owner: repoOwner, repo: repoName, path: filePath, ref: branchName });
        if ('sha' in fileData) existingFileSha = fileData.sha;
      } catch {
        // file not in branch
      }
    }
    const frontmatterLines = [
      '---',
      `title: "${meta.title}"`,
      `date: "${meta.publishDate}"`,
      `author: "${meta.author}"`,
      `excerpt: "${meta.description}"`,
      ...(meta.heroImage ? [`image: "${meta.heroImage}"`] : []),
      'draft: false',
      '---',
      '',
    ];
    const fileContent = frontmatterLines.join('\n') + markdown;
    const commitMessage = existingFile ? `Update article: ${meta.title}` : `Add new article: ${meta.title}`;
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: repoOwner,
      repo: repoName,
      path: filePath,
      message: commitMessage,
      content: Buffer.from(fileContent).toString('base64'),
      branch: branchName,
      ...(existingFileSha && { sha: existingFileSha }),
    });
    let pr;
    if (existingPR) {
      const { data: updatedPR } = await octokit.rest.pulls.update({ owner: repoOwner, repo: repoName, pull_number: existingPR.number, title: `[Notion:${meta.notionId}] Update article: ${meta.title}`, body: `Updated blog article. Notion ID: ${meta.notionId}` });
      pr = updatedPR;
    } else {
      const { data: newPR } = await octokit.rest.pulls.create({ owner: repoOwner, repo: repoName, title: `[Notion:${meta.notionId}] Add article: ${meta.title}`, body: `New blog article from Notion. Notion ID: ${meta.notionId}`, head: branchName, base: defaultBranch });
      pr = newPR;
    }
    await drafts.set(`${id}-pr`, JSON.stringify({ pr_number: pr.number, pr_url: pr.html_url, branch: branchName, created_at: new Date().toISOString() }));
    return new Response(JSON.stringify({ success: true, pr_url: pr.html_url, pr_number: pr.number, branch: branchName }), { headers: { 'content-type': 'application/json' } });
  } catch (error: any) {
    console.error('GitHub PR creation error:', error);
    return new Response(JSON.stringify({ error: 'Failed to create pull request', details: error.message }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}

export const config: Config = {
  path: "/api/create-github-pr"
};