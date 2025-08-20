#!/bin/bash

# USDX Vault App Test Script

echo "🧪 Testing USDX Vault App..."

# Get canister ID
BACKEND_ID=$(dfx canister id vault_app0_backend)
echo "Backend Canister ID: $BACKEND_ID"

# Test basic token functions
echo ""
echo "📋 Testing Token Functions:"

echo "Token Name:"
dfx canister call vault_app0_backend icrc1_name

echo "Token Symbol:"
dfx canister call vault_app0_backend icrc1_symbol

echo "Token Decimals:"
dfx canister call vault_app0_backend icrc1_decimals

echo "Total Supply:"
dfx canister call vault_app0_backend icrc1_total_supply

echo "Token Fee:"
dfx canister call vault_app0_backend icrc1_fee

# Test vault info
echo ""
echo "🏦 Testing Vault Functions:"

echo "Vault Info:"
dfx canister call vault_app0_backend get_vault_info

echo "Dividend History:"
dfx canister call vault_app0_backend get_dividend_history

# Test with current identity
PRINCIPAL=$(dfx identity get-principal)
echo ""
echo "👤 Testing with Principal: $PRINCIPAL"

echo "Balance:"
dfx canister call vault_app0_backend icrc1_balance_of "(record { owner = principal \"$PRINCIPAL\"; subaccount = null })"

echo "User Vault Info:"
dfx canister call vault_app0_backend get_user_vault_info "(principal \"$PRINCIPAL\")"

echo "Unclaimed Dividends:"
dfx canister call vault_app0_backend get_unclaimed_dividends "(principal \"$PRINCIPAL\")"

echo ""
echo "✅ Basic tests completed!"
echo ""
echo "🌐 Access your app at:"
echo "http://localhost:4943?canisterId=$(dfx canister id vault_app0_frontend)"
