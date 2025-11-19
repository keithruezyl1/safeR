# Setup Guide - GAssure Escrow Foundation System

This guide will walk you through setting up the GAssure Escrow Foundation System, including the backend, frontend, database, and Solana devnet wallet configuration.

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **PostgreSQL** database (local or cloud-hosted)
- **Git** - [Download](https://git-scm.com/)
- **Solana CLI** (for wallet management) - [Installation Guide](#installing-solana-cli)

---

## 1. Clone the Repository

```bash
git clone https://github.com/keithruezyl1/safeR.git
cd safeR
```

---

## 2. Backend Setup

### 2.1 Install Dependencies

```bash
cd gassure-escrow-backend
npm install
```

### 2.2 Environment Variables

Create a `.env` file in the `gassure-escrow-backend` directory:

```env
NODE_ENV=development
PORT=4000

# PostgreSQL connection string
DATABASE_URL=postgresql://username:password@host:port/database_name

# Solana Devnet Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY="[your-secret-key-array-here]"

# Frontend origin (for CORS)
FRONTEND_ORIGIN=http://localhost:5173
```

**Important:** Replace the placeholder values with your actual database credentials and Solana keypair.

### 2.3 Database Setup

Run Prisma migrations to set up the database schema:

```bash
npx prisma migrate deploy
```

Generate the Prisma client:

```bash
npx prisma generate
```

### 2.4 Start the Backend

```bash
npm run dev
```

The backend will:
- Connect to PostgreSQL
- Seed initial data (P1 buyer, P2 seller, single escrow)
- Start listening on port 4000

---

## 3. Frontend Setup

### 3.1 Install Dependencies

Open a new terminal window and navigate to the project root:

```bash
cd gassure-escrow
npm install
```

### 3.2 Start the Frontend

```bash
npm run dev
```

The frontend will start on `http://localhost:5173` and automatically proxy API requests to the backend.

---

## 4. Solana Wallet Setup & Funding

The system uses Solana devnet for blockchain logging. You need to create a wallet and fund it with devnet SOL.

### 4.1 Installing Solana CLI

#### Windows (PowerShell)

1. Open PowerShell as Administrator
2. Download the installer:
   ```powershell
   Invoke-WebRequest https://release.solana.com/v1.18.21/solana-install-init-x86_64-pc-windows-msvc.exe -OutFile solana-install.exe
   ```
3. Run the installer:
   ```powershell
   .\solana-install.exe v1.18.21
   ```
4. Close and reopen PowerShell to refresh PATH
5. Verify installation:
   ```bash
   solana --version
   ```

#### macOS/Linux

```bash
sh -c "$(curl -sSfL https://release.solana.com/v1.18.21/install)"
```

After installation, restart your terminal and verify:

```bash
solana --version
```

### 4.2 Generate a Keypair

Create a new Solana keypair for the escrow system:

```bash
solana-keygen new --outfile ~/.config/solana/gassure-devnet.json
```

**Important:** Save the seed phrase shown in a secure location. You'll need it to recover the wallet.

### 4.3 Get Your Public Key

```bash
solana-keygen pubkey ~/.config/solana/gassure-devnet.json
```

Copy the public key (it will look like: `CUHq8zPuRdywrabibsD2fFU2DFv1nYSacCMnba1CnXyE`)

### 4.4 Configure Solana CLI for Devnet

```bash
solana config set --url https://api.devnet.solana.com
solana config set --keypair ~/.config/solana/gassure-devnet.json
```

Verify configuration:

```bash
solana config get
```

### 4.5 Fund Your Devnet Wallet

Request devnet SOL from the faucet:

```bash
solana airdrop 2 <your-public-key> --url https://api.devnet.solana.com
```

**Note:** Replace `<your-public-key>` with the public key from step 4.3.

If you encounter rate limiting errors:
- Wait 1-2 minutes and try again
- Try requesting a smaller amount: `solana airdrop 1 <pubkey>`
- Use the web faucet: https://faucet.solana.com/ (login with GitHub)

### 4.6 Verify Balance

```bash
solana balance
```

You should see a balance like `2 SOL` or `1 SOL`.

### 4.7 Extract Secret Key for Backend

You need to add the secret key array to your backend `.env` file:

**Windows (PowerShell):**
```powershell
Get-Content $env:USERPROFILE\.config\solana\gassure-devnet.json
```

**macOS/Linux:**
```bash
cat ~/.config/solana/gassure-devnet.json
```

The output will be a JSON object. Copy the `secret_key` array (the array of numbers), and paste it into your `.env` file:

```env
SOLANA_PRIVATE_KEY="[94,182,41,232,222,6,132,121,...]"
```

**Important:** Keep this file secure. Never commit it to version control.

### 4.8 Restart Backend

After adding `SOLANA_PRIVATE_KEY` to your `.env`, restart the backend:

```bash
# Stop the current backend (Ctrl+C)
npm run dev
```

You should see: `Solana signer initialized` in the logs.

---

## 5. Testing the Setup

1. **Open the frontend:** Navigate to `http://localhost:5173`
2. **Verify blockchain mode:** The toggle should be available (enabled when escrow state is `CREATED`)
3. **Fund an account:** Click "+ Fund" to add test funds to P1 or P2
4. **Test escrow flow:**
   - Fund escrow from P1
   - Confirm from both P1 and P2
   - Verify funds are released to P2
5. **Check blockchain logs:** In the event log, blockchain events should show hash, tx ID, and signature (if transactions confirm successfully)

---

## 6. Troubleshooting

### Backend won't start

- **Database connection error:** Verify `DATABASE_URL` is correct and PostgreSQL is running
- **Prisma migration errors:** Run `npx prisma migrate deploy` again
- **Transaction timeout:** If you see `P2028` errors, the database may be slow. The seed process will retry on next startup.

### Solana transactions failing

- **"Block height exceeded":** The blockhash expired. Restart the backend to get a fresh blockhash, then retry the action immediately.
- **"Insufficient funds":** Your devnet wallet needs SOL. Run `solana airdrop 2 <pubkey>` again.
- **Rate limiting:** Wait a few minutes between airdrop requests, or use the web faucet.

### Frontend can't connect to backend

- Verify backend is running on port 4000
- Check `FRONTEND_ORIGIN` in backend `.env` matches your frontend URL
- Ensure Vite proxy is configured correctly in `vite.config.ts`

### Blockchain logs not showing hash/tx/signature

- This happens when Solana transactions don't confirm in time
- Ensure your devnet wallet has SOL (run `solana balance`)
- Restart backend and try actions immediately after startup
- Check backend logs for Solana errors

---

## 7. Environment Variables Reference

### Backend (`.env` in `gassure-escrow-backend/`)

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Backend server port | `4000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `SOLANA_RPC_URL` | Solana RPC endpoint | `https://api.devnet.solana.com` |
| `SOLANA_PRIVATE_KEY` | Secret key array (JSON format) | `"[94,182,41,...]"` |
| `FRONTEND_ORIGIN` | Frontend URL for CORS | `http://localhost:5173` |

### Frontend

No environment variables required. The frontend uses Vite's proxy to connect to the backend.

---

## 8. Next Steps

- Read the [Product Requirements Document](./prd.md) for detailed system specifications
- Explore the API endpoints via the frontend UI
- Test the full escrow flow with blockchain logging enabled
- Review the event logs to see blockchain transaction details

---

## Support

If you encounter issues not covered in this guide:

1. Check the backend logs for error messages
2. Verify all environment variables are set correctly
3. Ensure all dependencies are installed (`npm install` in both directories)
4. Confirm database migrations have run successfully
5. Verify Solana CLI is installed and wallet is funded

For more information, see the [PRD](./prd.md).

