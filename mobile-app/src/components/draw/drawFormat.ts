import { LotteryPhase, LotteryRoundInfo, TicketItem } from '../../types/api.types';

type Translate = (fr: string, en: string) => string;

export const WAITING_ROOM_SECONDS = 600;

export const resolvePhase = (round?: LotteryRoundInfo | null): LotteryPhase | null => {
  if (!round) return null;
  if (round.phase) return round.phase;
  if (round.status === 'COMPLETED') return 'COMPLETED';
  if (round.status === 'CANCELLED') return 'CANCELLED';
  if (round.status === 'LOCKED') return 'DRAWING';
  return round.inWaitingRoom ? 'WAITING_ROOM' : 'OPEN';
};

export const isFinishedStatus = (status?: string | null): boolean =>
  status === 'COMPLETED' || status === 'CANCELLED';

export const formatRoundLabel = (contractRoundId?: number | null): string =>
  contractRoundId === undefined || contractRoundId === null
    ? ''
    : String(contractRoundId).padStart(3, '0');

export const groupThousands = (value: number): string => {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  return sign + String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

export const formatEthAmount = (value: number, maxDecimals = 4): string => {
  const fixed = Number(value || 0).toFixed(maxDecimals);
  const [integer, decimals = ''] = fixed.split('.');
  let trimmed = decimals.replace(/0+$/, '');
  if (trimmed.length === 1) trimmed = `${trimmed}0`;
  const grouped = groupThousands(Number(integer));
  return trimmed ? `${grouped},${trimmed}` : grouped;
};

export const formatMockEth = (value: number, t: Translate): string => {
  const amount = formatEthAmount(value);
  return Math.abs(value) >= 2
    ? t(`${amount} ETH fictifs`, `${amount} mock ETH`)
    : t(`${amount} ETH fictif`, `${amount} mock ETH`);
};

const MONTHS_FR = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];
const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const formatDayMonth = (iso: string | null | undefined, t: Translate): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.getDate();
  return t(`${day} ${MONTHS_FR[date.getMonth()]}`, `${MONTHS_EN[date.getMonth()]} ${day}`);
};

export const formatClock = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export const formatLongDuration = (totalSeconds: number, t: Translate): string => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(safe / 86400);
  const hours = Math.floor((safe % 86400) / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (days > 0) return t(`${days} j ${pad(hours)} h`, `${days} d ${pad(hours)} h`);
  if (hours > 0) return `${pad(hours)} h ${pad(minutes)} min`;
  const seconds = safe % 60;
  return `${pad(minutes)} min ${pad(seconds)} s`;
};

export const secondsUntil = (iso: string | null | undefined, now: number): number | null => {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return null;
  return Math.max(0, Math.round((target - now) / 1000));
};

export const secondsUntilRoomOpens = (
  round: LotteryRoundInfo | null | undefined,
  now: number,
  fetchedAt: number,
): number => {
  if (!round) return 0;
  const fromIso = secondsUntil(round.waitingRoomOpensAt ?? round.drawTargetTime, now);
  if (fromIso !== null) return fromIso;
  return Math.max(0, round.remainingSeconds - Math.floor((now - fetchedAt) / 1000));
};

export const secondsUntilReveal = (
  round: LotteryRoundInfo | null | undefined,
  now: number,
): number | null => {
  if (!round) return null;
  return secondsUntil(round.revealAt, now);
};

export const getParticipants = (
  round?: LotteryRoundInfo | null,
  fallback?: number,
): number | null => round?.participants ?? fallback ?? null;

export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { message?: unknown } }).data;
    if (data && typeof data.message === 'string' && data.message.trim()) return data.message;
  }
  return fallback;
};

export const findTicketForRound = (
  tickets: TicketItem[],
  contractRoundId?: number | null,
): TicketItem | undefined =>
  contractRoundId === undefined || contractRoundId === null
    ? undefined
    : tickets.find((ticket) => ticket.contractRoundId === contractRoundId);

export const ticketNumberOf = (ticket?: TicketItem | null): string | null =>
  ticket?.ticketNumber ?? null;
