import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@grooming-kit/shared';
import { API_URL } from '../config';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

/** Lazily creates a single shared Socket.IO connection for the app's lifetime. */
export function getSocket(): AppSocket {
  if (!socket) {
    socket = io(API_URL, {
      path: '/socket.io',
      autoConnect: true,
      reconnection: true,
    });
  }
  return socket;
}
