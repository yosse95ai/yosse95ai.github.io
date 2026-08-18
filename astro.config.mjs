// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
  site: 'https://yosse95ai.github.io',
  // Astro 7 の既定は 'jsx'（インライン要素間の空白を JSX ルールで除去）だが、
  // 既存レイアウトの見た目を維持するため HTML 準拠の圧縮を明示する
  compressHTML: true,
  build: {
  },
  integrations: [
    sitemap(),
    icon(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
