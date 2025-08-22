#!/bin/bash

# USDX Vault App Deployment Script

echo "🚀 Starting USDX Vault App deployment..."

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo "❌ dfx is not installed. Please install the DFINITY SDK first."
    exit 1
fi

# Setup identity and get principal
echo "🔑 Setting up identity..."
PRINCIPAL=$(dfx identity get-principal)
echo "📋 Current identity principal: $PRINCIPAL"

# Start dfx if not running
echo "📡 Starting dfx..."
dfx start --background --clean

# Wait for dfx to fully start
echo "⏳ Waiting for dfx to initialize..."
sleep 5

# Check if dfx is running properly
if ! dfx ping; then
    echo "❌ dfx failed to start properly. Exiting..."
    exit 1
fi

echo "✅ dfx is running successfully"

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd src/vault_app0_frontend
npm install
cd ../..

# Deploy identity canister first
echo "🆔 Deploying identity canister..."
if dfx deploy internet_identity; then
    echo "✅ Identity canister deployed successfully"
else
    echo "❌ Identity canister deployment failed. Check the error messages above."
    exit 1
fi

# Deploy backend canister with admin principal argument
echo "🏗️  Deploying backend canister with admin principal..."
if dfx deploy vault_app0_backend --argument "(opt principal \"$PRINCIPAL\")" --mode reinstall --yes; then
    echo "✅ Backend canister deployed successfully with admin: $PRINCIPAL"
else
    echo "❌ Backend deployment failed. Check the error messages above."
    exit 1
fi

# Deploy frontend canister
echo "🏗️  Deploying frontend canister..."
if dfx deploy vault_app0_frontend; then
    echo "✅ Frontend canister deployed successfully"
else
    echo "❌ Frontend deployment failed. Check the error messages above."
    exit 1
fi

# Generate declarations for all canisters
echo "🔧 Generating declarations..."
if dfx generate; then
    echo "✅ Declarations generated successfully"
else
    echo "⚠️  Declaration generation failed, but canisters are deployed"
fi

# Check canister status
echo "🔍 Checking canister status..."
echo ""
echo "📊 Identity Canister Status:"
dfx canister status internet_identity
echo ""
echo "📊 Backend Canister Status:"
dfx canister status vault_app0_backend
echo ""
echo "📊 Frontend Canister Status:"
dfx canister status vault_app0_frontend
echo ""

# Get canister URLs
echo "✅ Deployment complete!"
echo ""
echo "📋 Canister Information:"
echo "Identity Canister ID: $(dfx canister id internet_identity)"
echo "Backend Canister ID: $(dfx canister id vault_app0_backend)"
echo "Frontend Canister ID: $(dfx canister id vault_app0_frontend)"
echo ""
echo "🌐 Access your application at:"
echo "Local: http://localhost:4943?canisterId=$(dfx canister id vault_app0_frontend)"
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
echo "🎉 Your USDX Vault App is ready!"
