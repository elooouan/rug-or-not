/**
 * Dev-only Vite config used to photograph the game for the in-game history wall.
 *
 *   SNAP_ROOT=/path/to/worktree npx vite --config scripts/snapshot.config.ts --port 5180
 *
 * It serves any checkout of the game (SNAP_ROOT, default: this repo) and adds a
 * POST /__snapshot endpoint that writes {name, dataUrl} to public/img/history/.
 * The page calls it from the console after grabbing a frame with
 * `__game.renderer.snapshot(...)`. Nothing here ships in a build.
 */
import { defineConfig, type Plugin } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.env.SNAP_ROOT ?? process.cwd();
const outDir = resolve(process.cwd(), 'public/img/history');

function snapshotEndpoint(): Plugin {
  return {
    name: 'rug-or-not-snapshot',
    configureServer(server) {
      server.middlewares.use('/__snapshot', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        let body = '';
        req.on('data', (chunk: Buffer) => (body += chunk.toString()));
        req.on('end', () => {
          try {
            const { name, dataUrl } = JSON.parse(body) as { name: string; dataUrl: string };
            const safe = String(name).replace(/[^a-z0-9-]/gi, '');
            const m = /^data:image\/(png|jpeg);base64,(.+)$/.exec(dataUrl);
            if (!safe || !m) throw new Error('bad payload');
            mkdirSync(outDir, { recursive: true });
            const file = resolve(outDir, `${safe}.${m[1] === 'png' ? 'png' : 'jpg'}`);
            writeFileSync(file, Buffer.from(m[2], 'base64'));
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ ok: true, file }));
          } catch (e) {
            res.statusCode = 400;
            res.end(String((e as Error).message));
          }
        });
      });
    },
  };
}

export default defineConfig({
  root,
  base: './',
  publicDir: resolve(root, 'public'),
  resolve: { alias: { '@': resolve(root, 'src') } },
  plugins: [snapshotEndpoint()],
  server: { fs: { allow: [root, process.cwd()] } },
});
