# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## GAssure Escrow + Blockchain – Foundation System (One-Escrow Prototype)

---

## 1. Overview

This document defines the **foundation system** for the GAssure escrow engine and blockchain logging. It is intended to be:

* A **real**, DB-backed, blockchain-backed implementation.
* The **base** for the full hackathon system.
* A minimal but complete version supporting **one fixed escrow** between a buyer (P1) and a seller (P2).

The system includes:

* A **React frontend** (Vite + TypeScript) providing a single-page UI.
* **Supabase** backend (PostgreSQL database + Edge Functions) for data persistence and business logic.
* **Solana devnet** integration using the Memo program via `@solana/web3.js`.

No mocks or placeholders are allowed in logic related to:

* Balances
* Escrow state transitions
* Blockchain logging

---

## 2. System Features

### 2.1 Core Features

1. **Escrow Management**
   - Create and manage a single escrow transaction between buyer (P1) and seller (P2)
   - Track escrow state through lifecycle: CREATED → FUNDED → CONFIRMED → RELEASED
   - Real-time balance tracking for both parties

2. **Money Flow**
   - Buyer can fund escrow from their wallet balance
   - Funds are locked in escrow until both parties confirm
   - Automatic release to seller when both parties confirm
   - Account funding feature for testing/demo purposes

3. **Blockchain Integration**
   - Optional blockchain logging via Solana devnet
   - All escrow events can be logged on-chain as immutable records
   - Blockchain mode can be toggled (only when escrow is in CREATED state)
   - Full transaction metadata (hash, tx ID, signature) stored and displayed

4. **Event Logging**
   - Complete audit trail of all escrow actions
   - Real-time event log display
   - Blockchain-backed events with Solscan links
   - Clear logs functionality for testing

5. **System Reset**
   - Full system reset capability
   - Restores initial balances and escrow state
   - Clears event history (except reset event itself)

### 2.2 User Interface Features

- **Visual Escrow Flow**: Three-avatar layout showing P1, Escrow, and P2
- **Real-time Balance Display**: Live updates of buyer and seller balances
- **State Indicators**: Clear visual indication of escrow state
- **Interactive Controls**: Context-aware buttons based on escrow state
- **Event Log Window**: Chronological display of all events with blockchain details
- **Blockchain Toggle**: Enable/disable blockchain logging
- **Fund Account Modal**: Add funds to P1 or P2 for testing

---

## 3. Application Flow

### 3.1 Escrow Lifecycle

```
┌─────────┐
│ CREATED │  ← Initial state, blockchain can be toggled
└────┬────┘
     │ P1 funds escrow
     ▼
┌─────────┐
│ FUNDED  │  ← Money locked, both parties can confirm
└────┬────┘
     │ P1 or P2 confirms
     ▼
┌──────────────┐
│ P1_CONFIRMED │  ← One party confirmed, waiting for other
│ or           │
│ P2_CONFIRMED │
└────┬─────────┘
     │ Other party confirms
     ▼
┌──────────┐
│ RELEASED │  ← Funds released to seller, transaction complete
└──────────┘
```

### 3.2 User Actions Flow

1. **Initialization**
   - System starts with P1 (200,000 PHP), P2 (0 PHP)
   - Escrow in CREATED state with 0 amount
   - Blockchain logging disabled by default

2. **Enable Blockchain (Optional)**
   - User toggles blockchain mode ON (only available in CREATED state)
   - All subsequent actions will be logged on Solana devnet

3. **Fund Escrow**
   - P1 enters amount to send
   - System validates: amount > 0 and amount ≤ P1 balance
   - P1 balance decreases, escrow amount increases
   - State changes to FUNDED
   - Event logged (blockchain if enabled)

4. **Confirmations**
   - P1 or P2 clicks "Confirm" button
   - System validates state allows confirmation
   - State transitions: FUNDED → P1_CONFIRMED or P2_CONFIRMED
   - Event logged (blockchain if enabled)
   - If both confirmed, triggers RELEASE

5. **Release (Automatic)**
   - When both parties confirmed, system automatically:
     - Transfers escrow amount to P2
     - Sets escrow amount to 0
     - Changes state to RELEASED
   - Event logged (blockchain if enabled)

6. **Reset**
   - User clicks RESET button
   - System restores initial balances
   - Escrow returns to CREATED state
   - All events cleared (except reset event)
   - Blockchain enabled after reset

### 3.3 Data Flow

