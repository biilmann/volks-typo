import { marked } from 'marked';

export default function renderMarkdown(markdown) {
  return marked(markdown);
}