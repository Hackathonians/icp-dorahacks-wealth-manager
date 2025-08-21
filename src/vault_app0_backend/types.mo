import Principal "mo:base/Principal";

module {
  // ICRC-1 Types
  public type Account = {
    owner : Principal;
    subaccount : ?[Nat8];
  };

  public type Tokens = Nat;

  public type Timestamp = Nat64;

  public type TxIndex = Nat;

  public type TransferArgs = {
    from_subaccount : ?[Nat8];
    to : Account;
    amount : Tokens;
    fee : ?Tokens;
    memo : ?[Nat8];
    created_at_time : ?Timestamp;
  };

  public type TransferError = {
    #BadFee : { expected_fee : Tokens };
    #BadBurn : { min_burn_amount : Tokens };
    #InsufficientFunds : { balance : Tokens };
    #TooOld;
    #CreatedInFuture : { ledger_time : Timestamp };
    #Duplicate : { duplicate_of : TxIndex };
    #TemporarilyUnavailable;
    #GenericError : { error_code : Nat; message : Text };
  };

  public type TransferResult = {
    #Ok : TxIndex;
    #Err : TransferError;
  };

  // ICRC-2 Types
  public type ApproveArgs = {
    from_subaccount : ?[Nat8];
    spender : Account;
    amount : Tokens;
    expected_allowance : ?Tokens;
    expires_at : ?Timestamp;
    fee : ?Tokens;
    memo : ?[Nat8];
    created_at_time : ?Timestamp;
  };

  public type ApproveError = {
    #BadFee : { expected_fee : Tokens };
    #InsufficientFunds : { balance : Tokens };
    #AllowanceChanged : { current_allowance : Tokens };
    #Expired : { ledger_time : Timestamp };
    #TooOld;
    #CreatedInFuture : { ledger_time : Timestamp };
    #Duplicate : { duplicate_of : TxIndex };
    #TemporarilyUnavailable;
    #GenericError : { error_code : Nat; message : Text };
  };

  public type ApproveResult = {
    #Ok : TxIndex;
    #Err : ApproveError;
  };

  public type TransferFromArgs = {
    spender_subaccount : ?[Nat8];
    from : Account;
    to : Account;
    amount : Tokens;
    fee : ?Tokens;
    memo : ?[Nat8];
    created_at_time : ?Timestamp;
  };

  public type TransferFromError = {
    #BadFee : { expected_fee : Tokens };
    #BadBurn : { min_burn_amount : Tokens };
    #InsufficientFunds : { balance : Tokens };
    #InsufficientAllowance : { allowance : Tokens };
    #TooOld;
    #CreatedInFuture : { ledger_time : Timestamp };
    #Duplicate : { duplicate_of : TxIndex };
    #TemporarilyUnavailable;
    #GenericError : { error_code : Nat; message : Text };
  };

  public type TransferFromResult = {
    #Ok : TxIndex;
    #Err : TransferFromError;
  };

  public type Allowance = {
    allowance : Tokens;
    expires_at : ?Timestamp;
  };

  public type AllowanceArgs = {
    account : Account;
    spender : Account;
  };

  // Vault Types
  public type VaultEntry = {
    id : Nat; // Unique ID for each staking entry
    owner : Principal;
    amount : Tokens;
    locked_at : Timestamp;
    unlock_time : ?Timestamp; // null means flexible staking (can withdraw anytime)
    is_flexible : Bool; // true for flexible staking, false for time-locked
  };

  public type DividendDistribution = {
    total_amount : Tokens;
    per_token_amount : Float;
    distributed_at : Timestamp;
    distribution_id : Nat;
    total_locked_at_distribution : Tokens;
  };

  // Admin Types
  public type AdminAction = {
    #TransferTokens : { to : Principal; amount : Tokens };
    #DistributeDividend : { amount : Tokens };
    #SetVaultLockPeriod : { period_seconds : Nat64 };
  };
};