```
┌─────────┐
│ React   │  User interaction
│ Frontend│  ──────────────┐
└────┬────┘                 │
     │                      │
     │ API Calls            │
     ▼                      │
┌─────────────────┐         │
│ Supabase Edge   │         │
│ Functions       │         │
└────┬────────────┘         │
     │                      │
     ├─► Validate           │
     ├─► Update DB          │
     ├─► Log Event           │
     └─► Blockchain (if ON)  │
         │                   │
         ▼                   │
┌─────────────────┐         │
│ Solana Devnet   │         │
│ (Memo Program)  │         │
└─────────────────┘         │
     │                      │
     └──────────────────────┘
     │
     ▼
┌─────────────┐
│ Supabase    │  Store transaction signature
│ PostgreSQL  │  Update balances & state
└────┬────────┘
     │
     ▼
┌─────────┐
│ React   │  Display updated state
│ Frontend│  Show event in log
└─────────┘
```

---

## 4. High-Level Architecture

### 4.1 Components

* **Frontend**
  * React + TypeScript + Vite
  * Single-page application implementing the escrow flow and event log visualization
  * Uses Supabase JavaScript client for database access and Edge Functions for business logic

* **Backend (Supabase)**
  * **PostgreSQL Database**: Stores users, escrow, and event logs
  * **Edge Functions**: TypeScript functions for business logic (escrow operations, blockchain integration)
  * **Row Level Security (RLS)**: Database security policies
  * **Realtime Subscriptions**: Optional real-time updates (future enhancement)

* **Blockchain**
  * Solana Devnet
  * `@solana/web3.js` with Memo Program
  * Used for audit logging when blockchain mode is ON
  * Executed via Supabase Edge Functions

### 4.2 Tech Stack

**Frontend:**
- React 18+
- TypeScript
- Vite
- Supabase JS Client (`@supabase/supabase-js`)
- `@solana/web3.js` (for client-side blockchain verification, optional)

**Backend (Supabase):**
- PostgreSQL (via Supabase)
- Supabase Edge Functions (Deno runtime)
- TypeScript
- `@solana/web3.js` (in Edge Functions)

**Development Tools:**
- Supabase CLI
- Node.js (for local development)
- Git

### 4.3 Data Flow

1. Frontend calls Supabase Edge Functions via REST API or Supabase client.
2. Edge Functions validate input, modify database state (balances, escrow state), and record events.
3. If blockchain is enabled, Edge Functions write memo transactions to Solana devnet and store signatures.
4. Database updates trigger real-time subscriptions (optional).
5. Frontend fetches updated state and renders balances, buttons, and log entries.

---

## 5. Backend Specification (Supabase)

### 5.1 Supabase Setup

The backend uses Supabase for:

* **PostgreSQL Database**: Managed Postgres with automatic backups
* **Edge Functions**: Serverless TypeScript functions for business logic
* **Database Client**: Direct SQL access via Supabase client

### 5.2 Environment Configuration

**Supabase Project Variables:**
- `SUPABASE_URL` – Your Supabase project URL
- `SUPABASE_ANON_KEY` – Public anon key for client-side access
- `SUPABASE_SERVICE_ROLE_KEY` – Service role key for Edge Functions (server-side only)

**Edge Function Secrets (via Supabase CLI or Dashboard):**
- `SOLANA_RPC_URL` – `https://api.devnet.solana.com`
- `SOLANA_PRIVATE_KEY` – JSON array of secret key bytes (for a devnet wallet)

**Frontend Environment Variables (`.env.local`):**
- `VITE_SUPABASE_URL` – Supabase project URL
- `VITE_SUPABASE_ANON_KEY` – Public anon key

### 5.3 Database Schema

Create the following tables in Supabase SQL Editor:

```sql
-- Create enum type for escrow state
CREATE TYPE escrow_state AS ENUM ('CREATED', 'FUNDED', 'P1_CONFIRMED', 'P2_CONFIRMED', 'RELEASED');

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  gcash_handle TEXT UNIQUE,
  mock_balance_php INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Escrow table
CREATE TABLE escrow (
  id TEXT PRIMARY KEY DEFAULT 'ESCROW_SINGLE',
  buyer_id UUID NOT NULL REFERENCES users(id),
  seller_id UUID NOT NULL REFERENCES users(id),
  amount INTEGER DEFAULT 0 NOT NULL,
  state escrow_state DEFAULT 'CREATED' NOT NULL,
  blockchain_enabled BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Escrow events table
CREATE TABLE escrow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id TEXT NOT NULL REFERENCES escrow(id),
  action TEXT NOT NULL,
  actor TEXT,
  payload JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  solana_signature TEXT
);

-- Indexes for performance
CREATE INDEX idx_escrow_events_escrow_id ON escrow_events(escrow_id);
CREATE INDEX idx_escrow_events_timestamp ON escrow_events(timestamp DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_escrow_updated_at
  BEFORE UPDATE ON escrow
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 5.4 Row Level Security (RLS)

Enable RLS and create policies:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_events ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for demo purposes)
-- In production, implement proper authentication
CREATE POLICY "Allow public read access" ON users
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access" ON escrow
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access" ON escrow_events
  FOR SELECT USING (true);

-- Allow service role to modify (via Edge Functions)
-- Edge Functions use service role key, so they bypass RLS
-- For direct client access, you may want to add INSERT/UPDATE policies
```

