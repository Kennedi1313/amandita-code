import { writeFileSync } from 'fs';
import { globby } from 'globby';
import prettier from 'prettier';

async function generate() {
  const prettierConfig = await prettier.resolveConfig('./.prettierrc.js');
  const excludedRoutes = new Set([
    '/account',
    '/cart',
    '/checkout',
    '/favorites',
    '/payment',
    '/pending',
    '/protectedRoute',
    '/sales',
    '/success',
  ]);
  const pages = await globby([
    'pages/**/*.tsx',
    'pages/*.tsx',
    'data/**/*.mdx',
    '!data/*.mdx',
    '!pages/_*.*',
    '!pages/**/_*.*',
    '!pages/api',
    '!pages/404.*',
    '!pages/**/*.test.*',
  ]);

  const sitemap = `
    <?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${pages
          .filter((page) => !page.includes('['))
          .map((page) => {
            const path = page
              .replace('pages', '')
              .replace('data', '')
              .replace(/\.(jsx?|tsx?|mdx)$/, '');
            const route = path === '/index' ? '' : path.replace(/\/index$/, '');
            if (excludedRoutes.has(route)) {
              return '';
            }

            return `
              <url>
                  <loc>${`https://amandita.vercel.app${route}`}</loc>
              </url>
            `;
          })
          .join('')}
    </urlset>
    `;

  const formatted = prettier.format(sitemap, {
    ...prettierConfig,
    parser: 'html',
  });

  // eslint-disable-next-line no-sync
  writeFileSync('public/sitemap.xml',  (await formatted).toString());
}

generate();
