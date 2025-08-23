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

  // Investment tracking state
  private var investment_counter : Nat = 0; // Counter for unique investment IDs
  private var activity_counter : Nat = 0; // Counter for unique activity IDs

  // Investment instrument state
  private var instrument_counter : Nat = 0; // Counter for unique instrument IDs
  private var instrument_investment_counter : Nat = 0; // Counter for unique instrument investments
  private var yield_distribution_counter : Nat = 0; // Counter for yield distributions
  private var _strategy_counter : Nat = 0; // Counter for investment strategies

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

  // Investment tracking helper functions
  private func createInvestmentRecord(user : Principal, vault_entry_id : Nat, amount : Nat, product_name : Text, duration : Types.LockDuration) : Nat {
    investment_counter += 1;
    let investment_id = investment_counter;

    let investment_record : Types.InvestmentRecord = {
      id = investment_id;
      user = user;
      vault_entry_id = vault_entry_id;
      initial_amount = amount;
      current_value = amount; // Initially same as invested amount
      total_dividends_earned = 0;
      total_dividends_claimed = 0;
      roi_percentage = 0.0;
      created_at = now();
      last_updated = now();
      status = #Active;
      product_name = product_name;
      duration_type = duration;
    };

    investment_records.put(investment_id, investment_record);

    // Update user's investment list
    let current_investments = Option.get(user_investments.get(user), []);
    let updated_investments = Array.append(current_investments, [investment_id]);
    user_investments.put(user, updated_investments);

    investment_id;
  };

  private func logActivity(user : Principal, activity_type : Types.ActivityType, amount : Nat, product_id : ?Nat) {
    activity_counter += 1;
    let activity : Types.InvestmentActivity = {
      id = activity_counter;
      user = user;
      activity_type = activity_type;
      amount = amount;
      timestamp = now();
      product_id = product_id;
    };
    investment_activities.put(activity_counter, activity);
  };

  private func updateInvestmentRecord(investment_id : Nat, dividends_earned : Nat, dividends_claimed : Nat) {
    switch (investment_records.get(investment_id)) {
      case null {};
      case (?record) {
        let total_dividends = record.total_dividends_earned + dividends_earned;
        let total_claimed = record.total_dividends_claimed + dividends_claimed;
        let current_value = record.initial_amount + total_dividends;
        let roi = if (record.initial_amount > 0) {
          (Float.fromInt(total_dividends) / Float.fromInt(record.initial_amount)) * 100.0;
        } else { 0.0 };

        let updated_record : Types.InvestmentRecord = {
          id = record.id;
          user = record.user;
          vault_entry_id = record.vault_entry_id;
          initial_amount = record.initial_amount;
          current_value = current_value;
          total_dividends_earned = total_dividends;
          total_dividends_claimed = total_claimed;
          roi_percentage = roi;
          created_at = record.created_at;
          last_updated = now();
          status = record.status;
          product_name = record.product_name;
          duration_type = record.duration_type;
        };

        investment_records.put(investment_id, updated_record);
      };
    };
  };

  private func completeInvestment(investment_id : Nat) {
    switch (investment_records.get(investment_id)) {
      case null {};
      case (?record) {
        let completed_record : Types.InvestmentRecord = {
          id = record.id;
          user = record.user;
          vault_entry_id = record.vault_entry_id;
          initial_amount = record.initial_amount;
          current_value = record.current_value;
          total_dividends_earned = record.total_dividends_earned;
          total_dividends_claimed = record.total_dividends_claimed;
          roi_percentage = record.roi_percentage;
          created_at = record.created_at;
          last_updated = now();
          status = #Completed;
          product_name = record.product_name;
          duration_type = record.duration_type;
        };

        investment_records.put(investment_id, completed_record);
      };
    };
  };

  // Investment instrument helper functions
  private func calculateDiversityScore() : Float {
    let total_instruments = investment_instruments.size();
    if (total_instruments == 0) return 0.0;

    var type_counts : [(Text, Nat)] = [];
    for ((_, instrument) in investment_instruments.entries()) {
      if (instrument.status == #Active and instrument.total_invested > 0) {
        let type_name = switch (instrument.instrument_type) {
          case (#OnChain(_)) "OnChain";
          case (#OffChain(_)) "OffChain";
          case (#Liquidity(_)) "Liquidity";
          case (#Staking(_)) "Staking";
          case (#Lending(_)) "Lending";
        };

        let existing_index = Array.indexOf<(Text, Nat)>((type_name, 0), type_counts, func(a, b) { a.0 == b.0 });
        switch (existing_index) {
          case null {
            type_counts := Array.append(type_counts, [(type_name, 1)]);
          };
          case (?index) {
            type_counts := Array.mapEntries<(Text, Nat), (Text, Nat)>(
              type_counts,
              func(item, i) {
                if (i == index) { (item.0, item.1 + 1) } else { item };
              },
            );
          };
        };
      };
    };

    let unique_types = type_counts.size();
    Float.fromInt(unique_types) * 20.0; // Max 100 for 5 different types
  };

  private func calculateWeightedAverageAPY() : Float {
    var total_invested = 0;
    var weighted_sum = 0.0;

    for ((_, investment) in instrument_investments.entries()) {
      if (investment.status == #Active) {
        switch (investment_instruments.get(investment.instrument_id)) {
          case null {};
          case (?instrument) {
            total_invested += investment.amount_invested;
            weighted_sum += Float.fromInt(investment.amount_invested) * instrument.expected_apy;
          };
        };
      };
    };

    if (total_invested == 0) return 0.0;
    weighted_sum / Float.fromInt(total_invested);
  };

  private func getAvailableInvestmentBalance() : Nat {
    let admin_balance = getBalance(admin_account);
    var total_invested_in_instruments = 0;

    for ((_, investment) in instrument_investments.entries()) {
      if (investment.status == #Active) {
        total_invested_in_instruments += investment.amount_invested;
      };
    };

    if (admin_balance > total_invested_in_instruments) {
      admin_balance - total_invested_in_instruments;
    } else { 0 };
  };

  // Token balances and allowances
  private transient var balances = HashMap.HashMap<Types.Account, Nat>(10, accountEqual, accountHash);
  private transient var allowances = HashMap.HashMap<(Types.Account, Types.Account), Types.Allowance>(10, allowanceKeyEqual, allowanceKeyHash);

  // Product storage ...
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

  // Investment tracking storage
  private transient var investment_records = HashMap.HashMap<Nat, Types.InvestmentRecord>(10, Nat.equal, func(n : Nat) : Nat32 { Nat32.fromNat(n % (2 ** 32 - 1)) });
  private transient var user_investments = HashMap.HashMap<Principal, [Nat]>(10, Principal.equal, Principal.hash);
  private transient var investment_activities = HashMap.HashMap<Nat, Types.InvestmentActivity>(10, Nat.equal, func(n : Nat) : Nat32 { Nat32.fromNat(n % (2 ** 32 - 1)) });

  // Investment instrument storage
  private transient var investment_instruments = HashMap.HashMap<Nat, Types.InvestmentInstrument>(10, Nat.equal, func(n : Nat) : Nat32 { Nat32.fromNat(n % (2 ** 32 - 1)) });
  private transient var instrument_investments = HashMap.HashMap<Nat, Types.InstrumentInvestment>(10, Nat.equal, func(n : Nat) : Nat32 { Nat32.fromNat(n % (2 ** 32 - 1)) });
  private transient var yield_distributions = HashMap.HashMap<Nat, Types.YieldDistribution>(10, Nat.equal, func(n : Nat) : Nat32 { Nat32.fromNat(n % (2 ** 32 - 1)) });
  private transient var _investment_strategies = HashMap.HashMap<Nat, Types.InvestmentStrategy>(10, Nat.equal, func(n : Nat) : Nat32 { Nat32.fromNat(n % (2 ** 32 - 1)) });

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
      available_durations = [#Minutes(-1), #Minutes(60), #Minutes(1440), #Minutes(43200)]; // Flexible, 1 hour, 1 day, 1 month
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

  // Initialize default investment instruments
  private func initializeDefaultInstruments() {
    // Instrument 1 - DeFi Lending (Low Risk)
    instrument_counter += 1;
    let lending_instrument : Types.InvestmentInstrument = {
      id = instrument_counter;
      name = "DeFi Lending Pool";
      description = "Low-risk lending to established DeFi protocols with stable returns";
      instrument_type = #Lending({ platform = "Compound"; asset = "USDC" });
      expected_apy = 4.5; // 4.5% APY
      risk_level = 2;
      min_investment = 1000000000; // 1000 USDX
      max_investment = null;
      lock_period_days = null; // Flexible
      status = #Active;
      total_invested = 0;
      total_yield_earned = 0;
      created_at = now();
      last_updated = now();
    };
    investment_instruments.put(instrument_counter, lending_instrument);

    // Instrument 2 - Liquidity Mining (Medium Risk)
    instrument_counter += 1;
    let liquidity_instrument : Types.InvestmentInstrument = {
      id = instrument_counter;
      name = "USDX-ICP Liquidity Pool";
      description = "Provide liquidity to USDX-ICP trading pair for trading fees and rewards";
      instrument_type = #Liquidity({ dex = "ICPSwap"; pair = "USDX/ICP" });
      expected_apy = 12.8; // 12.8% APY
      risk_level = 5;
      min_investment = 500000000; // 500 USDX
      max_investment = ?50000000000; // 50,000 USDX max
      lock_period_days = ?30; // 30 days lock
      status = #Active;
      total_invested = 0;
      total_yield_earned = 0;
      created_at = now();
      last_updated = now();
    };
    investment_instruments.put(instrument_counter, liquidity_instrument);

    // Instrument 3 - Staking (Medium-High Risk)
    instrument_counter += 1;
    let staking_instrument : Types.InvestmentInstrument = {
      id = instrument_counter;
      name = "ICP Network Staking";
      description = "Stake ICP tokens with high-performance validators for network rewards";
      instrument_type = #Staking({
        validator = "DFINITY Foundation";
        network = "Internet Computer";
      });
      expected_apy = 8.2; // 8.2% APY
      risk_level = 4;
      min_investment = 2000000000; // 2000 USDX
      max_investment = null;
      lock_period_days = ?90; // 90 days lock
      status = #Active;
      total_invested = 0;
      total_yield_earned = 0;
      created_at = now();
      last_updated = now();
    };
    investment_instruments.put(instrument_counter, staking_instrument);

    // Instrument 4 - Off-Chain Investment (High Risk)
    instrument_counter += 1;
    let offchain_instrument : Types.InvestmentInstrument = {
      id = instrument_counter;
      name = "Crypto Hedge Fund";
      description = "Professional crypto fund management with diversified strategies";
      instrument_type = #OffChain({
        provider = "BlockTower Capital";
        instrument_name = "Digital Asset Fund";
      });
      expected_apy = 25.0; // 25% APY
      risk_level = 8;
      min_investment = 10000000000; // 10,000 USDX
      max_investment = ?100000000000; // 100,000 USDX max
      lock_period_days = ?180; // 180 days lock
      status = #Active;
      total_invested = 0;
      total_yield_earned = 0;
      created_at = now();
      last_updated = now();
    };
    investment_instruments.put(instrument_counter, offchain_instrument);

    // Instrument 5 - On-Chain Yield Farming (High Risk)
    instrument_counter += 1;
    let onchain_instrument : Types.InvestmentInstrument = {
      id = instrument_counter;
      name = "Multi-Protocol Yield Farm";
      description = "Automated yield farming across multiple DeFi protocols for maximum returns";
      instrument_type = #OnChain({
        protocol = "Yearn Finance";
        contract_address = ?"0x123...abc";
      });
      expected_apy = 18.5; // 18.5% APY
      risk_level = 7;
      min_investment = 5000000000; // 5,000 USDX
      max_investment = ?25000000000; // 25,000 USDX max
      lock_period_days = ?60; // 60 days lock
      status = #Active;
      total_invested = 0;
      total_yield_earned = 0;
      created_at = now();
      last_updated = now();
    };
    investment_instruments.put(instrument_counter, onchain_instrument);
  };

  // Initialize default instruments on deployment
  private transient let _ = initializeDefaultInstruments();

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
              case (#Minutes(a), #Minutes(b)) { a == b };
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
          case (#Minutes(minutes)) {
            if (minutes == -1) {
              (null, true); // Flexible staking - can withdraw anytime
            } else {
              let lock_duration_nanoseconds = Nat64.fromNat(Int.abs(minutes) * 60 * 1000000000); // Convert minutes to nanoseconds
              (?(now() + lock_duration_nanoseconds), false);
            };
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

        // Create investment record
        let _ = createInvestmentRecord(caller, entry_id, amount, product.name, selected_duration);

        // Log activity
        logActivity(caller, #Lock({ duration = selected_duration }), amount, ?product_id);

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

        // Find and complete the investment record
        switch (user_investments.get(caller)) {
          case null {};
          case (?investment_ids) {
            for (investment_id in investment_ids.vals()) {
              switch (investment_records.get(investment_id)) {
                case null {};
                case (?investment) {
                  if (investment.vault_entry_id == entry_id) {
                    completeInvestment(investment_id);
                  };
                };
              };
            };
          };
        };

        // Log activity
        logActivity(caller, #Unlock, entry.amount, null);

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

    // Update all active investment records with potential dividends
    for ((investment_id, investment) in investment_records.entries()) {
      if (investment.status == #Active) {
        switch (vault_entries.get(investment.vault_entry_id)) {
          case null {};
          case (?entry) {
            if (entry.locked_at <= distribution.distributed_at) {
              let dividend_amount_float = Float.fromInt(entry.amount) * distribution.per_token_amount;
              let dividend_amount = Int.abs(Float.toInt(dividend_amount_float));
              updateInvestmentRecord(investment_id, dividend_amount, 0);
            };
          };
        };
      };
    };

    // Log activity
    logActivity(caller, #DividendDistribution, total_dividend_amount, null);

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

            // Update investment records with dividend claims
            switch (user_investments.get(caller)) {
              case null {};
              case (?investment_ids) {
                for (investment_id in investment_ids.vals()) {
                  switch (investment_records.get(investment_id)) {
                    case null {};
                    case (?investment) {
                      switch (vault_entries.get(investment.vault_entry_id)) {
                        case null {};
                        case (?entry) {
                          if (entry.locked_at <= distribution.distributed_at) {
                            let dividend_amount_float = Float.fromInt(entry.amount) * distribution.per_token_amount;
                            let dividend_amount = Int.abs(Float.toInt(dividend_amount_float));
                            updateInvestmentRecord(investment_id, 0, dividend_amount);
                          };
                        };
                      };
                    };
                  };
                };
              };
            };

            // Log activity
            logActivity(caller, #DividendClaim({ distribution_id = distribution_id }), total_dividend_amount, null);

            return #ok(total_dividend_amount);
          };
        };
      };
    };
  };

  // Investment Instrument Management Functions

  // Admin function to create a new investment instrument
  public shared (msg) func admin_create_investment_instrument(
    name : Text,
    description : Text,
    instrument_type : Types.InstrumentType,
    expected_apy : Float,
    risk_level : Nat,
    min_investment : Nat,
    max_investment : ?Nat,
    lock_period_days : ?Nat,
  ) : async Result.Result<Nat, Text> {
    let caller = msg.caller;
    if (not isAdmin(caller)) {
      return #err("Only admin can create investment instruments");
    };

    if (name == "") {
      return #err("Instrument name cannot be empty");
    };

    if (risk_level == 0 or risk_level > 10) {
      return #err("Risk level must be between 1 and 10");
    };

    if (expected_apy < 0.0) {
      return #err("Expected APY cannot be negative");
    };

    instrument_counter += 1;
    let instrument_id = instrument_counter;

    let instrument : Types.InvestmentInstrument = {
      id = instrument_id;
      name = name;
      description = description;
      instrument_type = instrument_type;
      expected_apy = expected_apy;
      risk_level = risk_level;
      min_investment = min_investment;
      max_investment = max_investment;
      lock_period_days = lock_period_days;
      status = #Active;
      total_invested = 0;
      total_yield_earned = 0;
      created_at = now();
      last_updated = now();
    };

    investment_instruments.put(instrument_id, instrument);

    #ok(instrument_id);
  };

  // Admin function to invest vault funds into an instrument
  public shared (msg) func admin_invest_in_instrument(instrument_id : Nat, amount : Nat) : async Result.Result<Nat, Text> {
    let caller = msg.caller;
    if (not isAdmin(caller)) {
      return #err("Only admin can invest in instruments");
    };

    switch (investment_instruments.get(instrument_id)) {
      case null {
        #err("Investment instrument not found");
      };
      case (?instrument) {
        if (instrument.status != #Active) {
          return #err("Investment instrument is not active");
        };

        if (amount < instrument.min_investment) {
          return #err("Investment amount is below minimum required");
        };

        switch (instrument.max_investment) {
          case (?max_amount) {
            if (amount > max_amount) {
              return #err("Investment amount exceeds maximum allowed");
            };
          };
          case null {};
        };

        let available_balance = getAvailableInvestmentBalance();
        if (amount > available_balance) {
          return #err("Insufficient available balance for investment");
        };

        // Create instrument investment record
        instrument_investment_counter += 1;
        let investment_id = instrument_investment_counter;

        let instrument_investment : Types.InstrumentInvestment = {
          id = investment_id;
          instrument_id = instrument_id;
          amount_invested = amount;
          current_value = amount; // Initially same as invested amount
          yield_earned = 0;
          invested_at = now();
          last_yield_update = now();
          status = #Active;
          exit_strategy = null;
        };

        instrument_investments.put(investment_id, instrument_investment);

        // Update instrument totals
        let updated_instrument : Types.InvestmentInstrument = {
          id = instrument.id;
          name = instrument.name;
          description = instrument.description;
          instrument_type = instrument.instrument_type;
          expected_apy = instrument.expected_apy;
          risk_level = instrument.risk_level;
          min_investment = instrument.min_investment;
          max_investment = instrument.max_investment;
          lock_period_days = instrument.lock_period_days;
          status = instrument.status;
          total_invested = instrument.total_invested + amount;
          total_yield_earned = instrument.total_yield_earned;
          created_at = instrument.created_at;
          last_updated = now();
        };

        investment_instruments.put(instrument_id, updated_instrument);

        #ok(investment_id);
      };
    };
  };

  // Admin function to update yield for an instrument investment
  public shared (msg) func admin_update_instrument_yield(investment_id : Nat, new_yield_amount : Nat, yield_type : Types.YieldType) : async Result.Result<(), Text> {
    let caller = msg.caller;
    if (not isAdmin(caller)) {
      return #err("Only admin can update instrument yields");
    };

    switch (instrument_investments.get(investment_id)) {
      case null {
        #err("Instrument investment not found");
      };
      case (?investment) {
        if (investment.status != #Active) {
          return #err("Investment is not active");
        };

        // Create yield distribution record
        yield_distribution_counter += 1;
        let yield_distribution : Types.YieldDistribution = {
          id = yield_distribution_counter;
          instrument_investment_id = investment_id;
          yield_amount = new_yield_amount;
          distribution_date = now();
          distribution_type = yield_type;
        };

        yield_distributions.put(yield_distribution_counter, yield_distribution);

        // Update investment record
        let updated_investment : Types.InstrumentInvestment = {
          id = investment.id;
          instrument_id = investment.instrument_id;
          amount_invested = investment.amount_invested;
          current_value = investment.current_value + new_yield_amount;
          yield_earned = investment.yield_earned + new_yield_amount;
          invested_at = investment.invested_at;
          last_yield_update = now();
          status = investment.status;
          exit_strategy = investment.exit_strategy;
        };

        instrument_investments.put(investment_id, updated_investment);

        // Update instrument totals
        switch (investment_instruments.get(investment.instrument_id)) {
          case null {};
          case (?instrument) {
            let updated_instrument : Types.InvestmentInstrument = {
              id = instrument.id;
              name = instrument.name;
              description = instrument.description;
              instrument_type = instrument.instrument_type;
              expected_apy = instrument.expected_apy;
              risk_level = instrument.risk_level;
              min_investment = instrument.min_investment;
              max_investment = instrument.max_investment;
              lock_period_days = instrument.lock_period_days;
              status = instrument.status;
              total_invested = instrument.total_invested;
              total_yield_earned = instrument.total_yield_earned + new_yield_amount;
              created_at = instrument.created_at;
              last_updated = now();
            };

            investment_instruments.put(investment.instrument_id, updated_instrument);
          };
        };

        // Add yield to admin balance for distribution
        let admin_balance = getBalance(admin_account);
        setBalance(admin_account, admin_balance + new_yield_amount);

        #ok(());
      };
    };
  };

  // Admin function to exit an instrument investment
  public shared (msg) func admin_exit_instrument_investment(investment_id : Nat, exit_strategy : Types.ExitStrategy) : async Result.Result<Nat, Text> {
    let caller = msg.caller;
    if (not isAdmin(caller)) {
      return #err("Only admin can exit instrument investments");
    };

    switch (instrument_investments.get(investment_id)) {
      case null {
        #err("Instrument investment not found");
      };
      case (?investment) {
        if (investment.status != #Active) {
          return #err("Investment is not active");
        };

        // For now, implement immediate exit only
        // In a real system, you'd implement different exit strategies
        let exit_amount = investment.current_value;

        // Update investment status
        let completed_investment : Types.InstrumentInvestment = {
          id = investment.id;
          instrument_id = investment.instrument_id;
          amount_invested = investment.amount_invested;
          current_value = investment.current_value;
          yield_earned = investment.yield_earned;
          invested_at = investment.invested_at;
          last_yield_update = now();
          status = #Completed;
          exit_strategy = ?exit_strategy;
        };

        instrument_investments.put(investment_id, completed_investment);

        // Update instrument totals
        switch (investment_instruments.get(investment.instrument_id)) {
          case null {};
          case (?instrument) {
            let updated_instrument : Types.InvestmentInstrument = {
              id = instrument.id;
              name = instrument.name;
              description = instrument.description;
              instrument_type = instrument.instrument_type;
              expected_apy = instrument.expected_apy;
              risk_level = instrument.risk_level;
              min_investment = instrument.min_investment;
              max_investment = instrument.max_investment;
              lock_period_days = instrument.lock_period_days;
              status = instrument.status;
              total_invested = if (instrument.total_invested >= investment.amount_invested) {
                instrument.total_invested - investment.amount_invested;
              } else { 0 };
              total_yield_earned = instrument.total_yield_earned;
              created_at = instrument.created_at;
              last_updated = now();
            };

            investment_instruments.put(investment.instrument_id, updated_instrument);
          };
        };

        #ok(exit_amount);
      };
    };
  };

  // Admin function to get vault investment summary
  public shared (msg) func admin_get_vault_investment_summary() : async Result.Result<Types.VaultInvestmentSummary, Text> {
    let caller = msg.caller;
    if (not isAdmin(caller)) {
      return #err("Only admin can access vault investment summary");
    };

    let admin_balance = getBalance(admin_account);
    var total_invested_in_instruments = 0;
    var total_yield_earned = 0;
    var active_instruments = 0;

    for ((_, investment) in instrument_investments.entries()) {
      if (investment.status == #Active) {
        total_invested_in_instruments += investment.amount_invested;
        total_yield_earned += investment.yield_earned;
      };
    };

    for ((_, instrument) in investment_instruments.entries()) {
      if (instrument.status == #Active and instrument.total_invested > 0) {
        active_instruments += 1;
      };
    };

    let summary : Types.VaultInvestmentSummary = {
      total_vault_balance = admin_balance;
      total_invested_in_instruments = total_invested_in_instruments;
      total_available_for_investment = getAvailableInvestmentBalance();
      total_yield_earned = total_yield_earned;
      weighted_average_apy = calculateWeightedAverageAPY();
      active_instruments = active_instruments;
      investment_diversity_score = calculateDiversityScore();
    };

    #ok(summary);
  };

  // Query functions for investment instruments
  public query func get_all_investment_instruments() : async [Types.InvestmentInstrument] {
    Iter.toArray(investment_instruments.vals());
  };

  public query func get_active_investment_instruments() : async [Types.InvestmentInstrument] {
    Array.filter<Types.InvestmentInstrument>(
      Iter.toArray(investment_instruments.vals()),
      func(instrument) { instrument.status == #Active },
    );
  };

  public query func get_instrument_investments() : async [Types.InstrumentInvestment] {
    Iter.toArray(instrument_investments.vals());
  };

  public query func get_yield_distributions() : async [Types.YieldDistribution] {
    Iter.toArray(yield_distributions.vals());
  };

  // Investment Management and Reporting Functions

  // Admin function to get comprehensive investment report
  public shared (msg) func admin_get_investment_report() : async Result.Result<Types.AdminInvestmentReport, Text> {
    let caller = msg.caller;
    if (not isAdmin(caller)) {
      return #err("Only admin can access investment reports");
    };

    // Calculate platform summary
    var total_investments = 0;
    var total_amount_invested = 0;
    var total_current_value = 0;
    var total_dividends_earned = 0;
    var total_dividends_claimed = 0;
    var active_investments = 0;
    var completed_investments = 0;
    var total_roi = 0.0;

    for ((_, investment) in investment_records.entries()) {
      total_investments += 1;
      total_amount_invested += investment.initial_amount;
      total_current_value += investment.current_value;
      total_dividends_earned += investment.total_dividends_earned;
      total_dividends_claimed += investment.total_dividends_claimed;
      total_roi += investment.roi_percentage;

      switch (investment.status) {
        case (#Active) { active_investments += 1 };
        case (#Completed) { completed_investments += 1 };
        case (#Cancelled) {};
      };
    };

    let average_roi = if (total_investments > 0) {
      total_roi / Float.fromInt(total_investments);
    } else { 0.0 };

    let platform_summary : Types.InvestmentSummary = {
      total_investments = total_investments;
      total_amount_invested = total_amount_invested;
      total_current_value = total_current_value;
      total_dividends_earned = total_dividends_earned;
      total_dividends_claimed = total_dividends_claimed;
      average_roi = average_roi;
      active_investments = active_investments;
      completed_investments = completed_investments;
    };

    // Get top investors
    var user_totals : [(Principal, Nat)] = [];
    for ((user, investment_ids) in user_investments.entries()) {
      var user_total = 0;
      for (investment_id in investment_ids.vals()) {
        switch (investment_records.get(investment_id)) {
          case null {};
          case (?investment) {
            user_total += investment.initial_amount;
          };
        };
      };
      if (user_total > 0) {
        user_totals := Array.append(user_totals, [(user, user_total)]);
      };
    };

    // Sort top investors by amount (simple bubble sort for small arrays)
    let sorted_investors = Array.sort(
      user_totals,
      func(a : (Principal, Nat), b : (Principal, Nat)) : {
        #less;
        #equal;
        #greater;
      } {
        if (a.1 > b.1) { #less } else if (a.1 < b.1) { #greater } else {
          #equal;
        };
      },
    );

    let top_investors = if (sorted_investors.size() > 10) {
      Array.subArray(sorted_investors, 0, 10);
    } else {
      sorted_investors;
    };

    // Get product performance
    var product_performance : [(Nat, Text, Nat, Nat)] = [];
    for ((product_id, product) in products.entries()) {
      var product_total_locked = 0;
      var product_user_count = 0;
      var users_set : [Principal] = [];

      for ((_, investment) in investment_records.entries()) {
        switch (vault_entries.get(investment.vault_entry_id)) {
          case null {};
          case (?entry) {
            if (entry.product_id == product_id and investment.status == #Active) {
              product_total_locked += investment.initial_amount;
              let user_exists = Array.find<Principal>(users_set, func(u) { Principal.equal(u, investment.user) });
              if (user_exists == null) {
                users_set := Array.append(users_set, [investment.user]);
                product_user_count += 1;
              };
            };
          };
        };
      };

      if (product_total_locked > 0) {
        product_performance := Array.append(product_performance, [(product_id, product.name, product_total_locked, product_user_count)]);
      };
    };

    // Get recent activities (last 50)
    let all_activities = Iter.toArray(investment_activities.vals());
    let sorted_activities = Array.sort(
      all_activities,
      func(a : Types.InvestmentActivity, b : Types.InvestmentActivity) : {
        #less;
        #equal;
        #greater;
      } {
        if (a.timestamp > b.timestamp) { #less } else if (a.timestamp < b.timestamp) {
          #greater;
        } else { #equal };
      },
    );

    let recent_activities = if (sorted_activities.size() > 50) {
      Array.subArray(sorted_activities, 0, 50);
    } else {
      sorted_activities;
    };

    let report : Types.AdminInvestmentReport = {
      total_users = user_investments.size();
      platform_summary = platform_summary;
      top_investors = top_investors;
      product_performance = product_performance;
      recent_activities = recent_activities;
    };

    #ok(report);
  };

  // User function to get personal investment report
  public shared (msg) func get_user_investment_report() : async Result.Result<Types.UserInvestmentReport, Text> {
    let caller = msg.caller;

    switch (user_investments.get(caller)) {
      case null {
        // User has no investments, return empty report
        let empty_summary : Types.InvestmentSummary = {
          total_investments = 0;
          total_amount_invested = 0;
          total_current_value = 0;
          total_dividends_earned = 0;
          total_dividends_claimed = 0;
          average_roi = 0.0;
          active_investments = 0;
          completed_investments = 0;
        };

        let empty_report : Types.UserInvestmentReport = {
          user = caller;
          summary = empty_summary;
          investments = [];
          unclaimed_dividends = [];
        };

        #ok(empty_report);
      };
      case (?investment_ids) {
        // Calculate user summary
        var total_investments = 0;
        var total_amount_invested = 0;
        var total_current_value = 0;
        var total_dividends_earned = 0;
        var total_dividends_claimed = 0;
        var active_investments = 0;
        var completed_investments = 0;
        var total_roi = 0.0;
        var user_investment_records : [Types.InvestmentRecord] = [];

        for (investment_id in investment_ids.vals()) {
          switch (investment_records.get(investment_id)) {
            case null {};
            case (?investment) {
              total_investments += 1;
              total_amount_invested += investment.initial_amount;
              total_current_value += investment.current_value;
              total_dividends_earned += investment.total_dividends_earned;
              total_dividends_claimed += investment.total_dividends_claimed;
              total_roi += investment.roi_percentage;

              switch (investment.status) {
                case (#Active) { active_investments += 1 };
                case (#Completed) { completed_investments += 1 };
                case (#Cancelled) {};
              };

              user_investment_records := Array.append(user_investment_records, [investment]);
            };
          };
        };

        let average_roi = if (total_investments > 0) {
          total_roi / Float.fromInt(total_investments);
        } else { 0.0 };

        let user_summary : Types.InvestmentSummary = {
          total_investments = total_investments;
          total_amount_invested = total_amount_invested;
          total_current_value = total_current_value;
          total_dividends_earned = total_dividends_earned;
          total_dividends_claimed = total_dividends_claimed;
          average_roi = average_roi;
          active_investments = active_investments;
          completed_investments = completed_investments;
        };

        // Get unclaimed dividends
        let unclaimed_dividends = await get_unclaimed_dividends(caller);

        let report : Types.UserInvestmentReport = {
          user = caller;
          summary = user_summary;
          investments = user_investment_records;
          unclaimed_dividends = unclaimed_dividends;
        };

        #ok(report);
      };
    };
  };

  // Admin function to get specific user's investment report
  public shared (msg) func admin_get_user_investment_report(user : Principal) : async Result.Result<Types.UserInvestmentReport, Text> {
    let caller = msg.caller;
    if (not isAdmin(caller)) {
      return #err("Only admin can access user investment reports");
    };

    switch (user_investments.get(user)) {
      case null {
        let empty_summary : Types.InvestmentSummary = {
          total_investments = 0;
          total_amount_invested = 0;
          total_current_value = 0;
          total_dividends_earned = 0;
          total_dividends_claimed = 0;
          average_roi = 0.0;
          active_investments = 0;
          completed_investments = 0;
        };

        let empty_report : Types.UserInvestmentReport = {
          user = user;
          summary = empty_summary;
          investments = [];
          unclaimed_dividends = [];
        };

        #ok(empty_report);
      };
      case (?investment_ids) {
        var total_investments = 0;
        var total_amount_invested = 0;
        var total_current_value = 0;
        var total_dividends_earned = 0;
        var total_dividends_claimed = 0;
        var active_investments = 0;
        var completed_investments = 0;
        var total_roi = 0.0;
        var user_investment_records : [Types.InvestmentRecord] = [];

        for (investment_id in investment_ids.vals()) {
          switch (investment_records.get(investment_id)) {
            case null {};
            case (?investment) {
              total_investments += 1;
              total_amount_invested += investment.initial_amount;
              total_current_value += investment.current_value;
              total_dividends_earned += investment.total_dividends_earned;
              total_dividends_claimed += investment.total_dividends_claimed;
              total_roi += investment.roi_percentage;

              switch (investment.status) {
                case (#Active) { active_investments += 1 };
                case (#Completed) { completed_investments += 1 };
                case (#Cancelled) {};
              };

              user_investment_records := Array.append(user_investment_records, [investment]);
            };
          };
        };

        let average_roi = if (total_investments > 0) {
          total_roi / Float.fromInt(total_investments);
        } else { 0.0 };

        let user_summary : Types.InvestmentSummary = {
          total_investments = total_investments;
          total_amount_invested = total_amount_invested;
          total_current_value = total_current_value;
          total_dividends_earned = total_dividends_earned;
          total_dividends_claimed = total_dividends_claimed;
          average_roi = average_roi;
          active_investments = active_investments;
          completed_investments = completed_investments;
        };

        let unclaimed_dividends = await get_unclaimed_dividends(user);

        let report : Types.UserInvestmentReport = {
          user = user;
          summary = user_summary;
          investments = user_investment_records;
          unclaimed_dividends = unclaimed_dividends;
        };

        #ok(report);
      };
    };
  };

  // Admin function to manage investments (force unlock, etc.)
  public shared (msg) func admin_manage_investment(investment_id : Nat, action : Text) : async Result.Result<Text, Text> {
    let caller = msg.caller;
    if (not isAdmin(caller)) {
      return #err("Only admin can manage investments");
    };

    switch (investment_records.get(investment_id)) {
      case null {
        #err("Investment record not found");
      };
      case (?investment) {
        switch (action) {
          case ("cancel") {
            // Cancel the investment
            let cancelled_record : Types.InvestmentRecord = {
              id = investment.id;
              user = investment.user;
              vault_entry_id = investment.vault_entry_id;
              initial_amount = investment.initial_amount;
              current_value = investment.current_value;
              total_dividends_earned = investment.total_dividends_earned;
              total_dividends_claimed = investment.total_dividends_claimed;
              roi_percentage = investment.roi_percentage;
              created_at = investment.created_at;
              last_updated = now();
              status = #Cancelled;
              product_name = investment.product_name;
              duration_type = investment.duration_type;
            };

            investment_records.put(investment_id, cancelled_record);
            #ok("Investment cancelled successfully");
          };
          case ("force_complete") {
            completeInvestment(investment_id);
            #ok("Investment force completed successfully");
          };
          case _ {
            #err("Unknown action. Available actions: cancel, force_complete");
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