### 5.5 Seed Data

Create a SQL migration or run in Supabase SQL Editor:

```sql
-- Insert seed users
INSERT INTO users (id, name, gcash_handle, mock_balance_php)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Buyer Demo', 'buyer_demo', 200000),
  ('00000000-0000-0000-0000-000000000002', 'Seller Demo', 'seller_demo', 0)
ON CONFLICT (id) DO NOTHING;

-- Insert seed escrow
INSERT INTO escrow (id, buyer_id, seller_id, amount, state, blockchain_enabled)
VALUES (
  'ESCROW_SINGLE',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  0,
  'CREATED',
  false
)
ON CONFLICT (id) DO NOTHING;
```

Escrow balances are represented via:

* `users.mock_balance_php` – P1 and P2 wallet balances
* `escrow.amount` – amount currently locked in escrow

---

## 6. Escrow Ledger and State Machine

### 6.1 Money Model

* `P1.mockBalancePhp` – buyer's wallet
* `P2.mockBalancePhp` – seller's wallet
* `Escrow.amount` – amount currently locked

### 6.2 FUND

Action: P1 sends money into escrow.

* Preconditions:

  * `Escrow.state === CREATED`
* Validation:

  * `amount > 0`
  * `amount ≤ P1.mockBalancePhp`
* Operations (atomic, inside a transaction):

  * `P1.mockBalancePhp -= amount`
  * `Escrow.amount = amount`
  * `Escrow.state = FUNDED`
* Event:

  * Create `EscrowEvent` with `action = "ESCROW_FUNDED"`, `actor = "P1"`, and payload containing amount.
* Blockchain:

  * If `Escrow.blockchainEnabled` is `true`, create a real memo transaction and store the signature.

### 6.3 CONFIRM

Action: P1 and P2 confirm that conditions are met.

Request body includes `actor: "P1"` or `actor: "P2"`.

* P1 Confirm:

  * Allowed states:

    * `FUNDED` → change to `P1_CONFIRMED`
    * `P2_CONFIRMED` → trigger RELEASE
* P2 Confirm:

  * Allowed states:

    * `FUNDED` → change to `P2_CONFIRMED`
    * `P1_CONFIRMED` → trigger RELEASE
* For each confirm:

  * Write `EscrowEvent` (`ESCROW_P1_CONFIRMED` or `ESCROW_P2_CONFIRMED`) with `actor` and payload.
  * If blockchain enabled, write memo and capture signature.

### 6.4 RELEASE

Triggered when both P1 and P2 have confirmed.

* Preconditions:

  * `Escrow.state === P1_CONFIRMED` and P2 confirms
  * or `Escrow.state === P2_CONFIRMED` and P1 confirms
* Operations:

  * `P2.mockBalancePhp += Escrow.amount`
  * `Escrow.amount = 0`
  * `Escrow.state = RELEASED`
* Event:

  * `EscrowEvent` with `action = "ESCROW_RELEASED"`
* Blockchain:

  * If enabled, memo and signature stored.

### 6.5 RESET

Global reset of the system.

* Operations:

  * `P1.mockBalancePhp = 200000` (initial seed balance)
  * `P2.mockBalancePhp = 0` (initial seed balance)
  * `Escrow.amount = 0`
  * `Escrow.state = CREATED`
  * `Escrow.blockchainEnabled = true` (enabled after reset)
  * Delete all existing `EscrowEvent` records for this escrow
* Event:

  * Create a new `EscrowEvent` with `action = "SYSTEM_RESET"` (this becomes the only log entry)
* Blockchain:

  * If blockchain was enabled, this action is logged via memo.

All state-modifying operations must be wrapped in database transactions to ensure consistency.

---

## 7. Supabase Edge Functions

### 7.1 Edge Function Structure

Create the following Edge Functions in `supabase/functions/`:

