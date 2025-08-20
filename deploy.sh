#!/bin/bash

# USDX Vault App Deployment Script

echo "🚀 Starting USDX Vault App deployment..."

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo "❌ dfx is not installed. Please install the DFINITY SDK first."
    exit 1
fi

# Start dfx if not running
echo "📡 Starting dfx..."
dfx start --background --clean

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd src/vault_app0_frontend
npm install
cd ../..

# Deploy the backend canister
echo "🏗️  Deploying backend canister..."
dfx deploy vault_app0_backend

# Generate declarations
echo "🔧 Generating declarations..."
dfx generate vault_app0_backend

# Deploy the frontend canister
echo "🌐 Deploying frontend canister..."
dfx deploy vault_app0_frontend

# Get canister URLs
echo "✅ Deployment complete!"
echo ""
echo "📋 Canister Information:"
echo "Backend Canister ID: $(dfx canister id vault_app0_backend)"
echo "Frontend Canister ID: $(dfx canister id vault_app0_frontend)"
echo ""
echo "🌐 Access your application at:"
echo "Local: http://localhost:4943?canisterId=$(dfx canister id vault_app0_frontend)"
echo ""
echo "🔧 Admin Principal (update in main.mo): $(dfx identity get-principal)"
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
echo "🎉 Your USDX Vault App is ready!"
