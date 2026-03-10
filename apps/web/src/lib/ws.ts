import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws';

let socket: Socket | null = null;

export function getSocket(sessionToken?: string): Socket {
  if (socket) {
    const currentToken = (socket.auth as Record<string, unknown> | undefined)?.token;
    if (currentToken !== sessionToken) {
      // Session token changed — reconnect with new credentials
      socket.disconnect();
      socket = null;
    }
  }
  if (!socket) {
    socket = io(WS_URL, {
      transports: ['websocket'],
      auth: sessionToken ? { token: sessionToken } : undefined,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