1. **`get-state`** – Returns current system state
2. **`toggle-blockchain`** – Toggles blockchain mode
3. **`fund-escrow`** – Funds escrow from P1
4. **`confirm-escrow`** – Handles P1/P2 confirmations
5. **`reset-system`** – Resets entire system
6. **`get-logs`** – Returns event logs
7. **`clear-logs`** – Clears event logs
8. **`fund-account`** – Adds funds to P1 or P2

### 7.2 Edge Function Template

Each Edge Function follows this structure:

```typescript
// supabase/functions/function-name/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body
    const body = await req.json()

    // Business logic here
    // ...

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
```

### 7.3 Database Transactions

Use Supabase client transactions for atomic operations:

```typescript
// Example: Atomic escrow funding
const { data, error } = await supabaseClient.rpc('fund_escrow', {
  p_amount: amount,
  p_buyer_id: buyerId
})

// Or use multiple queries in a transaction via stored procedure
```

Alternatively, use database functions (stored procedures) for complex transactions:

```sql
-- Example stored procedure for funding escrow
CREATE OR REPLACE FUNCTION fund_escrow(p_amount INTEGER, p_buyer_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_escrow_id TEXT := 'ESCROW_SINGLE';
  v_buyer_balance INTEGER;
  v_result JSONB;
BEGIN
  -- Check balance
  SELECT mock_balance_php INTO v_buyer_balance
  FROM users WHERE id = p_buyer_id;
  
  IF v_buyer_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  -- Update buyer balance
  UPDATE users 
  SET mock_balance_php = mock_balance_php - p_amount
  WHERE id = p_buyer_id;
  
  -- Update escrow
  UPDATE escrow
  SET amount = p_amount, state = 'FUNDED'
  WHERE id = v_escrow_id;
  
  -- Return updated state
  SELECT jsonb_build_object(
    'success', true,
    'buyer_balance', (SELECT mock_balance_php FROM users WHERE id = p_buyer_id),
    'escrow_amount', p_amount
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
```

---

## 8. Blockchain Integration (Solana Devnet)

### 8.1 When Blockchain Is Used

If `Escrow.blockchainEnabled === true`, the following actions must trigger memo transactions on Solana devnet:

* FUND
* P1_CONFIRM
* P2_CONFIRM
* RELEASE
* RESET
* ACCOUNT_FUNDED (when funds are added to P1 or P2 via the fund account feature)

### 8.2 Memo Payload

Structure (JSON string):

```json
{
  "escrowId": "ESCROW_SINGLE",
  "action": "ESCROW_FUNDED" | "ESCROW_P1_CONFIRMED" | "ESCROW_P2_CONFIRMED" | "ESCROW_RELEASED" | "SYSTEM_RESET",
  "amount": 40000,
  "buyerId": "uuid...",
  "sellerId": "uuid...",
  "timestamp": "2025-.."
}
```

### 8.3 Memo Transaction

The Edge Function `BlockchainService.logEventOnChain(payload)` must:

* Use `@solana/web3.js` (imported via CDN in Deno)
* Initialize a connection with `SOLANA_RPC_URL` (from environment)
* Load keypair from `SOLANA_PRIVATE_KEY` (from environment)
* Fetch the latest blockhash from the RPC
* Build a transaction including a Memo instruction with the payload
* Send and confirm the transaction
* Return an object containing:
  * `signature`: Transaction signature (also used as `txId`)
  * `txId`: Transaction ID (same as signature)
  * `hash`: The blockhash used for the transaction

**Example Edge Function Blockchain Service:**

```typescript
// supabase/functions/_shared/blockchain.ts
import { Connection, Keypair, Transaction, sendAndConfirmTransaction } from 'https://esm.sh/@solana/web3.js@latest'
import { createMemoInstruction } from 'https://esm.sh/@solana/web3.js@latest'

export async function logEventOnChain(payload: any) {
  const rpcUrl = Deno.env.get('SOLANA_RPC_URL') || 'https://api.devnet.solana.com'
  const privateKey = JSON.parse(Deno.env.get('SOLANA_PRIVATE_KEY') || '[]')
  
  const connection = new Connection(rpcUrl, 'confirmed')
  const keypair = Keypair.fromSecretKey(Uint8Array.from(privateKey))
  
  const memo = JSON.stringify(payload)
  const transaction = new Transaction().add(
    createMemoInstruction(memo, [keypair.publicKey])
  )
  
  const { blockhash } = await connection.getLatestBlockhash()
  transaction.recentBlockhash = blockhash
  transaction.feePayer = keypair.publicKey
  
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [keypair]
  )
  
  return {
    signature,
    txId: signature,
    hash: blockhash
  }
}
```

