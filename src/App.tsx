import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ApiError,
  clearLogs,
  confirmEscrow,
  fetchLogs,
  fetchState,
  fundAccount,
  fundEscrow,
  resetSystem,
  toggleBlockchain,
  type EscrowState,
  type LogEntry,
  type SystemState,
} from './api';
import './App.css';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value);

const stateLabels: Record<EscrowState, string> = {
  CREATED: 'Waiting for funding',
  FUNDED: 'Funds locked in escrow',
  P1_CONFIRMED: 'Buyer confirmed',
  P2_CONFIRMED: 'Seller confirmed',
  RELEASED: 'Released to seller',
};

const logTag = (entry: LogEntry) =>
  entry.solanaSignature ? 'BLOCKCHAIN EVENT' : 'EVENT';

type BlockchainDetails = {
  hash?: string;
  txId?: string;
  signature?: string;
};

const extractBlockchainDetails = (
  payload?: Record<string, unknown> | null
): BlockchainDetails | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const raw = (payload as Record<string, unknown>)['blockchain'];
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const hash =
    typeof (raw as Record<string, unknown>).hash === 'string'
      ? ((raw as Record<string, unknown>).hash as string)
      : undefined;
  const txId =
    typeof (raw as Record<string, unknown>).txId === 'string'
      ? ((raw as Record<string, unknown>).txId as string)
      : undefined;
  const signature =
    typeof (raw as Record<string, unknown>).signature === 'string'
      ? ((raw as Record<string, unknown>).signature as string)
      : undefined;
  if (!hash && !txId && !signature) {
    return null;
  }
  return { hash, txId, signature };
};

const logMessage = (entry: LogEntry) => {
  const payload = entry.payload as Record<string, unknown> | undefined;
  const amountCandidate =
    typeof payload?.amount === 'number'
      ? payload.amount
      : typeof payload?.releasedAmount === 'number'
        ? payload.releasedAmount
        : undefined;

  const note =
    typeof payload?.note === 'string' ? ` • ${payload.note}` : '';

  const action = entry.action.replace('ESCROW_', '').replace('_', ' ');
  const actor = entry.actor ? ` • Actor: ${entry.actor}` : '';
  const amountText =
    typeof amountCandidate === 'number'
      ? ` • Amount: ${formatCurrency(amountCandidate)}`
      : '';
  return `${action}${actor}${amountText}${note}`;
};

