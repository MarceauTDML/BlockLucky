import { io, Socket } from 'socket.io-client';
import { WS_BASE_URL } from './config';

class SocketClientService {
  private socket: Socket | null = null;
  private token: string | null = null;

  public connect(token: string | null): Socket {
    if (this.socket && this.token === token) return this.socket;
    this.disconnect();
    this.token = token;
    this.socket = io(WS_BASE_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 5,
      auth: token ? { token } : {},
    });
    return this.socket;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.token = null;
  }
}

export const socketClient = new SocketClientService();
export default socketClient;
