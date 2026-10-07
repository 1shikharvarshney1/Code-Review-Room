import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import env from './config/env.js';
import { connectDB } from './config/db.js';
import { setupSockets } from './sockets/index.js';
import { initLLM } from './services/llmService.js';

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

async function startServer() {
  await connectDB();
  await initLLM();

  const httpServer = createServer(app);
  
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    maxHttpBufferSize: 2 * 1024 * 1024,
  });

  setupSockets(io);

  httpServer.listen(env.PORT, () => {
    console.log(`Server listening on port ${env.PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal server error:', err);
  process.exit(1);
});
