# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## GAssure Escrow + Blockchain – Foundation System (One-Escrow Prototype)

---

## 1. Overview

This document defines the **foundation system** for the GAssure escrow engine and blockchain logging. It is intended to be:

* A **real**, DB-backed, blockchain-backed implementation.
* The **base** for the full hackathon system.
* A minimal but complete version supporting **one fixed escrow** between a buyer (P1) and a seller (P2).

The system includes:

* A **Node.js backend** (Express + TypeScript) with a Postgres database (via Prisma).
* A **React frontend** (Vite + TypeScript) providing a single-page UI.
* **Solana devnet** integration using the Memo program via `@solana/web3.js`.

No mocks or placeholders are allowed in logic related to:

* Balances
* Escrow state transitions
* Blockchain logging

---

## 2. High-Level Architecture

### 2.1 Components

* **Frontend**

  * React + TypeScript + Vite
  * Single-page application implementing the escrow flow and event log visualization

* **Backend**

  * Node.js + Express + TypeScript
  * Implements ledger, escrow state machine, blockchain toggling, and logging

* **Database**

  * Postgres using Prisma ORM
  * Stores users, escrow, and event logs

* **Blockchain**

  * Solana Devnet
  * `@solana/web3.js` with Memo Program
  * Used for audit logging when blockchain mode is ON

### 2.2 Data Flow

1. Frontend sends REST API requests to the backend.
2. Backend validates input, modifies DB state (balances, escrow state), and records events.
3. If blockchain is enabled, backend writes memo transactions to Solana devnet and stores signatures.
4. Backend returns updated state; frontend renders balances, buttons, and log entries.

---

## 3. Backend Specification

### 3.1 Tech Stack

* Node.js (v18+)
* Express
* TypeScript
* Prisma (Postgres)
* `@solana/web3.js`
* `zod` for schema validation
* `pino` for logging
* `dotenv` for configuration

No mock implementations for core behavior.

### 3.2 Environment Configuration

The backend must read and validate the following environment variables:

* `PORT` – HTTP port (e.g., 4000)
* `DATABASE_URL` – Postgres connection string
* `SOLANA_RPC_URL` – `https://api.devnet.solana.com`
* `SOLANA_PRIVATE_KEY` – JSON array of secret key bytes (for a devnet wallet)
* `NODE_ENV` – `development` / `production`

Configuration is validated via `zod` to fail fast if misconfigured.

### 3.3 Database Schema

Using Prisma, define:

```prisma
model User {
  id             String   @id @default(uuid())
  name           String
  gcashHandle    String   @unique
  mockBalancePhp Int      @default(0)
  createdAt      DateTime @default(now())
}

model Escrow {
  id                String        @id @default("ESCROW_SINGLE")
  buyerId           String
  sellerId          String
  buyer             User          @relation("Buyer", fields: [buyerId], references: [id])
  seller            User          @relation("Seller", fields: [sellerId], references: [id])
  amount            Int           @default(0)
  state             EscrowState   @default(CREATED)
  blockchainEnabled Boolean       @default(false)
  createdAt         DateTime      @default(now())
  events            EscrowEvent[]
}

enum EscrowState {
  CREATED
  FUNDED
  P1_CONFIRMED
  P2_CONFIRMED
  RELEASED
}

model EscrowEvent {
  id              String   @id @default(uuid())
  escrowId        String
  escrow          Escrow   @relation(fields: [escrowId], references: [id])
  action          String
  actor           String?
  payload         Json?
  timestamp       DateTime @default(now())
  solanaSignature String?
}
```

A single escrow row is used (`id = "ESCROW_SINGLE"`).

### 3.4 Seed Data

On initial setup, the system must seed:

* User P1 (Buyer)

  * `name`: e.g., “Buyer Demo”
  * `mockBalancePhp`: 200000

* User P2 (Seller)

  * `name`: e.g., “Seller Demo”
  * `mockBalancePhp`: 0

* Escrow:

  * `id`: `"ESCROW_SINGLE"`
  * `buyerId`: P1.id
  * `sellerId`: P2.id
  * `state`: `CREATED`
  * `amount`: `0`
  * `blockchainEnabled`: `false`

Escrow balances are represented via:

* P1 and P2 `mockBalancePhp`
* `Escrow.amount` as the locked funds

---

## 4. Escrow Ledger and State Machine

### 4.1 Money Model

* `P1.mockBalancePhp` – buyer’s wallet
* `P2.mockBalancePhp` – seller’s wallet
* `Escrow.amount` – amount currently locked

### 4.2 FUND

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

### 4.3 CONFIRM

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

### 4.4 RELEASE

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

### 4.5 RESET

Global reset of the system.

* Operations:

  * `P1.mockBalancePhp = 200000`
  * `P2.mockBalancePhp = 0`
  * `Escrow.amount = 0`
  * `Escrow.state = CREATED`
  * `Escrow.blockchainEnabled = false`
