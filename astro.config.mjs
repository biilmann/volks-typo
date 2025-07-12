// @ts-check
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify/functions';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: netlify(),
  site: 'https://jdrhyne.github.io',
  base: !process.env.NETLIFY && !process.env.VERCEL && !process.env.RENDER && process.env.NODE_ENV !== 'development'
    ? '/volks-typo/'
    : '/',
});
