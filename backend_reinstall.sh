dfx canister stop vault_app0_backend
dfx build --network local
dfx canister install vault_app0_backend --network local --mode=reinstall
dfx canister start vault_app0_backend --network local
dfx build --network local
dfx deploy --network local