const App = () => {
  const queryClient = useQueryClient();
  const [showAmountInput, setShowAmountInput] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [isFundModalOpen, setFundModalOpen] = useState(false);
  const [fundTarget, setFundTarget] = useState<'P1' | 'P2'>('P1');
  const [fundAmount, setFundAmount] = useState('');

  const {
    data: systemState,
    isLoading: isStateLoading,
    error: stateError,
  } = useQuery<SystemState>({
    queryKey: ['state'],
    queryFn: fetchState,
    refetchInterval: 5000,
  });

  const {
    data: logs,
    isLoading: areLogsLoading,
    error: logsError,
  } = useQuery({
    queryKey: ['logs'],
    queryFn: fetchLogs,
    refetchInterval: 5000,
  });

  const raiseError = (error: unknown) => {
    if (error instanceof ApiError) {
      setToast(error.message);
      return;
    }
    setToast('Something went wrong. Please try again.');
  };

  useEffect(() => {
    if (!toast) {
      return;
    }
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const invalidateStateAndLogs = () => {
    queryClient.invalidateQueries({ queryKey: ['state'] });
    queryClient.invalidateQueries({ queryKey: ['logs'] });
  };

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) => toggleBlockchain(enabled),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['state'] });
      setToast(
        response.blockchainEnabled
          ? 'Blockchain mode enabled'
          : 'Blockchain mode disabled'
      );
    },
    onError: raiseError,
  });

  const fundMutation = useMutation({
    mutationFn: (amount: number) => fundEscrow(amount),
    onSuccess: () => {
      invalidateStateAndLogs();
      setAmountInput('');
      setShowAmountInput(false);
      setToast('Escrow funded');
    },
    onError: raiseError,
  });

  const [confirmingActor, setConfirmingActor] = useState<'P1' | 'P2' | null>(
    null
  );

  const confirmMutation = useMutation({
    mutationFn: (actor: 'P1' | 'P2') => confirmEscrow(actor),
    onMutate: (actor) => {
      setConfirmingActor(actor);
    },
    onSuccess: () => {
      invalidateStateAndLogs();
      setToast('Confirmation recorded');
    },
    onError: raiseError,
    onSettled: () => {
      setConfirmingActor(null);
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => resetSystem(),
    onSuccess: () => {
      invalidateStateAndLogs();
      setToast('System reset to defaults');
    },
    onError: raiseError,
  });

  const fundAccountMutation = useMutation({
    mutationFn: (variables: { target: 'P1' | 'P2'; amount: number }) =>
      fundAccount(variables.target, variables.amount),
    onSuccess: () => {
      invalidateStateAndLogs();
      setFundAmount('');
      setFundModalOpen(false);
      setToast('Account funded successfully');
    },
    onError: raiseError,
  });

  const clearLogsMutation = useMutation({
    mutationFn: () => clearLogs(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      setToast('Logs cleared');
    },
    onError: raiseError,
  });

  const escrowState = systemState?.escrow.state;
  const buyerBalance = systemState?.buyer.balancePhp ?? 0;
  const canToggleBlockchain =
    escrowState === 'CREATED' &&
    !toggleMutation.isPending &&
    !fundMutation.isPending &&
    !confirmMutation.isPending;

  const p1HasConfirmed =
    escrowState === 'P1_CONFIRMED' || escrowState === 'RELEASED';
  const p2HasConfirmed =
    escrowState === 'P2_CONFIRMED' || escrowState === 'RELEASED';

  const canP1Confirm =
    Boolean(systemState) &&
    (escrowState === 'FUNDED' || escrowState === 'P2_CONFIRMED');
  const canP2Confirm =
    Boolean(systemState) &&
    (escrowState === 'FUNDED' || escrowState === 'P1_CONFIRMED');

  const showP1Confirm = Boolean(systemState) && (canP1Confirm || p1HasConfirmed);
  const showP2Confirm = Boolean(systemState) && (canP2Confirm || p2HasConfirmed);

  const amountNumber = Number(amountInput);
  const amountInvalid =
    Number.isNaN(amountNumber) ||
    amountNumber <= 0 ||
    amountNumber > buyerBalance;

  const sendButtonDisabled =
    amountInvalid || fundMutation.isPending || isStateLoading;

  const fundAmountValue = Number(fundAmount);
  const fundAmountInvalid =
    Number.isNaN(fundAmountValue) || fundAmountValue <= 0;

  const sortedLogs = useMemo<LogEntry[]>(() => {
    if (!logs?.events) {
      return [];
    }
    return [...logs.events].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [logs]);

  const handleFundSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (amountInvalid) {
      setToast('Enter a valid amount within P1 balance.');
      return;
    }
    fundMutation.mutate(Number(amountInput));
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">GAssure Foundation Prototype</p>
          <h1>Escrow + Blockchain Control Room</h1>
          <p className="subtitle">
          </p>
        </div>
        <div className="toggle-stack">
          <div className="toggle-row">
            <span className="toggle-label">Blockchain mode</span>
            <button
              type="button"
              className={`toggle-switch ${
                systemState?.blockchainEnabled ? 'on' : ''
              }`}
              disabled={!canToggleBlockchain}
              onClick={() =>
                toggleMutation.mutate(!systemState?.blockchainEnabled)
              }
            >
              <span className="toggle-knob" />
            </button>
          </div>
          {!canToggleBlockchain && systemState?.escrow.state !== 'CREATED' && (
            <small className="toggle-hint">
              Toggle locks once money enters escrow.
            </small>
          )}
          <button
            type="button"
            className="fund-btn"
            onClick={() => setFundModalOpen(true)}
          >
            + Fund
          </button>
        </div>
      </header>

      {toast && <div className="toast">{toast}</div>}

      {stateError && (
        <div className="alert alert-error">
          {(stateError as ApiError).message}
        </div>
      )}

      <section className="cards-grid">
        <div className="profile-card accent-buyer">
          <div className="card-header">
            <div className="avatar">P1</div>
            <div>
              <p className="label">Buyer</p>
              <h2>{systemState?.buyer.name ?? 'Loading...'}</h2>
            </div>
          </div>
          <p className="balance">{formatCurrency(buyerBalance)}</p>
          {escrowState === 'CREATED' && (
            <div className="send-money">
              {!showAmountInput ? (
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => setShowAmountInput(true)}
                  disabled={fundMutation.isPending || isStateLoading}
                >
                  Send money
                </button>
              ) : (
                <form onSubmit={handleFundSubmit}>
                  <label htmlFor="amount-input">Amount</label>
                  <input
                    id="amount-input"
                    type="number"
                    min={1}
                    step="any"
                    placeholder="₱0.00"
                    value={amountInput}
                    onChange={(event) => setAmountInput(event.target.value)}
                  />
                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={sendButtonDisabled}
                  >
                    {fundMutation.isPending ? 'Sending…' : 'Lock into escrow'}
                  </button>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => {
                      setShowAmountInput(false);
                      setAmountInput('');
                    }}
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>
          )}
          {showP1Confirm && (
            <button
              type="button"
              className={`secondary-btn ${
                p1HasConfirmed ? 'confirmed' : ''
              }`}
              disabled={!canP1Confirm || confirmingActor === 'P1'}
              onClick={() => confirmMutation.mutate('P1')}
            >
              {p1HasConfirmed ? 'Confirmed ✓' : 'Confirm'}
            </button>
          )}
        </div>

        <div className="profile-card accent-escrow">
          <div className="card-header">
            <div className="avatar">Ξ</div>
            <div>
              <p className="label">Escrow account</p>
              <h2>{systemState?.escrow.id ?? 'ESCROW_SINGLE'}</h2>
            </div>
          </div>
          <p className="balance">
            {formatCurrency(systemState?.escrow.amount ?? 0)}
          </p>
          <div className="state-pill">{stateLabels[escrowState ?? 'CREATED']}</div>
          {escrowState === 'RELEASED' && (
            <p className="success-text">Funds released. Ready for reset.</p>
          )}
        </div>

        <div className="profile-card accent-seller">
          <div className="card-header">
            <div className="avatar">P2</div>
            <div>
              <p className="label">Seller</p>
              <h2>{systemState?.seller.name ?? 'Loading...'}</h2>
            </div>
          </div>
          <p className="balance">
            {formatCurrency(systemState?.seller.balancePhp ?? 0)}
          </p>
          {showP2Confirm && (
            <button
              type="button"
              className={`secondary-btn ${
                p2HasConfirmed ? 'confirmed' : ''
              }`}
              disabled={!canP2Confirm || confirmingActor === 'P2'}
              onClick={() => confirmMutation.mutate('P2')}
            >
              {p2HasConfirmed ? 'Confirmed ✓' : 'Confirm'}
            </button>
          )}
        </div>
      </section>

      <section className="log-panel">
        <div className="log-panel__header">
          <div>
            <p className="label">Event log</p>
          </div>
          <div className="log-panel__actions">
            <button
              type="button"
              className="ghost-btn"
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ['logs'] })
              }
              disabled={clearLogsMutation.isPending}
            >
              Refresh
            </button>
            <button
              type="button"
              className="ghost-btn ghost-btn--danger"
              onClick={() => clearLogsMutation.mutate()}
              disabled={
                clearLogsMutation.isPending ||
                areLogsLoading ||
                sortedLogs.length === 0
              }
            >
              {clearLogsMutation.isPending ? 'Clearing…' : 'Clear logs'}
            </button>
          </div>
        </div>
        {logsError && (
          <div className="alert alert-error">
            {(logsError as ApiError).message}
          </div>
        )}
        <div className="log-window">
          {areLogsLoading && <p className="muted">Loading log entries…</p>}
          {!areLogsLoading && sortedLogs.length === 0 && (
            <p className="muted">No events yet. Fund escrow to get started.</p>
          )}
          {sortedLogs.map((entry) => {
            const payload = entry.payload as Record<string, unknown> | undefined;
            const blockchainError =
              payload && typeof payload.blockchainError === 'string'
                ? payload.blockchainError
                : undefined;
            const blockchainDetails = extractBlockchainDetails(entry.payload);
            return (
              <article
                key={entry.id}
                className={`log-entry ${
                  entry.solanaSignature ? 'log-entry--chain' : ''
                }`}
              >
                <div className="log-meta">
                  <span className="log-tag">{logTag(entry)}</span>
                  <time dateTime={entry.timestamp}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </time>
                </div>
                <p className="log-body">{logMessage(entry)}</p>
                {entry.solanaSignature && (
                  <a
                    href={`https://solscan.io/tx/${entry.solanaSignature}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                    className="solscan-link"
                  >
                    View on Solscan ↗
                  </a>
                )}
                {blockchainError && (
                  <p className="log-error">
                    Blockchain error: {blockchainError}
                  </p>
                )}
                {blockchainDetails && (
                  <div className="log-chain-details">
                    {blockchainDetails.hash && (
                      <div className="log-chain-row">
                        <span className="log-chain-label">Hash</span>
                        <code className="log-chain-value">
                          {blockchainDetails.hash}
                        </code>
                      </div>
                    )}
                    {blockchainDetails.txId && (
                      <div className="log-chain-row">
                        <span className="log-chain-label">Tx ID</span>
                        <code className="log-chain-value">
                          {blockchainDetails.txId}
                        </code>
                      </div>
                    )}
                    {blockchainDetails.signature && (
                      <div className="log-chain-row">
                        <span className="log-chain-label">Signature</span>
                        <code className="log-chain-value">
                          {blockchainDetails.signature}
                        </code>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <footer className="footer-cta">
        <div className="reset-controls">
          <button
            type="button"
            className="danger-btn"
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
          >
            {resetMutation.isPending ? 'Resetting…' : 'Reset system'}
          </button>
          <div className="info-tooltip">
            <button
              type="button"
              className="info-btn"
              aria-label="What resetting the system will do"
            >
              i
            </button>
            <span className="info-tooltip__bubble">
              Reset returns funds to P1, clears escrow, and re-locks blockchain
              mode.
            </span>
          </div>
        </div>
      </footer>

      {isFundModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>Fund account</h3>
            <p className="muted">
              Inject mock funds directly into a wallet for demo purposes.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (fundAmountInvalid) {
                  setToast('Enter a valid amount greater than zero.');
                  return;
                }
                fundAccountMutation.mutate({
                  target: fundTarget,
                  amount: fundAmountValue,
                });
              }}
              className="modal-form"
            >
              <label htmlFor="fund-target">Target user</label>
              <select
                id="fund-target"
                value={fundTarget}
                onChange={(event) =>
                  setFundTarget(event.target.value as 'P1' | 'P2')
                }
              >
                <option value="P1">P1 (Buyer)</option>
                <option value="P2">P2 (Seller)</option>
              </select>

              <label htmlFor="fund-amount">Amount (PHP)</label>
              <input
                id="fund-amount"
                type="number"
                min={1}
                step="any"
                placeholder="₱0.00"
                value={fundAmount}
                onChange={(event) => setFundAmount(event.target.value)}
              />
              <div className="modal-actions">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    setFundModalOpen(false);
                    setFundAmount('');
                  }}
                  disabled={fundAccountMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={fundAmountInvalid || fundAccountMutation.isPending}
                >
                  {fundAccountMutation.isPending ? 'Funding…' : 'Add funds'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

