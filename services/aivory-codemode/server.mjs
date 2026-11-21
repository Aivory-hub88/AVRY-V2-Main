import { createApp } from './app.mjs';

const PORT = Number(process.env.PORT || 4101);
const KEY = process.env.BRIDGE_KEY;
const BASE = process.env.UPSTREAM_BASE || 'http://127.0.0.1:4100';

if (!KEY) {
  console.error(JSON.stringify({ level: 'fatal', msg: 'BRIDGE_KEY env var is required, refusing to start' }));
  process.exit(1);
}

const log = (level, msg, attrs = {}) => console.log(JSON.stringify({ level, msg, ts: new Date().toISOString(), ...attrs }));
const { app } = createApp({ key: KEY, baseUrl: BASE, log });

app.listen(PORT, '127.0.0.1', () => log('info', 'aivory-codemode listening', { port: PORT, upstream: BASE }));
process.on('SIGTERM', () => {
  log('info', 'SIGTERM received, shutting down');
  process.exit(0);
});