### 8.4 Event and Signature Storage

For each blockchain-enabled action:

1. Create an `EscrowEvent` with `action`, `actor`, and `payload`.
2. Execute the memo transaction.
3. If successful, update the `EscrowEvent`:
   * Set `solanaSignature` to the transaction signature
   * Store blockchain metadata in `payload.blockchain`:
     ```json
     {
       "hash": "<blockhash>",
       "txId": "<signature>",
       "signature": "<signature>"
     }
     ```

If blockchain is disabled, the event is created with `solanaSignature = null` and no blockchain metadata.

If Solana calls fail, the system should:

* Still store the event with `solanaSignature = null`
* Store the error message in `payload.blockchainError`
* Return a successful response so UI remains usable, while the log window highlights the blockchain error

---

## 9. API Contracts (Supabase Edge Functions)

Base path: `https://<project-ref>.supabase.co/functions/v1/`
All responses are JSON.
Error responses follow:

```json
{
  "error": "Message",
  "details": { ...optional contextual info... }
}
```

**Note:** Frontend calls Edge Functions using Supabase client or direct fetch with proper headers:

```typescript
// Using Supabase client
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { ... }
})

// Or using fetch
const response = await fetch(`${SUPABASE_URL}/functions/v1/function-name`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  },
  body: JSON.stringify({ ... })
})
```

### 9.1 GET /get-state

**Edge Function:** `get-state`

Returns the current system state for UI:

```json
{
  "blockchainEnabled": true,
  "escrow": {
    "id": "ESCROW_SINGLE",
    "state": "FUNDED",
    "amount": 40000
  },
  "buyer": {
    "id": "uuid-p1",
    "name": "P1",
    "balancePhp": 160000
  },
  "seller": {
    "id": "uuid-p2",
    "name": "P2",
    "balancePhp": 0
  }
}
```

### 9.2 POST /toggle-blockchain

**Edge Function:** `toggle-blockchain`

Body:

```json
{
  "enabled": true
}
```

Rules:

* Allowed only when `Escrow.state === CREATED`.
* If called in any other state, return HTTP 400 with an error indicating that the mode cannot be toggled during an active transaction.

Response:

```json
{
  "blockchainEnabled": true
}
```

### 9.3 POST /fund-escrow

**Edge Function:** `fund-escrow`

Body:

```json
{
  "amount": 40000
}
```

Behavior:

* Executes FUND operation per Section 6.2.
* Returns updated state:

```json
{
  "escrow": {
    "state": "FUNDED",
    "amount": 40000
  },
  "buyer": { "balancePhp": 160000 },
  "seller": { "balancePhp": 0 }
}
```

### 9.4 POST /confirm-escrow

**Edge Function:** `confirm-escrow`

Body:

```json
{
  "actor": "P1"
}
```

or

```json
{
  "actor": "P2"
}
```

Behavior:

* Executes CONFIRM logic per Section 6.3 and possibly RELEASE per Section 6.4.
* Returns updated state:

```json
{
  "escrow": {
    "state": "P1_CONFIRMED" | "P2_CONFIRMED" | "RELEASED",
    "amount": 40000 | 0
  },
  "buyer": { "balancePhp": ... },
  "seller": { "balancePhp": ... }
}
```

### 9.5 POST /reset-system

**Edge Function:** `reset-system`

No body.

Resets the full system per Section 6.5 and returns:

```json
{
  "escrow": {
    "state": "CREATED",
    "amount": 0
  },
  "buyer": { "balancePhp": 200000 },
  "seller": { "balancePhp": 0 },
  "blockchainEnabled": false
}
```

### 9.6 GET /get-logs

**Edge Function:** `get-logs`

Returns a chronological list of events (newest first, limited to 100):

```json
{
  "events": [
    {
      "id": "uuid-event",
      "timestamp": "2025-..",
      "action": "ESCROW_FUNDED",
      "actor": "P1",
      "payload": {
        "amount": 40000,
        "blockchain": {
          "hash": "blockhash...",
          "txId": "signature...",
          "signature": "signature..."
        }
      },
      "solanaSignature": "3x28f9F...aB19c"
    }
  ]
}
```

The frontend uses this to render the "event log window."

### 9.7 POST /clear-logs

**Edge Function:** `clear-logs`

Clears all event logs for the escrow.

* No body required
* Returns: `{ "events": [] }`

This endpoint is useful for resetting the log view without resetting the entire system.

### 9.8 POST /fund-account

**Edge Function:** `fund-account`

Adds funds directly to a user's account (P1 or P2) for testing/demo purposes.

