import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    // Determine if we're building for GitHub Pages
    const isGitHubPages = process.env.GITHUB_PAGES === 'true' || mode === 'github-pages';

    return {
      // Set the base path for GitHub Pages deployment
      base: isGitHubPages ? '/ai-code_ideation/' : '/',

      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },

      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },

      // Ensure proper asset handling for GitHub Pages
      build: {
        assetsDir: 'assets',
        rollupOptions: {
          output: {
            // Ensure consistent asset naming
            assetFileNames: 'assets/[name]-[hash][extname]',
            chunkFileNames: 'assets/[name]-[hash].js',
            entryFileNames: 'assets/[name]-[hash].js'
          }
        }
      },

      // Ensure CSS is processed correctly
      css: {
        postcss: {}
      }
    };
});
