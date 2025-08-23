import Principal "mo:base/Principal";

module {
  // HTTP Request Types
  public type HttpRequest = {
    method : Text;
    url : Text;
    headers : [(Text, Text)];
    body : [Nat8];
    certificate_version : ?Nat16;
  };

  public type HttpResponse = {
    status_code : Nat16;
    headers : [(Text, Text)];
    body : [Nat8];
    streaming_strategy : ?StreamingStrategy;
    upgrade : ?Bool;
  };

  public type StreamingStrategy = {
    #Callback : {
      callback : StreamingCallback;
      token : StreamingToken;
    };
  };

  public type StreamingCallback = query (StreamingToken) -> async (?StreamingCallbackHttpResponse);

  public type StreamingToken = {
    key : Text;
    content_encoding : Text;
    index : Nat;
    sha256 : ?[Nat8];
  };

  public type StreamingCallbackHttpResponse = {
    body : [Nat8];
    token : ?StreamingToken;
  };

  // Bitcoin API Types (for mocking Bitcoin functionality)
  public type BitcoinAddress = Text;
  
  public type BitcoinBalance = {
    confirmed : Nat64;
    unconfirmed : Nat64;
  };

  public type UTXO = {
    txid : Text;
    vout : Nat32;
    value : Nat64;
    scriptPubKey : Text;
  };

  public type FeePercentiles = [Nat64];

  public type SendResult = {
    txid : Text;
    status : Text;
  };
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

  // Product Types
  public type LockDuration = {
    #Minutes : Int; // Lock for specified minutes, -1 means flexible (can withdraw anytime)
  };

  public type Product = {
    id : Nat;
    name : Text;
    description : Text;
    available_durations : [LockDuration];
    is_active : Bool;
    created_at : Timestamp;
  };

  // Vault Types
  public type VaultEntry = {
    id : Nat; // Unique ID for each staking entry
    owner : Principal;
    amount : Tokens;
    locked_at : Timestamp;
    unlock_time : ?Timestamp; // null means flexible staking (can withdraw anytime)
    is_flexible : Bool; // true for flexible staking, false for time-locked
    product_id : Nat; // Reference to the product used
    selected_duration : LockDuration; // The duration selected by user
  };

  public type DividendDistribution = {
    total_amount : Tokens;
    per_token_amount : Float;
    distributed_at : Timestamp;
    distribution_id : Nat;
    total_locked_at_distribution : Tokens;
  };

  // Investment Tracking Types
  public type InvestmentStatus = {
    #Active;
    #Completed;
    #Cancelled;
  };

  public type InvestmentRecord = {
    id : Nat;
    user : Principal;
    vault_entry_id : Nat;
    initial_amount : Tokens;
    current_value : Tokens;
    total_dividends_earned : Tokens;
    total_dividends_claimed : Tokens;
    roi_percentage : Float; // Return on Investment percentage
    created_at : Timestamp;
    last_updated : Timestamp;
    status : InvestmentStatus;
    product_name : Text;
    duration_type : LockDuration;
  };

  public type InvestmentSummary = {
    total_investments : Nat;
    total_amount_invested : Tokens;
    total_current_value : Tokens;
    total_dividends_earned : Tokens;
    total_dividends_claimed : Tokens;
    average_roi : Float;
    active_investments : Nat;
    completed_investments : Nat;
  };

  public type UserInvestmentReport = {
    user : Principal;
    summary : InvestmentSummary;
    investments : [InvestmentRecord];
    unclaimed_dividends : [(Nat, Tokens)]; // (distribution_id, amount)
  };

  public type AdminInvestmentReport = {
    total_users : Nat;
    platform_summary : InvestmentSummary;
    top_investors : [(Principal, Tokens)]; // (user, total_invested)
    product_performance : [(Nat, Text, Tokens, Nat)]; // (product_id, name, total_locked, user_count)
    recent_activities : [InvestmentActivity];
  };

  public type InvestmentActivity = {
    id : Nat;
    user : Principal;
    activity_type : ActivityType;
    amount : Tokens;
    timestamp : Timestamp;
    product_id : ?Nat;
  };

  public type ActivityType = {
    #Lock : { duration : LockDuration };
    #Unlock;
    #DividendClaim : { distribution_id : Nat };
    #DividendDistribution;
  };

  // Investment Instrument Types
  public type InstrumentType = {
    #OnChain : { protocol : Text; contract_address : ?Text };
    #OffChain : { provider : Text; instrument_name : Text };
    #Liquidity : { dex : Text; pair : Text };
    #Staking : { validator : Text; network : Text };
    #Lending : { platform : Text; asset : Text };
  };

  public type InstrumentStatus = {
    #Active;
    #Paused;
    #Liquidating;
    #Closed;
  };

  public type InvestmentInstrument = {
    id : Nat;
    name : Text;
    description : Text;
    instrument_type : InstrumentType;
    expected_apy : Float; // Annual Percentage Yield
    risk_level : Nat; // 1-10 scale (1 = lowest risk, 10 = highest risk)
    min_investment : Tokens;
    max_investment : ?Tokens; // null means no limit
    lock_period_days : ?Nat; // null means flexible
    status : InstrumentStatus;
    total_invested : Tokens;
    total_yield_earned : Tokens;
    created_at : Timestamp;
    last_updated : Timestamp;
  };

  public type InstrumentInvestment = {
    id : Nat;
    instrument_id : Nat;
    amount_invested : Tokens;
    current_value : Tokens;
    yield_earned : Tokens;
    invested_at : Timestamp;
    last_yield_update : Timestamp;
    status : InvestmentStatus;
    exit_strategy : ?ExitStrategy;
  };

  public type ExitStrategy = {
    #Immediate;
    #Scheduled : { exit_date : Timestamp };
    #Conditional : { target_yield : Float };
    #Gradual : { percentage_per_period : Float; period_days : Nat };
  };

  public type YieldDistribution = {
    id : Nat;
    instrument_investment_id : Nat;
    yield_amount : Tokens;
    distribution_date : Timestamp;
    distribution_type : YieldType;
  };

  public type YieldType = {
    #Interest;
    #Dividends;
    #TradingFees;
    #StakingRewards;
    #LiquidityMining;
    #Other : Text;
  };

  public type InvestmentStrategy = {
    id : Nat;
    name : Text;
    description : Text;
    allocation_rules : [AllocationRule];
    rebalance_frequency_days : Nat;
    max_risk_level : Nat;
    target_apy : Float;
    is_active : Bool;
    created_at : Timestamp;
  };

  public type AllocationRule = {
    instrument_type : InstrumentType;
    min_percentage : Float;
    max_percentage : Float;
    priority : Nat; // 1 = highest priority
  };

  public type VaultInvestmentSummary = {
    total_vault_balance : Tokens;
    total_invested_in_instruments : Tokens;
    total_available_for_investment : Tokens;
    total_yield_earned : Tokens;
    weighted_average_apy : Float;
    active_instruments : Nat;
    investment_diversity_score : Float; // 0-100 scale
  };

  // Admin Types
  public type AdminAction = {
    #TransferTokens : { to : Principal; amount : Tokens };
    #DistributeDividend : { amount : Tokens };
    #SetVaultLockPeriod : { period_seconds : Nat64 };
    #GenerateReport : { report_type : Text };
    #CreateInstrument : { instrument : InvestmentInstrument };
    #InvestInInstrument : { instrument_id : Nat; amount : Tokens };
    #ExitInstrument : { investment_id : Nat; strategy : ExitStrategy };
    #UpdateYield : { investment_id : Nat; new_yield : Tokens };
  };
};