Body:

```json
{
  "target": "P1",
  "amount": 50000
}
```

or

```json
{
  "target": "P2",
  "amount": 30000
}
```

Behavior:

* Validates `amount > 0`
* Increments the target user's `mock_balance_php` by the specified amount
* Creates an `EscrowEvent` with `action = "ACCOUNT_FUNDED"` and `actor = target`
* If blockchain enabled, logs the event on-chain
* Returns updated system state

Response:

```json
{
  "escrow": { ... },
  "buyer": { "balancePhp": 250000 },
  "seller": { "balancePhp": 30000 },
  "blockchainEnabled": true
}
```

---

## 10. Frontend Specification (React + Supabase)

### 10.1 Tech Stack

* **React 18+** with TypeScript
* **Vite** for build tooling
* **Supabase JS Client** (`@supabase/supabase-js`) for API calls
* **CSS Modules or Tailwind CSS** for styling
* **React Hooks** for state management

### 10.2 Project Structure

```
src/
├── components/
│   ├── EscrowFlow.tsx          # Main three-avatar layout
│   ├── UserAvatar.tsx          # P1/P2 avatar component
│   ├── EscrowAccount.tsx       # Escrow account display
│   ├── EventLog.tsx            # Event log window
│   ├── BlockchainToggle.tsx    # Blockchain toggle switch
│   ├── FundAccountModal.tsx    # Fund account modal
│   └── ResetButton.tsx         # Reset system button
├── services/
│   ├── supabase.ts            # Supabase client initialization
│   ├── api.ts                 # Edge Function API calls
│   └── blockchain.ts          # Client-side blockchain utilities (optional)
├── hooks/
│   ├── useEscrowState.ts      # Hook for fetching escrow state
│   └── useEventLogs.ts        # Hook for fetching event logs
├── types/
│   └── index.ts               # TypeScript type definitions
├── App.tsx                    # Main app component
└── main.tsx                   # Entry point
```

### 10.3 Supabase Client Setup

```typescript
// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 10.4 API Service

```typescript
// src/services/api.ts
import { supabase } from './supabase'

export async function getState() {
  const { data, error } = await supabase.functions.invoke('get-state')
  if (error) throw error
  return data
}

export async function fundEscrow(amount: number) {
  const { data, error } = await supabase.functions.invoke('fund-escrow', {
    body: { amount }
  })
  if (error) throw error
  return data
}

// ... other API functions
```

### 10.5 Layout

The UI is a single page with:

* Top-right: Blockchain toggle and "Fund account" button
* Center row: three avatar circles for:

  * P1 (Buyer) with balance and "Send Money" flow
  * Escrow Account with locked amount and status
  * P2 (Seller) with balance and "Confirm" button
* Bottom: Log window with "Refresh" and "Clear logs" buttons, and RESET button

### 10.6 State Source

The frontend must not simulate business logic. It must:

* Fetch state via Edge Function `get-state`
* Fetch logs via Edge Function `get-logs`
* Trigger actions via Edge Functions:

  * `toggle-blockchain`
  * `fund-escrow`
  * `confirm-escrow`
  * `reset-system`
  * `fund-account`
  * `clear-logs`

Any UI changes depend on backend responses.

### 10.7 Behavior Rules

* **Blockchain toggle**

  * Enabled only when `escrow.state === "CREATED"`.
  * Disabled once P1 funds escrow until transaction completes or resets.

* **P1 Send Money flow**

  * Visible only when `escrow.state === "CREATED"`.
  * Clicking “Send Money” shows an amount input field.
  * After entering amount and submitting, calls `/escrow/fund`.
  * Upon success, UI updates showing escrow amount and enabling CONFIRM buttons.

* **Confirm buttons**

  * Display:

    * Under P1 when `state` ∈ { `FUNDED`, `P2_CONFIRMED` }
    * Under P2 when `state` ∈ { `FUNDED`, `P1_CONFIRMED` }
  * When a party confirms, their button becomes disabled/marked “CONFIRMED ✓”.
  * When both have confirmed, balances and state update to RELEASED.

* **Fund Account**

  * Accessible via "+ Fund" button in top-right
  * Opens a modal allowing selection of P1 or P2
  * Accepts any positive amount (no step restrictions)
  * Calls `POST /fund-account` with target and amount
  * Updates balances and logs the event (blockchain-backed if enabled)

* **RESET**

  * Calls `POST /reset`.
  * Resets all UI state based on backend response.
  * Clears all event logs (only SYSTEM_RESET event remains after reset)

### 10.8 Log Window

* Periodically (every 5 seconds) or on action, fetch `GET /logs`.
* Display events in reverse chronological order (newest first).
* For each event:

  * If `solanaSignature === null`:

    * Render as **EVENT**.
    * If `payload.blockchainError` exists, display the error message.
  * If `solanaSignature` is present:

    * Render as **BLOCKCHAIN EVENT**, including:

      * Action, actor, and amount information
      * Blockchain metadata (if available in `payload.blockchain`):
        * Hash
        * Tx ID
        * Signature
      * Link to Solscan:

        * `https://solscan.io/tx/<signature>?cluster=devnet`
      * If `payload.blockchainError` exists, display the error message (transaction failed)

