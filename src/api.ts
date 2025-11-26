export type EscrowState =
  | 'CREATED'
  | 'FUNDED'
  | 'P1_CONFIRMED'
  | 'P2_CONFIRMED'
  | 'RELEASED';

export type SystemState = {
  blockchainEnabled: boolean;
  escrow: {
    id: string;
    state: EscrowState;
    amount: number;
  };
  buyer: {
    id: string;
    name: string;
    balancePhp: number;
  };
  seller: {
    id: string;
    name: string;
    balancePhp: number;
  };
};

export type LogEntry = {
  id: string;
  action: string;
  actor?: string | null;
  payload?: Record<string, unknown> | null;
  timestamp: string;
  solanaSignature?: string | null;
};

export type LogsResponse = {
  events: LogEntry[];
};

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const jsonHeaders: HeadersInit = {
  'Content-Type': 'application/json',
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      ...jsonHeaders,
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (data && (data.error as string | undefined)) ?? response.statusText;
    throw new ApiError(message, response.status, data?.details);
  }

  return data as T;
}

export const fetchState = () => request<SystemState>('/api/state');

export const toggleBlockchain = (enabled: boolean) =>
  request<{ blockchainEnabled: boolean }>('/api/blockchain/toggle', {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  });

export const fundEscrow = (amount: number) =>
  request<SystemState>('/api/escrow/fund', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });

export const confirmEscrow = (actor: 'P1' | 'P2') =>
  request<SystemState>('/api/escrow/confirm', {
    method: 'POST',
    body: JSON.stringify({ actor }),
  });

export const resetSystem = () =>
  request<SystemState>('/api/reset', { method: 'POST' });

export const fetchLogs = () => request<LogsResponse>('/api/logs');

export const clearLogs = () =>
  request<LogsResponse>('/api/logs', { method: 'DELETE' });

export const fundAccount = (target: 'P1' | 'P2', amount: number) =>
  request<SystemState>('/api/fund-account', {
    method: 'POST',
    body: JSON.stringify({ target, amount }),
  });

