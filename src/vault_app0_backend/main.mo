import Principal "mo:base/Principal";
import Time "mo:base/Time";
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Option "mo:base/Option";
import Result "mo:base/Result";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Nat32 "mo:base/Nat32";
import Nat8 "mo:base/Nat8";
import Types "./types";

persistent actor VaultApp {
  // Admin principal (replace with actual admin principal)
  private let admin : Principal = Principal.fromText("xygmt-g36ra-6fx4l-vrohf-fhtid-h7jba-gbumz-34aii-c2j73-vh53b-mqe");

  // Token state
  private let token_name = "USDX Mock Token";
  private let token_symbol = "USDX";
  private let token_decimals : Nat8 = 6;
  private let token_fee : Nat = 10000; // 0.01 USDX
  private var token_total_supply : Nat = 1000000000000; // 1M USDX with 6 decimals
  private var token_tx_count : Nat = 0;

  // Vault state
  private var vault_lock_period_nanoseconds : Nat64 = 3600000000000; // 1 hour in nanoseconds (for debugging)
  private var vault_total_locked : Nat = 0;
  private var dividend_counter : Nat = 0;

  // Helper functions
  private func accountEqual(a1 : Types.Account, a2 : Types.Account) : Bool {
    if (not Principal.equal(a1.owner, a2.owner)) {
      return false;
    };
    switch (a1.subaccount, a2.subaccount) {
      case (null, null) { true };
      case (?s1, ?s2) { Array.equal(s1, s2, Nat8.equal) };
      case _ { false };
    };
  };

  private func accountHash(account : Types.Account) : Nat32 {
    let ownerHash = Principal.hash(account.owner);
    switch (account.subaccount) {
      case null { ownerHash };
      case (?subaccount) {
        ownerHash ^ Nat32.fromNat(Array.foldLeft<Nat8, Nat>(subaccount, 0, func(acc, x) { acc + Nat8.toNat(x) }));
      };
    };
  };

  private func allowanceKeyEqual(k1 : (Types.Account, Types.Account), k2 : (Types.Account, Types.Account)) : Bool {
    accountEqual(k1.0, k2.0) and accountEqual(k1.1, k2.1)
  };

  private func allowanceKeyHash(key : (Types.Account, Types.Account)) : Nat32 {
    accountHash(key.0) ^ accountHash(key.1);
  };

  private func getBalance(account : Types.Account) : Nat {
    Option.get(balances.get(account), 0);
  };

  private func setBalance(account : Types.Account, balance : Nat) {
    if (balance == 0) {
      balances.delete(account);
    } else {
      balances.put(account, balance);
    };
  };

  private func now() : Nat64 {
    Nat64.fromNat(Int.abs(Time.now()));
  };

  private func nextTxId() : Nat {
    token_tx_count += 1;
    token_tx_count;
  };

  private func isAdmin(caller : Principal) : Bool {
    Principal.equal(caller, admin);
  };

  // Token balances and allowances
  private transient var balances = HashMap.HashMap<Types.Account, Nat>(10, accountEqual, accountHash);
  private transient var allowances = HashMap.HashMap<(Types.Account, Types.Account), Types.Allowance>(10, allowanceKeyEqual, allowanceKeyHash);

  // Vault state
  private transient var vault_entries = HashMap.HashMap<Principal, Types.VaultEntry>(10, Principal.equal, Principal.hash);
  private transient var dividend_history = HashMap.HashMap<Nat, Types.DividendDistribution>(10, Nat.equal, func(n : Nat) : Nat32 { Nat32.fromNat(n % (2 ** 32 - 1)) });
  private transient var user_dividend_claims = HashMap.HashMap<(Principal, Nat), Bool>(
    10,
    func(k1 : (Principal, Nat), k2 : (Principal, Nat)) : Bool {
      Principal.equal(k1.0, k2.0) and k1.1 == k2.1
    },
    func(key : (Principal, Nat)) : Nat32 {
      Principal.hash(key.0) ^ Nat32.fromNat(key.1 % (2 ** 32 - 1));
    },
  );

  // Initialize admin balance
  private transient let admin_account : Types.Account = {
    owner = admin;
    subaccount = null;
  };
  private transient let _ = balances.put(admin_account, token_total_supply);

  // =============================================================================
  // TOKEN FUNCTIONS (ICRC-1/2)
  // =============================================================================

  public query func icrc1_name() : async Text {
    token_name;
  };

  public query func icrc1_symbol() : async Text {
    token_symbol;
  };

  public query func icrc1_decimals() : async Nat8 {
    token_decimals;
  };

  public query func icrc1_fee() : async Nat {
    token_fee;
  };

  public query func icrc1_metadata() : async [(Text, { #Text : Text; #Nat : Nat })] {
    [
      ("icrc1:name", #Text(token_name)),
      ("icrc1:symbol", #Text(token_symbol)),
      ("icrc1:decimals", #Nat(Nat8.toNat(token_decimals))),
      ("icrc1:fee", #Nat(token_fee)),
    ];
  };

  public query func icrc1_total_supply() : async Nat {
    token_total_supply;
  };

  public query func icrc1_minting_account() : async ?Types.Account {
    ?admin_account;
  };

  public query func icrc1_balance_of(account : Types.Account) : async Nat {
    getBalance(account);
  };

  public shared (msg) func icrc1_transfer(args : Types.TransferArgs) : async Types.TransferResult {
    let caller = msg.caller;
    let caller_account = { owner = caller; subaccount = args.from_subaccount };
    let from_balance = getBalance(caller_account);
    let amount_with_fee = args.amount + token_fee;

    if (from_balance < amount_with_fee) {
      return #Err(#InsufficientFunds({ balance = from_balance }));
    };

    switch (args.fee) {
      case (?provided_fee) {
        if (provided_fee != token_fee) {
          return #Err(#BadFee({ expected_fee = token_fee }));
        };
      };
      case null {};
    };

    setBalance(caller_account, from_balance - amount_with_fee);
    let to_balance = getBalance(args.to);
    setBalance(args.to, to_balance + args.amount);

    let tx_id = nextTxId();

    #Ok(tx_id);
  };

  public query func icrc1_supported_standards() : async [{
    name : Text;
    url : Text;
  }] {
    [
      { name = "ICRC-1"; url = "https://github.com/dfinity/ICRC-1" },
      {
        name = "ICRC-2";
        url = "https://github.com/dfinity/ICRC-1/tree/main/standards/ICRC-2";
      },
    ];
  };

  // ICRC-2 functions
  public shared (msg) func icrc2_approve(args : Types.ApproveArgs) : async Types.ApproveResult {
    let caller = msg.caller;
    let caller_account = { owner = caller; subaccount = args.from_subaccount };
    let caller_balance = getBalance(caller_account);

    switch (args.fee) {
      case (?provided_fee) {
        if (provided_fee != token_fee) {
          return #Err(#BadFee({ expected_fee = token_fee }));
        };
      };
      case null {};
    };

    if (caller_balance < token_fee) {
      return #Err(#InsufficientFunds({ balance = caller_balance }));
    };

    let current_allowance = switch (allowances.get((caller_account, args.spender))) {
      case (?allowance_record) { allowance_record.allowance };
      case null { 0 };
    };

    switch (args.expected_allowance) {
      case (?expected) {
        if (expected != current_allowance) {
          return #Err(#AllowanceChanged({ current_allowance = current_allowance }));
        };
      };
      case null {};
    };

    let allowance_record : Types.Allowance = {
      allowance = args.amount;
      expires_at = args.expires_at;
    };
    allowances.put((caller_account, args.spender), allowance_record);

    setBalance(caller_account, caller_balance - token_fee);

    let tx_id = nextTxId();

    #Ok(tx_id);
  };

  public query func icrc2_allowance(args : Types.AllowanceArgs) : async Types.Allowance {
    switch (allowances.get((args.account, args.spender))) {
      case (?allowance_record) { allowance_record };
      case null { { allowance = 0; expires_at = null } };
    };
  };

  // Admin token functions
  public shared (msg) func admin_set_lock_period(period_minutes : Nat) : async Result.Result<(), Text> {
    let caller = msg.caller;
    if (not isAdmin(caller)) {
      return #err("Only admin can set lock period");
    };

    // Convert minutes to nanoseconds: minutes * 60 * 1,000,000,000
    vault_lock_period_nanoseconds := Nat64.fromNat(period_minutes * 60 * 1000000000);
    #ok(());
  };

  public shared (msg) func admin_transfer_tokens(to : Principal, amount : Nat) : async Result.Result<Nat, Text> {
    let caller = msg.caller;
    if (not isAdmin(caller)) {
      return #err("Only admin can transfer tokens");
    };

    let admin_balance = getBalance(admin_account);
    if (admin_balance < amount) {
      return #err("Insufficient admin balance");
    };

    let to_account : Types.Account = { owner = to; subaccount = null };
    setBalance(admin_account, admin_balance - amount);
    let to_balance = getBalance(to_account);
    setBalance(to_account, to_balance + amount);

    let tx_id = nextTxId();

    #ok(tx_id);
  };

  // Vault functions
  public shared (msg) func vault_lock_tokens(amount : Nat, lock_duration_minutes : ?Nat) : async Result.Result<(), Text> {
    let caller = msg.caller;
    let caller_account : Types.Account = { owner = caller; subaccount = null };

    switch (vault_entries.get(caller)) {
      case (?_existing) {
        return #err("User already has tokens locked. Unlock first before locking new amount.");
      };
      case null {};
    };

    let user_balance = getBalance(caller_account);
    if (user_balance < amount) {
      return #err("Insufficient balance to lock");
    };

    setBalance(caller_account, user_balance - amount);
    let admin_balance = getBalance(admin_account);
    setBalance(admin_account, admin_balance + amount);

    // Calculate lock duration: use custom duration if provided, otherwise use default
    let lock_duration_nanoseconds = switch (lock_duration_minutes) {
      case (?minutes) { Nat64.fromNat(minutes * 60 * 1000000000) }; // Convert minutes to nanoseconds
      case null { vault_lock_period_nanoseconds }; // Use default
    };

    let entry : Types.VaultEntry = {
      owner = caller;
      amount = amount;
      locked_at = now();
      unlock_time = ?(now() + lock_duration_nanoseconds);
    };

    vault_entries.put(caller, entry);
    vault_total_locked += amount;

    #ok(());
  };

  public shared (msg) func vault_unlock_tokens() : async Result.Result<Nat, Text> {
    let caller = msg.caller;
    let caller_account : Types.Account = { owner = caller; subaccount = null };

    switch (vault_entries.get(caller)) {
      case null {
        #err("No tokens locked for this user");
      };
      case (?entry) {
        switch (entry.unlock_time) {
          case null {
            #err("Tokens are permanently locked");
          };
          case (?unlock_time) {
            if (now() < unlock_time) {
              #err("Tokens are still locked. Unlock time: " # Nat64.toText(unlock_time));
            } else {
              let admin_balance = getBalance(admin_account);
              setBalance(admin_account, admin_balance - entry.amount);
              let user_balance = getBalance(caller_account);
              setBalance(caller_account, user_balance + entry.amount);

              vault_entries.delete(caller);
              vault_total_locked -= entry.amount;

              #ok(entry.amount);
            };
          };
        };
      };
    };
  };

  // Dividend functions
  public shared (msg) func admin_distribute_dividend(total_dividend_amount : Nat) : async Result.Result<Nat, Text> {
    let caller = msg.caller;

    if (not isAdmin(caller)) {
      return #err("Only admin can distribute dividends");
    };

    if (vault_total_locked == 0) {
      return #err("No tokens locked in vault");
    };

    let admin_balance = getBalance(admin_account);
    if (admin_balance < total_dividend_amount) {
      return #err("Insufficient admin balance for dividend distribution");
    };

    dividend_counter += 1;

    // Store the total dividend amount and total locked at distribution time
    // This avoids precision loss from integer division
    let distribution : Types.DividendDistribution = {
      total_amount = total_dividend_amount;
      per_token_amount = 0; // Will be calculated during claim
      distributed_at = now();
      distribution_id = dividend_counter;
      total_locked_at_distribution = vault_total_locked;
    };

    dividend_history.put(dividend_counter, distribution);

    #ok(dividend_counter);
  };

  public shared (msg) func claim_dividend(distribution_id : Nat) : async Result.Result<Nat, Text> {
    let caller = msg.caller;
    let caller_account : Types.Account = { owner = caller; subaccount = null };

    switch (vault_entries.get(caller)) {
      case null {
        return #err("No tokens locked for this user");
      };
      case (?entry) {
        switch (dividend_history.get(distribution_id)) {
          case null {
            return #err("Distribution not found");
          };
          case (?distribution) {
            let claim_key = (caller, distribution_id);
            switch (user_dividend_claims.get(claim_key)) {
              case (?true) {
                return #err("Dividend already claimed for this distribution");
              };
              case _ {
                if (entry.locked_at > distribution.distributed_at) {
                  return #err("Tokens were locked after this dividend distribution");
                };

                // Calculate dividend amount: (user_locked_amount * total_dividend) / total_locked_at_distribution
                // This ensures fair distribution based on the locked amounts at distribution time
                let dividend_amount = (entry.amount * distribution.total_amount) / distribution.total_locked_at_distribution;

                let admin_balance = getBalance(admin_account);
                setBalance(admin_account, admin_balance - dividend_amount);
                let user_balance = getBalance(caller_account);
                setBalance(caller_account, user_balance + dividend_amount);

                user_dividend_claims.put(claim_key, true);

                return #ok(dividend_amount);
              };
            };
          };
        };
      };
    };
  };

  // Query functions
  public query func get_vault_info() : async {
    total_locked : Nat;
    lock_period_seconds : Nat64;
    lock_period_minutes : Nat64;
    dividend_count : Nat;
    admin : Principal;
  } {
    {
      total_locked = vault_total_locked;
      lock_period_seconds = vault_lock_period_nanoseconds / 1000000000; // Convert nanoseconds to seconds
      lock_period_minutes = vault_lock_period_nanoseconds / 60000000000; // Convert nanoseconds to minutes
      dividend_count = dividend_counter;
      admin = admin;
    };
  };

  public query func get_user_vault_info(user : Principal) : async ?{
    amount : Nat;
    locked_at : Nat64;
    unlock_time : ?Nat64;
    can_unlock : Bool;
  } {
    switch (vault_entries.get(user)) {
      case null { null };
      case (?entry) {
        let can_unlock = switch (entry.unlock_time) {
          case null { false };
          case (?unlock_time) { now() >= unlock_time };
        };
        ?{
          amount = entry.amount;
          locked_at = entry.locked_at;
          unlock_time = entry.unlock_time;
          can_unlock = can_unlock;
        };
      };
    };
  };

  public query func get_unclaimed_dividends(user : Principal) : async [(Nat, Nat)] {
    switch (vault_entries.get(user)) {
      case null { [] };
      case (?entry) {
        let unclaimed = Array.mapFilter<(Nat, Types.DividendDistribution), (Nat, Nat)>(
          Iter.toArray(dividend_history.entries()),
          func((id, distribution)) : ?(Nat, Nat) {
            let claim_key = (user, id);
            let already_claimed = Option.get(user_dividend_claims.get(claim_key), false);
            let eligible = entry.locked_at <= distribution.distributed_at;

            if (not already_claimed and eligible) {
              let dividend_amount = (entry.amount * distribution.total_amount) / distribution.total_locked_at_distribution;
              ?(id, dividend_amount);
            } else {
              null;
            };
          },
        );
        unclaimed;
      };
    };
  };

  public query func get_dividend_history() : async [(Nat, Types.DividendDistribution)] {
    Iter.toArray(dividend_history.entries());
  };

  public query func get_all_balances() : async [(Types.Account, Nat)] {
    Iter.toArray(balances.entries());
  };

  // Legacy greeting function
  public query func greet(name : Text) : async Text {
    return "Hello, " # name # "! Welcome to USDX Vault App!";
  };
};