* **Clear Logs Button**: Calls `DELETE /logs` to remove all event entries (useful for testing without full reset).

The log window should be readable and technically informative, displaying all blockchain transaction details when available.

---

## 11. Error Handling

### Backend

* Use a consistent error shape:

```json
{
  "error": "Error message",
  "details": { ... }
}
```

* Return 400 for:

  * Invalid state transitions
  * Attempting to toggle blockchain during active escrow
  * Funding more than P1's balance
  * Fund account with amount ≤ 0

* Return 500 for:

  * Unexpected internal errors
  * Solana connectivity problems (while still logging the attempt)

### Frontend

* Display errors as:

  * A visible message near controls, and/or
  * A log entry like:

    * `[ERROR] Cannot confirm escrow from state CREATED; expected FUNDED or P1/P2_CONFIRMED.`

---

## 12. Outcomes and Extensibility

This foundation system delivers:

* A real, working escrow engine.
* Real DB-backed balances and escrow.
* Real Solana devnet memo logging with full transaction metadata (hash, tx ID, signature).
* Clear, stable API via Supabase Edge Functions.
* A simple but functional single-page UI for demonstration.
* Account funding capability for testing/demo purposes.
* Event log management (view and clear).

It is designed so that future work can:

* Extend from a single escrow to multiple escrows.
* Add user creation, session/auth, and marketplace flows.
* Implement timers, disputes, and richer event types.
* Refine UI/UX for hackathon presentation.
* Leverage Supabase Realtime for live updates.
* Add Supabase Auth for user authentication.

All future features are expected to build on the patterns and contracts defined here.

---

## 13. Implementation Guide

This section provides a step-by-step guide to building the GAssure Escrow application.

### 12.1 Prerequisites

* Node.js 18+ installed
* Git installed
* A Supabase account (free tier works)
* Basic knowledge of React, TypeScript, and SQL

### 12.2 Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in project details:
   - Name: `gassure-escrow`
   - Database Password: (save this securely)
   - Region: Choose closest to you
4. Wait for project to be created (2-3 minutes)

### 12.3 Step 2: Set Up Database Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Create a new query and paste the schema from Section 5.3
3. Run the query to create tables
4. Run the seed data query from Section 5.5
5. Go to **Authentication** → **Policies** and set up RLS policies (Section 5.4)

### 12.4 Step 3: Install Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>
```

### 12.5 Step 4: Initialize Edge Functions

```bash
# Initialize Supabase in your project
supabase init

