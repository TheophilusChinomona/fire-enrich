import { startStdioServer } from '../src/server.js';

startStdioServer().catch((err) => {
  console.error('[fire-enrich-mcp] Fatal error:', err);
  process.exit(1);
});
