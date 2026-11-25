import { io } from 'socket.io-client';

// If we are running locally, use localhost. If deployed, use the live Render URL.
const URL = import.meta.env.DEV ? 'http://localhost:4000' : 'https://crash-demo-t9q3.onrender.com';

export const socket = io(URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});