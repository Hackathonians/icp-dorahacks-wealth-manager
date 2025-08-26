#!/bin/bash

# USDX Vault App Mainnet Deployment Script

echo "🚀 Starting USDX Vault App mainnet deployment..."

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo "❌ dfx is not installed. Please install the DFINITY SDK first."
    exit 1
fi

# Check if user is authenticated with mainnet
if ! dfx identity whoami &> /dev/null; then
    echo "❌ Please authenticate with dfx first: dfx identity new <identity-name>"
    exit 1
fi

# Setup identity and get principal
echo "🔑 Setting up identity..."
PRINCIPAL=$(dfx identity get-principal)
echo "📋 Current identity principal: $PRINCIPAL"

# Set network to mainnet
echo "🌐 Setting network to mainnet..."
dfx config set networks.ic.url https://ic0.app

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd src/vault_app0_frontend
npm install
cd ../..

# Build frontend for production
echo "🏗️  Building frontend for production..."
cd src/vault_app0_frontend
npm run build
cd ../..

# Deploy backend canister to mainnet
echo "🏗️  Deploying backend canister to mainnet..."
if dfx deploy vault_app0_backend --network ic --argument "(opt principal \"$PRINCIPAL\")" --mode reinstall --yes; then
    echo "✅ Backend canister deployed successfully to mainnet with admin: $PRINCIPAL"
else
    echo "❌ Backend deployment failed. Check the error messages above."
    exit 1
fi

# Deploy frontend canister to mainnet
echo "🏗️  Deploying frontend canister to mainnet..."
if dfx deploy vault_app0_frontend --network ic; then
    echo "✅ Frontend canister deployed successfully to mainnet"
else
    echo "❌ Frontend deployment failed. Check the error messages above."
    exit 1
fi

# Generate declarations for all canisters
echo "🔧 Generating declarations..."
if dfx generate --network ic; then
    echo "✅ Declarations generated successfully"
else
    echo "⚠️  Declaration generation failed, but canisters are deployed"
fi

# Check canister status
echo "🔍 Checking canister status..."
echo ""
echo "📊 Backend Canister Status:"
dfx canister status vault_app0_backend --network ic
echo ""
echo "📊 Frontend Canister Status:"
dfx canister status vault_app0_frontend --network ic
echo ""

# Get canister URLs
echo "✅ Mainnet deployment complete!"
echo ""
echo "📋 Canister Information:"
echo "Backend Canister ID: $(dfx canister id vault_app0_backend --network ic)"
echo "Frontend Canister ID: $(dfx canister id vault_app0_frontend --network ic)"
echo ""
echo "🌐 Access your application at:"
echo "Mainnet: https://$(dfx canister id vault_app0_frontend --network ic).ic0.app"
echo ""
echo "🔧 Admin Principal (automatically set): $PRINCIPAL"
echo ""
echo "📚 Available functions:"
echo "- icrc1_name, icrc1_symbol, icrc1_decimals, icrc1_fee"
echo "- icrc1_balance_of, icrc1_transfer"
echo "- admin_transfer_tokens (admin only)"
echo "- vault_lock_tokens, vault_unlock_tokens"
echo "- admin_distribute_dividend (admin only)"
echo "- claim_dividend"
echo "- get_vault_info, get_user_vault_info"
echo ""
echo "🎉 Your USDX Vault App is live on mainnet!"