# Create Edge Functions directory structure
mkdir -p supabase/functions/get-state
mkdir -p supabase/functions/toggle-blockchain
mkdir -p supabase/functions/fund-escrow
mkdir -p supabase/functions/confirm-escrow
mkdir -p supabase/functions/reset-system
mkdir -p supabase/functions/get-logs
mkdir -p supabase/functions/clear-logs
mkdir -p supabase/functions/fund-account
mkdir -p supabase/functions/_shared
```

### 12.6 Step 5: Create Edge Functions

For each Edge Function:

1. Create `index.ts` in the function directory
2. Use the template from Section 7.2
3. Implement business logic per API contracts (Section 8)
4. Create shared utilities in `supabase/functions/_shared/`

**Example: Create `get-state` function**

```typescript
// supabase/functions/get-state/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch escrow
    const { data: escrow, error: escrowError } = await supabaseClient
      .from('escrow')
      .select('*, buyer:users!buyer_id(*), seller:users!seller_id(*)')
      .eq('id', 'ESCROW_SINGLE')
      .single()

    if (escrowError) throw escrowError

    return new Response(
      JSON.stringify({
        blockchainEnabled: escrow.blockchain_enabled,
        escrow: {
          id: escrow.id,
          state: escrow.state,
          amount: escrow.amount
        },
        buyer: {
          id: escrow.buyer.id,
          name: escrow.buyer.name,
          balancePhp: escrow.buyer.mock_balance_php
        },
        seller: {
          id: escrow.seller.id,
          name: escrow.seller.name,
          balancePhp: escrow.seller.mock_balance_php
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
```

### 12.7 Step 6: Set Edge Function Secrets

```bash
# Set Solana RPC URL
supabase secrets set SOLANA_RPC_URL=https://api.devnet.solana.com

# Set Solana private key (get from wallet)
supabase secrets set SOLANA_PRIVATE_KEY='[1,2,3,...]'  # Your keypair array
```

### 12.8 Step 7: Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Or deploy individually
supabase functions deploy get-state
supabase functions deploy toggle-blockchain
# ... etc
```

### 12.9 Step 8: Create React Frontend

```bash
# Create Vite + React + TypeScript project
npm create vite@latest gassure-frontend -- --template react-ts
cd gassure-frontend

# Install dependencies
npm install @supabase/supabase-js

# Install additional dependencies (if needed)
npm install @solana/web3.js  # Optional, for client-side verification
```

### 12.10 Step 9: Configure Environment Variables

Create `.env.local` in frontend root:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Get these values from Supabase Dashboard → Settings → API

### 12.11 Step 10: Build Frontend Components

1. Set up Supabase client (Section 9.3)
2. Create API service layer (Section 9.4)
3. Build components following structure (Section 9.2)
4. Implement UI logic per Section 9.7

### 12.12 Step 11: Test the Application

1. **Test Database:**
   - Verify seed data exists in Supabase Dashboard
   - Check tables are created correctly

2. **Test Edge Functions:**
   ```bash
   # Test locally (optional)
   supabase functions serve
   
   # Or test deployed functions via Supabase Dashboard → Edge Functions → Invoke
   ```

3. **Test Frontend:**
   ```bash
   npm run dev
   ```
   - Open browser to `http://localhost:5173`
   - Test each feature:
     - Toggle blockchain
     - Fund escrow
     - Confirm (P1 and P2)
     - Check event logs
     - Reset system

### 12.13 Step 12: Create Solana Wallet (for Blockchain)

1. Install Solana CLI or use web wallet
2. Generate a devnet wallet:
   ```bash
   solana-keygen new --outfile ~/.config/solana/devnet-keypair.json
   ```
3. Get devnet SOL (for transaction fees):
   ```bash
   solana airdrop 1 <your-public-key> --url devnet
   ```
4. Export private key as JSON array for `SOLANA_PRIVATE_KEY` secret

### 12.14 Development Workflow

1. **Local Development:**
   - Frontend: `npm run dev` (Vite dev server)
   - Edge Functions: Deploy to Supabase or use local testing
   - Database: Use Supabase cloud database

2. **Testing:**
   - Test each escrow state transition
   - Verify blockchain transactions on Solscan
   - Check event logs are created correctly

3. **Debugging:**
   - Check Supabase Dashboard → Logs for Edge Function errors
   - Use browser DevTools for frontend debugging
   - Check Solana Explorer for blockchain transaction status

### 12.15 Common Issues and Solutions

**Issue: Edge Function returns CORS error**
- Solution: Ensure CORS headers are set correctly (see Section 7.2)

**Issue: Database connection fails**
- Solution: Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set correctly

**Issue: Blockchain transaction fails**
- Solution: 
  - Check wallet has SOL for fees
  - Verify `SOLANA_RPC_URL` is correct
  - Check `SOLANA_PRIVATE_KEY` format is correct JSON array

**Issue: RLS policies block queries**
- Solution: Either use service role key in Edge Functions (bypasses RLS) or update RLS policies

### 12.16 Project Structure Summary

```
gassure-escrow/
├── supabase/
│   ├── functions/
│   │   ├── get-state/
│   │   ├── toggle-blockchain/
│   │   ├── fund-escrow/
│   │   ├── confirm-escrow/
│   │   ├── reset-system/
│   │   ├── get-logs/
│   │   ├── clear-logs/
│   │   ├── fund-account/
│   │   └── _shared/
│   │       └── blockchain.ts
│   └── config.toml
├── src/                    # React frontend
│   ├── components/
│   ├── services/
│   ├── hooks/
│   ├── types/
│   ├── App.tsx
│   └── main.tsx
├── .env.local              # Frontend env vars
└── package.json
```

### 12.17 Next Steps

After completing the foundation:

1. Add error handling and loading states
2. Improve UI/UX with better styling
3. Add real-time updates using Supabase Realtime
4. Implement authentication (Supabase Auth)
5. Add input validation and error messages
6. Create unit tests for Edge Functions
7. Add E2E tests for critical flows

---

**End of PRD**
