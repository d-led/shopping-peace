// Serves the production build out of dist/ so that the end-to-end tests never
// need a server started by hand. Plain Node, no dependencies.
//
//   node tests/e2e/server.mjs [root]   # PORT and HOST can override the defaults
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve(process.argv[2] ?? 'dist');
const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? '127.0.0.1';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/** The file this path points at, or null when there is none (or it escapes dist/). */
async function existingFile(urlPath) {
  const candidate = resolve(root, `.${urlPath}`);
  if (candidate !== root && !candidate.startsWith(root + sep)) {
    return null;
  }
  try {
    return (await stat(candidate)).isFile() ? candidate : null;
  } catch {
    return null;
  }
}

const server = createServer(async (request, response) => {
  const urlPath = new URL(request.url ?? '/', `http://${host}`).pathname;
  // A single page app: bare paths fall back to index.html, while a missing
  // script or stylesheet stays a loud 404 instead of quietly serving HTML.
  const wanted = extname(urlPath) === '' ? '/index.html' : urlPath;
  const file = await existingFile(wanted);

  if (file === null) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('not found');
    return;
  }

  response.writeHead(200, {
    'content-type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  response.end(await readFile(file));
});

server.listen(port, host, () => {
  console.log(`serving ${root} on http://${host}:${port}`);
});
