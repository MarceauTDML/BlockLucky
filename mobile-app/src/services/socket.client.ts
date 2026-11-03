import { io, Socket } from 'socket.io-client';
import secureStorage from './secureStorage';

export const WS_BASE_URL =
  process.env.EXPO_PUBLIC_WS_URL || 'http://localhost:4000';

class SocketClientService {
  private socket: Socket | null = null;

  public async connect(): Promise<Socket> {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const token = await secureStorage.getToken();

    this.socket = io(WS_BASE_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: {
        token: token || undefined,
      },
    });

    return this.socket;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketClient = new SocketClientService();
export default socketClient;
