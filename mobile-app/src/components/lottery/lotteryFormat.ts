import {
  LotteryPhase,
  LotteryRoundInfo,
  LotteryStatusResponse,
  TicketItem,
} from '../../types/api.types';

const NARROW_SPACE = ' ';

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const data = (error as { data?: { message?: unknown } } | undefined)?.data;
  return typeof data?.message === 'string' && data.message.length > 0 ? data.message : fallback;
};

export const formatInteger = (value: number): string => {
  const rounded = Math.round(Math.abs(value));
  const grouped = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, NARROW_SPACE);
  return value < 0 ? `-${grouped}` : grouped;
};

export const formatDecimal = (value: number, digits = 2): string => {
  const fixed = Math.abs(value).toFixed(digits);
  const [whole, decimals] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, NARROW_SPACE);
  const sign = value < 0 ? '-' : '';
  return decimals ? `${sign}${grouped},${decimals}` : `${sign}${grouped}`;
};

export const formatEth = (value: number | null | undefined, digits = 2): string =>
  value === null || value === undefined || Number.isNaN(value)
    ? '—'
    : `${formatDecimal(value, digits)} ETH`;

export const formatTicketPrice = (value: number): string => {
  const digits = value < 0.01 ? 3 : 2;
  return formatDecimal(value, digits);
};

export const formatRoundNumber = (contractRoundId: number | undefined): string =>
  `#${String(contractRoundId ?? 0).padStart(3, '0')}`;

export const formatPercent = (value: number): string =>
  `${formatDecimal(value, value % 1 === 0 ? 0 : 1)}${NARROW_SPACE}%`;

export const resolvePhase = (round: LotteryRoundInfo | undefined): LotteryPhase => {
  if (!round) return 'OPEN';
  if (round.phase) return round.phase;
  if (round.status === 'COMPLETED') return 'COMPLETED';
  if (round.status === 'CANCELLED') return 'CANCELLED';
  if (round.status === 'LOCKED') return 'DRAWING';
  return round.inWaitingRoom ? 'WAITING_ROOM' : 'OPEN';
};

export const resolveParticipants = (status: LotteryStatusResponse | undefined) => {
  const current = status?.round.participants ?? status?.progression.distinctParticipants ?? 0;
  const max = status?.round.maxParticipants ?? status?.progression.targetParticipants ?? 0;
  const percentage =
    max > 0 ? Math.min(100, (current / max) * 100) : (status?.progression.percentage ?? 0);
  return { current, max, remaining: Math.max(0, max - current), percentage };
};

export const purchaseDeadline = (round: LotteryRoundInfo | undefined): string | null =>
  round ? (round.waitingRoomOpensAt ?? round.drawTargetTime ?? null) : null;

export const findCurrentRoundTicket = (
  tickets: TicketItem[] | undefined,
  round: LotteryRoundInfo | undefined,
): TicketItem | undefined => {
  if (!round || !Array.isArray(tickets)) return undefined;
  return tickets.find(
    (ticket) =>
      (ticket.roundId !== undefined && ticket.roundId === round.id) ||
      (ticket.contractRoundId !== undefined && ticket.contractRoundId === round.contractRoundId),
  );
};

export const shortMilestoneTitle = (title: string): string => {
  const withoutCount = title.replace(/\s*\([^)]*\)\s*$/, '');
  return withoutCount.replace(/^Palier\s+/i, '').trim();
};

export const splitDuration = (totalSeconds: number) => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  return {
    days: Math.floor(safe / 86400),
    hours: Math.floor((safe % 86400) / 3600),
    minutes: Math.floor((safe % 3600) / 60),
    seconds: safe % 60,
  };
};

export const formatDuration = (totalSeconds: number): string => {
  const { days, hours, minutes, seconds } = splitDuration(totalSeconds);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (days > 0) return `${days} j ${pad(hours)} h`;
  if (hours > 0) return `${pad(hours)} h ${pad(minutes)} min`;
  return `${pad(minutes)} min ${pad(seconds)} s`;
};
