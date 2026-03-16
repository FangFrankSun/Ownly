import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { createServer } from 'node:http';

const distDir = join(process.cwd(), 'dist');
const port = 8081;

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
};

function safePathname(pathname) {
  const normalized = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  return normalized.startsWith('/') ? normalized.slice(1) : normalized;
}

function resolveFile(pathname) {
  const cleanPath = safePathname(pathname);
  const exactPath = join(distDir, cleanPath);

  if (existsSync(exactPath) && statSync(exactPath).isFile()) {
    return exactPath;
  }

  if (!extname(cleanPath)) {
    const htmlPath = join(distDir, `${cleanPath}.html`);
    if (existsSync(htmlPath) && statSync(htmlPath).isFile()) {
      return htmlPath;
    }

    const indexPath = join(distDir, cleanPath, 'index.html');
    if (existsSync(indexPath) && statSync(indexPath).isFile()) {
      return indexPath;
    }
  }

  if (extname(cleanPath)) {
    return null;
  }

  const rootIndex = join(distDir, 'index.html');
  return existsSync(rootIndex) ? rootIndex : null;
}

createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

  if (url.pathname === '/' || url.pathname === '') {
    response.writeHead(302, {
      Location: '/login',
      'Cache-Control': 'no-cache',
    });
    response.end();
    console.log(`[${request.method}] ${url.pathname} -> 302 /login`);
    return;
  }

  const filePath = resolveFile(url.pathname);
  console.log(`[${request.method}] ${url.pathname} -> ${filePath ?? '404'}`);

  if (!filePath) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  const extension = extname(filePath);
  response.writeHead(200, {
    'Content-Type': mimeTypes[extension] ?? 'application/octet-stream',
    'Cache-Control':
      extension === '.html' ? 'no-cache, no-store, must-revalidate' : 'public, max-age=31536000, immutable',
  });

  createReadStream(filePath).pipe(response);
}).listen(port, '0.0.0.0', () => {
  console.log(`Ownly local web server ready at http://localhost:${port}`);
});
