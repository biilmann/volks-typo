// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://jdrhyne.github.io',
  base: !process.env.NETLIFY && !process.env.VERCEL && !process.env.RENDER && process.env.NODE_ENV !== 'development'
    ? '/volks-typo/'
    : '/',
});
