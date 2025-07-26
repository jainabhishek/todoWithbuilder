import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { RealtimeCommunication } from './realtime-communication';

let io: SocketIOServer | null = null;
let realtimeComm: RealtimeCommunication | null = null;

export function initializeSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? false : '*',
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  });

  // Initialize real-time communication
  realtimeComm = new RealtimeCommunication();
  realtimeComm.initialize(httpServer);

  console.log('Socket.IO server initialized');
  return io;
}

export function getSocketServer(): SocketIOServer | null {
  return io;
}

export function getRealtimeCommunication(): RealtimeCommunication | null {
  return realtimeComm;
}