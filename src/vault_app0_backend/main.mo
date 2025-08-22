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
import Float "mo:base/Float";
import Types "./types";

persistent actor VaultApp {
  // Admin principals - multiple admins supported
  private let admins : [Principal] = [
    Principal.fromText("xygmt-g36ra-6fx4l-vrohf-fhtid-h7jba-gbumz-34aii-c2j73-vh53b-mqe"), // Original admin
    Principal.fromText("ddm5i-napuo-a6jjo-czjha-xcr4l-dzpqe-uygc7-w3yxz-dmqso-zd36q-eae") // New admin
  ];

  // Primary admin for backward compatibility (first admin in the list)
  private let admin : Principal = admins[0];

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
  private var vault_entry_counter : Nat = 0; // Counter for unique vault entry IDs

  // Product state
  private var product_counter : Nat = 0; // Counter for unique product IDs

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
    Array.find<Principal>(admins, func(adminPrincipal) { Principal.equal(caller, adminPrincipal) }) != null;
  };

  // Token balances and allowances
  private transient var balances = HashMap.HashMap<Types.Account, Nat>(10, accountEqual, accountHash);
  private transient var allowances = HashMap.HashMap<(Types.Account, Types.Account), Types.Allowance>(10, allowanceKeyEqual, allowanceKeyHash);

  // Product storage
  private transient var products = HashMap.HashMap<Nat, Types.Product>(10, Nat.equal, func(n : Nat) : Nat32 { Nat32.fromNat(n % (2 ** 32 - 1)) });

  // Vault state - changed to support multiple entries per user
  private transient var vault_entries = HashMap.HashMap<Nat, Types.VaultEntry>(10, Nat.equal, func(n : Nat) : Nat32 { Nat32.fromNat(n % (2 ** 32 - 1)) });
  private transient var user_vault_entries = HashMap.HashMap<Principal, [Nat]>(10, Principal.equal, Principal.hash);
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

  // Initialize default products
  private func initializeDefaultProducts() {
    // Product A - Flexible and short-term options
    product_counter += 1;
    let product_a : Types.Product = {
      id = product_counter;
      name = "Flexible Savings";
      description = "Flexible savings product with multiple duration options including instant withdrawal";
      available_durations = [#Flexible, #Minutes(60), #Minutes(1440), #Minutes(43200)]; // Flexible, 1 hour, 1 day, 1 month
      is_active = true;
      created_at = now();
    };
    products.put(product_counter, product_a);

    // Product B - Short-term high frequency
    product_counter += 1;
    let product_b : Types.Product = {
      id = product_counter;
      name = "Quick Staking";
      description = "Short-term staking product for active traders";
      available_durations = [#Minutes(15), #Minutes(60), #Minutes(10080)]; // 15 minutes, 1 hour, 1 week
      is_active = true;
      created_at = now();
    };
    products.put(product_counter, product_b);
  };

  // Initialize products on deployment
  private transient let _ = initializeDefaultProducts();

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

  // Admin emergency withdrawal - force unlock any vault entry
  public shared (msg) func admin_emergency_withdrawal(entry_id : Nat) : async Result.Result<Nat, Text> {
    let caller = msg.caller;
    if (not isAdmin(caller)) {
      return #err("Only admin can perform emergency withdrawal");
    };

    switch (vault_entries.get(entry_id)) {
      case null {
        #err("Vault entry not found");
      };
      case (?entry) {
        let user_account : Types.Account = {
          owner = entry.owner;
          subaccount = null;
        };

        // Return tokens to user
        let admin_balance = getBalance(admin_account);
        setBalance(admin_account, admin_balance - entry.amount);
        let user_balance = getBalance(user_account);
        setBalance(user_account, user_balance + entry.amount);

        // Remove entry
        vault_entries.delete(entry_id);

        // Update user's entry list
        let current_entries = Option.get(user_vault_entries.get(entry.owner), []);
        let updated_entries = Array.filter<Nat>(current_entries, func(id) { id != entry_id });
        if (updated_entries.size() == 0) {
          user_vault_entries.delete(entry.owner);
        } else {
          user_vault_entries.put(entry.owner, updated_entries);
        };

        vault_total_locked -= entry.amount;

        #ok(entry.amount);
      };
    };
  };

  // Product management functions
  public shared (msg) func admin_create_product(name : Text, description : Text, available_durations : [Types.LockDuration]) : async Result.Result<Nat, Text> {
    let caller = msg.caller;
    if (not isAdmin(caller)) {
      return #err("Only admin can create products");
    };

    if (name == "") {
      return #err("Product name cannot be empty");
    };

    if (available_durations.size() == 0) {
      return #err("Product must have at least one available duration");
    };

    product_counter += 1;
    let product_id = product_counter;

    let product : Types.Product = {
      id = product_id;
      name = name;
      description = description;
      available_durations = available_durations;
      is_active = true;
      created_at = now();
    };

    products.put(product_id, product);

    #ok(product_id);
  };

  public shared (msg) func admin_update_product(product_id : Nat, name : ?Text, description : ?Text, available_durations : ?[Types.LockDuration], is_active : ?Bool) : async Result.Result<(), Text> {
    let caller = msg.caller;
    if (not isAdmin(caller)) {
      return #err("Only admin can update products");
    };

    switch (products.get(product_id)) {
      case null {
        #err("Product not found");
      };
      case (?existing_product) {
        let updated_product : Types.Product = {
          id = existing_product.id;
          name = Option.get(name, existing_product.name);
          description = Option.get(description, existing_product.description);
          available_durations = Option.get(available_durations, existing_product.available_durations);
          is_active = Option.get(is_active, existing_product.is_active);
          created_at = existing_product.created_at;
        };

        // Validate updated product
        if (updated_product.name == "") {
          return #err("Product name cannot be empty");
        };

        if (updated_product.available_durations.size() == 0) {
          return #err("Product must have at least one available duration");
        };

        products.put(product_id, updated_product);
        #ok(());
      };
    };
  };

  public shared (msg) func admin_delete_product(product_id : Nat) : async Result.Result<(), Text> {
    let caller = msg.caller;
    if (not isAdmin(caller)) {
      return #err("Only admin can delete products");
    };

    switch (products.get(product_id)) {
      case null {
        #err("Product not found");
      };
      case (?_) {
        products.delete(product_id);
        #ok(());
      };
    };
  };

  // Admin management functions
  public query func get_admins() : async [Principal] {
    admins;
  };

  public query func is_admin(principal : Principal) : async Bool {
    isAdmin(principal);
  };

  // Vault functions
  public shared (msg) func vault_lock_tokens(amount : Nat, product_id : Nat, selected_duration : Types.LockDuration) : async Result.Result<Nat, Text> {
    let caller = msg.caller;
    let caller_account : Types.Account = { owner = caller; subaccount = null };

    let user_balance = getBalance(caller_account);
    if (user_balance < amount) {
      return #err("Insufficient balance to lock");
    };

    // Validate product exists and is active
    switch (products.get(product_id)) {
      case null {
        return #err("Product not found");
      };
      case (?product) {
        if (not product.is_active) {
          return #err("Product is not active");
        };

        // Validate that the selected duration is available for this product
        let duration_available = Array.find<Types.LockDuration>(
          product.available_durations,
          func(duration) {
            switch (duration, selected_duration) {
              case (#Flexible, #Flexible) { true };
              case (#Minutes(a), #Minutes(b)) { a == b };
              case _ { false };
            };
          },
        );

        switch (duration_available) {
          case null {
            return #err("Selected duration is not available for this product");
          };
          case (?_) {
            // Duration is valid, proceed with locking
          };
        };

        setBalance(caller_account, user_balance - amount);
        let admin_balance = getBalance(admin_account);
        setBalance(admin_account, admin_balance + amount);

        // Generate unique entry ID
        vault_entry_counter += 1;
        let entry_id = vault_entry_counter;

        // Calculate unlock time based on selected duration
        let (unlock_time, is_flexible) = switch (selected_duration) {
          case (#Flexible) {
            (null, true); // Flexible staking - can withdraw anytime
          };
          case (#Minutes(minutes)) {
            let lock_duration_nanoseconds = Nat64.fromNat(minutes * 60 * 1000000000); // Convert minutes to nanoseconds
            (?(now() + lock_duration_nanoseconds), false);
          };
        };

        let entry : Types.VaultEntry = {
          id = entry_id;
          owner = caller;
          amount = amount;
          locked_at = now();
          unlock_time = unlock_time;
          is_flexible = is_flexible;
          product_id = product_id;
          selected_duration = selected_duration;
        };

        // Store the entry
        vault_entries.put(entry_id, entry);

        // Update user's entry list
        let current_entries = Option.get(user_vault_entries.get(caller), []);
        let updated_entries = Array.append(current_entries, [entry_id]);
        user_vault_entries.put(caller, updated_entries);

        vault_total_locked += amount;

        #ok(entry_id);
      };
    };
  };

  public shared (msg) func vault_unlock_tokens(entry_id : Nat) : async Result.Result<Nat, Text> {
    let caller = msg.caller;
    let caller_account : Types.Account = { owner = caller; subaccount = null };

    switch (vault_entries.get(entry_id)) {
      case null {
        #err("Vault entry not found");
      };
      case (?entry) {
        // Verify ownership
        if (not Principal.equal(entry.owner, caller)) {
          return #err("You don't own this vault entry");
        };

        // Check if can unlock
        let can_unlock = if (entry.is_flexible) {
          true // Flexible staking can always be unlocked
        } else {
          switch (entry.unlock_time) {
            case null { false }; // Should not happen for time-locked entries
            case (?unlock_time) { now() >= unlock_time };
          };
        };

        if (not can_unlock) {
          let unlock_time_text = switch (entry.unlock_time) {
            case null { "unknown" };
            case (?time) { Nat64.toText(time) };
          };
          return #err("Tokens are still locked. Unlock time: " # unlock_time_text);
        };

        // Process unlock
        let admin_balance = getBalance(admin_account);
        setBalance(admin_account, admin_balance - entry.amount);
        let user_balance = getBalance(caller_account);
        setBalance(caller_account, user_balance + entry.amount);

        // Remove entry
        vault_entries.delete(entry_id);

        // Update user's entry list
        let current_entries = Option.get(user_vault_entries.get(caller), []);
        let updated_entries = Array.filter<Nat>(current_entries, func(id) { id != entry_id });
        if (updated_entries.size() == 0) {
          user_vault_entries.delete(caller);
        } else {
          user_vault_entries.put(caller, updated_entries);
        };

        vault_total_locked -= entry.amount;

        #ok(entry.amount);
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
    // Calculate per_token_amount using Float for precision
    let _per_token_amount = Float.fromInt(total_dividend_amount) / Float.fromInt(vault_total_locked);
    let total_locked_at_distribution = vault_total_locked;

    let distribution : Types.DividendDistribution = {
      total_amount = total_dividend_amount;
      per_token_amount = _per_token_amount;
      distributed_at = now();
      distribution_id = dividend_counter;
      total_locked_at_distribution = total_locked_at_distribution;
    };

    dividend_history.put(dividend_counter, distribution);

    #ok(dividend_counter);
  };

  public shared (msg) func claim_dividend(distribution_id : Nat) : async Result.Result<Nat, Text> {
    let caller = msg.caller;
    let caller_account : Types.Account = { owner = caller; subaccount = null };

    // Check if already claimed
    let claim_key = (caller, distribution_id);
    switch (user_dividend_claims.get(claim_key)) {
      case (?true) {
        return #err("Dividend already claimed for this distribution");
      };
      case _ {};
    };

    switch (dividend_history.get(distribution_id)) {
      case null {
        return #err("Distribution not found");
      };
      case (?distribution) {
        switch (user_vault_entries.get(caller)) {
          case null {
            return #err("No tokens locked for this user");
          };
          case (?entry_ids) {
            var total_dividend_amount = 0;

            // Calculate total dividend across all eligible entries
            for (entry_id in entry_ids.vals()) {
              switch (vault_entries.get(entry_id)) {
                case null {};
                case (?entry) {
                  if (entry.locked_at <= distribution.distributed_at) {
                    let dividend_amount_float = Float.fromInt(entry.amount) * distribution.per_token_amount;
                    let dividend_amount = Int.abs(Float.toInt(dividend_amount_float));
                    total_dividend_amount += dividend_amount;
                  };
                };
              };
            };

            if (total_dividend_amount == 0) {
              return #err("No eligible tokens for this dividend distribution");
            };

            // Transfer dividend
            let admin_balance = getBalance(admin_account);
            setBalance(admin_account, admin_balance - total_dividend_amount);
            let user_balance = getBalance(caller_account);
            setBalance(caller_account, user_balance + total_dividend_amount);

            // Mark as claimed
            user_dividend_claims.put(claim_key, true);

            return #ok(total_dividend_amount);
          };
        };
      };
    };
  };

  // Query functions
  public query func get_all_products() : async [Types.Product] {
    Iter.toArray(Iter.map(products.vals(), func(product : Types.Product) : Types.Product { product }));
  };

  public query func get_active_products() : async [Types.Product] {
    Array.filter<Types.Product>(
      Iter.toArray(products.vals()),
      func(product) { product.is_active },
    );
  };

  public query func get_product(product_id : Nat) : async ?Types.Product {
    products.get(product_id);
  };

  public query func get_vault_info() : async {
    total_locked : Nat;
    lock_period_seconds : Nat64;
    lock_period_minutes : Nat64;
    dividend_count : Nat;
    admin : Principal;
    admins : [Principal];
    total_products : Nat;
    active_products : Nat;
  } {
    let all_products = Iter.toArray(products.vals());
    let active_products_count = Array.filter<Types.Product>(all_products, func(product) { product.is_active }).size();

    {
      total_locked = vault_total_locked;
      lock_period_seconds = vault_lock_period_nanoseconds / 1000000000; // Convert nanoseconds to seconds
      lock_period_minutes = vault_lock_period_nanoseconds / 60000000000; // Convert nanoseconds to minutes
      dividend_count = dividend_counter;
      admin = admin; // Primary admin for backward compatibility
      admins = admins; // All admins
      total_products = all_products.size();
      active_products = active_products_count;
    };
  };

  public query func get_user_vault_entries(user : Principal) : async [{
    id : Nat;
    amount : Nat;
    locked_at : Nat64;
    unlock_time : ?Nat64;
    can_unlock : Bool;
    is_flexible : Bool;
    product_id : Nat;
    selected_duration : Types.LockDuration;
  }] {
    switch (user_vault_entries.get(user)) {
      case null { [] };
      case (?entry_ids) {
        Array.mapFilter<Nat, { id : Nat; amount : Nat; locked_at : Nat64; unlock_time : ?Nat64; can_unlock : Bool; is_flexible : Bool; product_id : Nat; selected_duration : Types.LockDuration }>(
          entry_ids,
          func(entry_id) {
            switch (vault_entries.get(entry_id)) {
              case null { null };
              case (?entry) {
                let can_unlock = if (entry.is_flexible) {
                  true;
                } else {
                  switch (entry.unlock_time) {
                    case null { false };
                    case (?unlock_time) { now() >= unlock_time };
                  };
                };
                ?{
                  id = entry.id;
                  amount = entry.amount;
                  locked_at = entry.locked_at;
                  unlock_time = entry.unlock_time;
                  can_unlock = can_unlock;
                  is_flexible = entry.is_flexible;
                  product_id = entry.product_id;
                  selected_duration = entry.selected_duration;
                };
              };
            };
          },
        );
      };
    };
  };

  public query func get_unclaimed_dividends(user : Principal) : async [(Nat, Nat)] {
    switch (user_vault_entries.get(user)) {
      case null { [] };
      case (?entry_ids) {
        // Calculate total unclaimed dividends across all user's vault entries
        var total_unclaimed : [(Nat, Nat)] = [];

        for (entry_id in entry_ids.vals()) {
          switch (vault_entries.get(entry_id)) {
            case null {};
            case (?entry) {
              let entry_unclaimed = Array.mapFilter<(Nat, Types.DividendDistribution), (Nat, Nat)>(
                Iter.toArray(dividend_history.entries()),
                func((dist_id, distribution)) : ?(Nat, Nat) {
                  let claim_key = (user, dist_id);
                  let already_claimed = Option.get(user_dividend_claims.get(claim_key), false);
                  let eligible = entry.locked_at <= distribution.distributed_at;

                  if (not already_claimed and eligible) {
                    let dividend_amount_float = Float.fromInt(entry.amount) * distribution.per_token_amount;
                    let dividend_amount = Int.abs(Float.toInt(dividend_amount_float));
                    ?(dist_id, dividend_amount);
                  } else {
                    null;
                  };
                },
              );

              // Merge with total (sum amounts for same distribution IDs)
              for ((dist_id, amount) in entry_unclaimed.vals()) {
                let existing_index = Array.indexOf<(Nat, Nat)>((dist_id, amount), total_unclaimed, func(a, b) { a.0 == b.0 });
                switch (existing_index) {
                  case null {
                    total_unclaimed := Array.append(total_unclaimed, [(dist_id, amount)]);
                  };
                  case (?index) {
                    // Sum the amounts for the same distribution ID
                    let updated = Array.mapEntries<(Nat, Nat), (Nat, Nat)>(
                      total_unclaimed,
                      func(item, i) {
                        if (i == index) { (item.0, item.1 + amount) } else {
                          item;
                        };
                      },
                    );
                    total_unclaimed := updated;
                  };
                };
              };
            };
          };
        };

        total_unclaimed;
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
