import { createServer } from 'node:http';
import express from 'express';
import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@grooming-kit/shared';
import { RoomManager } from './rooms/RoomManager';
import { registerSocketHandlers } from './socketHandlers';

const PORT = Number(process.env.PORT) || 8090;
// See docs/infra.md §4.4 — the UI is served from a separate subdomain (no load balancer),
// so the Socket.IO server must explicitly allow it as a CORS origin.
const CORS_ORIGINS = (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',');

const app = express();
app.get('/healthz', (_req, res) => {
  res.status(200).send('ok');
});

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
  httpServer,
  {
    path: '/socket.io',
    cors: { origin: CORS_ORIGINS },
  }
);

const roomManager = new RoomManager();

io.on('connection', (socket) => {
  registerSocketHandlers(io, socket, roomManager);
});

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`grooming-kit server listening on :${PORT}`);
});