* Event:

  * `EscrowEvent` with `action = "SYSTEM_RESET"`
* Blockchain:

  * If previously enabled, this action is also logged via memo.

All state-modifying operations must be wrapped in database transactions to ensure consistency.

---

## 5. Blockchain Integration (Solana Devnet)

### 5.1 When Blockchain Is Used

If `Escrow.blockchainEnabled === true`, the following actions must trigger memo transactions on Solana devnet:

* FUND
* P1_CONFIRM
* P2_CONFIRM
* RELEASE
* RESET

### 5.2 Memo Payload

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

### 5.3 Memo Transaction

The backend `BlockchainService.logEventOnChain(payload)` must:

* Use `@solana/web3.js`
* Initialize a connection with `SOLANA_RPC_URL`
* Load keypair from `SOLANA_PRIVATE_KEY`
* Build a transaction including a Memo instruction with the payload
* Send and confirm the transaction
* Return the generated `signature` string

### 5.4 Event and Signature Storage

For each blockchain-enabled action:

1. Create an `EscrowEvent` with `action`, `actor`, and `payload`.
2. Execute the memo transaction.
3. Update the `EscrowEvent.solanaSignature` with the returned `signature`.

If blockchain is disabled, the event is created with `solanaSignature = null`.

If Solana calls fail, the system should:

* Still store the event with `solanaSignature = null` and the error message in `payload`.
* Return a successful response so UI remains usable, while the log window highlights the blockchain error.

---

## 6. Backend API Contracts

Base path: `/api`.
All responses are JSON.
Error responses follow:

```json
{
  "error": "Message",
  "details": { ...optional contextual info... }
}
```

### 6.1 GET /state

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

### 6.2 POST /blockchain/toggle

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

### 6.3 POST /escrow/fund

Body:

```json
{
  "amount": 40000
}
```

Behavior:

* Executes FUND operation per Section 4.2.
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

### 6.4 POST /escrow/confirm

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

* Executes CONFIRM logic per Section 4.3 and possibly RELEASE per Section 4.4.
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

### 6.5 POST /reset

No body.

Resets the full system per Section 4.5 and returns:

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

### 6.6 GET /logs

Returns a chronological list of events:

```json
{
  "events": [
    {
      "id": "uuid-event",
      "timestamp": "2025-..",
      "action": "ESCROW_FUNDED",
      "actor": "P1",
      "payload": { "amount": 40000 },
      "solanaSignature": "3x28f9F...aB19c"
    }
  ]
}
```

The frontend uses this to render the “event log window.”

---

## 7. Frontend Specification (Single-Page UI)

### 7.1 Layout

The UI is a single page with:

* Top-right: Blockchain toggle
* Center row: three avatar circles for:

  * P1 (Buyer) with balance and “Send Money” flow
  * Escrow Account with locked amount
  * P2 (Seller) with balance and “Confirm” button
* Bottom: Log window and RESET button

### 7.2 State Source

The frontend must not simulate business logic. It must:

* Fetch state via `GET /state`
* Fetch logs via `GET /logs`
* Trigger actions via:

  * `POST /blockchain/toggle`
  * `POST /escrow/fund`
  * `POST /escrow/confirm`
  * `POST /reset`

Any UI changes depend on backend responses.

### 7.3 Behavior Rules

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

* **RESET**

  * Calls `/reset`.
  * Resets all UI state based on backend response.

### 7.4 Log Window

* Periodically or on action, fetch `/logs`.
* For each event:

  * If `solanaSignature === null`:

    * Render as **EVENT**.
  * If `solanaSignature` is present:

    * Render as **BLOCKCHAIN EVENT**, including:

      * Signature
      * Link to Solscan:

        * `https://solscan.io/tx/<signature>?cluster=devnet`

The log window should be readable and technically informative.

---

## 8. Error Handling

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
  * Funding more than P1’s balance

* Return 500 for:

  * Unexpected internal errors
  * Solana connectivity problems (while still logging the attempt)

### Frontend

* Display errors as:

  * A visible message near controls, and/or
  * A log entry like:

    * `[ERROR] Cannot confirm escrow from state CREATED; expected FUNDED or P1/P2_CONFIRMED.`

---

## 9. Outcomes and Extensibility

This foundation system delivers:

* A real, working escrow engine.
* Real DB-backed balances and escrow.
* Real Solana devnet memo logging with signatures.
* Clear, stable REST APIs.
* A simple but functional single-page UI for demonstration.

It is designed so that future work can:

* Extend from a single escrow to multiple escrows.
* Add user creation, session/auth, and marketplace flows.
* Implement timers, disputes, and richer event types.
* Refine UI/UX for hackathon presentation.

All future features are expected to build on the patterns and contracts defined here.
