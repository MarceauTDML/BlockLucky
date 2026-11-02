export interface LiveDrawCountdownEvent {
  roundId: string;
  contractRoundId: number;
  remainingSeconds: number;
  inWaitingRoom: boolean;
  participantsCount: number;
  prizePool: number;
}

export interface LiveDrawStartedEvent {
  roundId: string;
  contractRoundId: number;
  chainlinkRequestId: string;
  timestamp: string;
}

export interface LiveDrawWinnerEvent {
  roundId: string;
  contractRoundId: number;
  winnerWallet: string;
  prizePool: number;
  vrfProofHash: string;
  timestamp: string;
}

export interface ChatMessagePayload {
  id: string;
  senderWallet: string;
  message: string;
  emoji?: string;
  timestamp: string;
}

export interface ServerToClientEvents {
  'draw:countdown': (data: LiveDrawCountdownEvent) => void;
  'draw:started': (data: LiveDrawStartedEvent) => void;
  'draw:winner': (data: LiveDrawWinnerEvent) => void;
  'draw:waiting-room': (data: { active: boolean; onlineUsers: number }) => void;
  'chat:message': (data: ChatMessagePayload) => void;
  'chat:reaction': (data: { emoji: string; senderWallet: string }) => void;
  'points:awarded': (data: { userId: string; amount: number; reason: string }) => void;
  'queue:position': (data: { position: number; estimatedWaitSeconds: number }) => void;
  'network:fallback': (data: { isFallback: boolean; rpcProvider: string }) => void;
}

export interface ClientToServerEvents {
  'draw:join': (roundId: string) => void;
  'draw:leave': (roundId: string) => void;
  'chat:send': (payload: { message: string; emoji?: string }) => void;
  'chat:react': (emoji: string) => void;
}
