# USDX Vault App

A decentralized token vault and dividend distribution system built on the Internet Computer Protocol (ICP) using Motoko and React.

## Features

### 🪙 USDX Token (ICRC-1/2 Compliant)

- **Mock USDC Token**: USDX token with 6 decimals
- **ICRC-1 Standard**: Full compliance with balance queries, transfers, and metadata
- **ICRC-2 Standard**: Approve and transfer-from functionality for advanced token operations
- **Admin Controls**: Token distribution and management capabilities

### 🏦 Vault System

- **Token Locking**: Users can lock USDX tokens for a specified period (24 hours default)
- **Time-based Unlocking**: Automatic unlock after lock period expires
- **Dividend Eligibility**: Only locked tokens are eligible for dividend distributions

### 💰 Dividend Distribution

- **Admin Distribution**: Admins can distribute dividends to all vault participants
- **Proportional Rewards**: Dividends distributed proportionally based on locked token amounts
- **Claim System**: Users can claim their earned dividends
- **Historical Tracking**: Complete history of all dividend distributions

### 🔐 Authentication & Security

- **Internet Identity**: Secure authentication using ICP's Internet Identity
- **Admin Controls**: Role-based access for token distribution and dividend management
- **Principal-based Security**: All operations tied to user principals

### 🎨 Modern UI

- **React + Tailwind**: Beautiful, responsive user interface
- **Real-time Updates**: Live balance and vault status updates
- **Admin Dashboard**: Comprehensive admin panel for system management
- **Mobile Friendly**: Responsive design for all devices

## Architecture

### Backend (Motoko)

```
src/vault_app0_backend/
├── main.mo          # Main canister with integrated functionality
└── types.mo         # Type definitions for ICRC standards and vault
```

### Frontend (React)

```
src/vault_app0_frontend/
├── src/
│   ├── App.jsx                    # Main application component
│   ├── contexts/AuthContext.jsx   # Authentication context
│   └── components/
│       ├── Header.jsx             # Navigation and auth status
│       ├── Dashboard.jsx          # Main dashboard
│       ├── TokenBalance.jsx       # Token balance display
│       ├── VaultSection.jsx       # Vault operations
│       ├── DividendSection.jsx    # Dividend management
│       └── AdminPanel.jsx         # Admin controls
└── public/
```

## Getting Started

### Prerequisites

- [DFX SDK](https://internetcomputer.org/docs/current/developer-docs/setup/install/) (latest version)
- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/) (v7 or higher)

### Installation & Deployment

1. **Clone and navigate to the project:**

   ```bash
   cd vault_app0
   ```

2. **Install dependencies:**

   ```bash
   cd src/vault_app0_frontend
   npm install
   cd ../..
   ```

3. **Start DFX:**

   ```bash
   dfx start --background --clean
   ```

4. **Deploy the application:**

   ```bash
   ./deploy.sh
   ```

   Or manually:

   ```bash
   dfx deploy vault_app0_backend
   dfx generate vault_app0_backend
   dfx deploy vault_app0_frontend
   ```

5. **Access the application:**
   - Local: `http://localhost:4943?canisterId=<frontend_canister_id>`
   - Get canister ID: `dfx canister id vault_app0_frontend`

### Configuration

Update the admin principal in `src/vault_app0_backend/main.mo`:

```motoko
private let admin : Principal = Principal.fromText("YOUR_PRINCIPAL_HERE");
```

Get your principal:

```bash
dfx identity get-principal
```

## Usage

### For Users

1. **Connect Wallet**: Click "Connect Wallet" and authenticate with Internet Identity
2. **View Balance**: See your USDX token balance in the dashboard
3. **Lock Tokens**: Enter amount and lock tokens in the vault to earn dividends
4. **Claim Dividends**: Claim any available dividend distributions
5. **Unlock Tokens**: Unlock your tokens after the lock period expires

### For Admins

1. **Transfer Tokens**: Distribute USDX tokens to users
2. **Distribute Dividends**: Create dividend distributions for vault participants
3. **Monitor System**: View total locked tokens and system statistics

## API Reference

### ICRC-1 Functions

- `icrc1_name()` - Get token name
- `icrc1_symbol()` - Get token symbol
- `icrc1_decimals()` - Get token decimals
- `icrc1_total_supply()` - Get total token supply
- `icrc1_balance_of(account)` - Get account balance
- `icrc1_transfer(args)` - Transfer tokens

### ICRC-2 Functions

- `icrc2_approve(args)` - Approve spending allowance
- `icrc2_allowance(args)` - Check allowance
- `icrc2_transfer_from(args)` - Transfer from approved account

### Vault Functions

- `vault_lock_tokens(amount)` - Lock tokens in vault
- `vault_unlock_tokens()` - Unlock tokens from vault
- `get_user_vault_info(user)` - Get user's vault status

### Admin Functions

- `admin_transfer_tokens(to, amount)` - Transfer tokens to user
- `admin_distribute_dividend(amount)` - Distribute dividends
- `get_vault_info()` - Get vault statistics

### Dividend Functions

- `claim_dividend(distribution_id)` - Claim specific dividend
- `get_unclaimed_dividends(user)` - Get user's unclaimed dividends
- `get_dividend_history()` - Get all dividend distributions

## Technical Details

### Token Economics

- **Name**: USDX Mock Token
- **Symbol**: USDX
- **Decimals**: 6
- **Total Supply**: 1,000,000 USDX
- **Transfer Fee**: 0.01 USDX

### Vault Mechanics

- **Lock Period**: 24 hours (configurable by admin)
- **Minimum Lock**: No minimum (set by frontend)
- **Dividend Calculation**: Proportional to locked amount
- **Eligibility**: Must be locked before dividend distribution

### Security Features

- **Principal-based Authentication**: All operations tied to ICP principals
- **Admin Role Verification**: Admin functions protected by principal checks
- **Time-based Locks**: Cryptographically enforced lock periods
- **Immutable History**: All transactions and dividends permanently recorded

## Development

### Local Development

```bash
# Start local replica
dfx start --background

# Deploy for development
dfx deploy

# View logs
dfx canister logs vault_app0_backend
```

### Frontend Development

```bash
cd src/vault_app0_frontend
npm start
```

### Testing

```bash
# Test backend functions
dfx canister call vault_app0_backend icrc1_name

# Test with specific principal
dfx canister call vault_app0_backend icrc1_balance_of '(record { owner = principal "YOUR_PRINCIPAL"; subaccount = null })'
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions and support:

- Create an issue in the repository
- Check the [Internet Computer documentation](https://internetcomputer.org/docs/)
- Visit the [DFINITY Developer Forum](https://forum.dfinity.org/)

## Acknowledgments

- Built on the Internet Computer Protocol
- Uses ICRC-1 and ICRC-2 token standards
- Inspired by DeFi vault and staking mechanisms
- UI components built with React and Tailwind CSS
