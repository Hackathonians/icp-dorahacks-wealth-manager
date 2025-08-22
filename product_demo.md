# Product-Based Vault System Demo

## Overview

The vault system has been transformed into a product-based system where:

- Admins can create products with names, descriptions, and available lock durations
- Users can choose from available products and select their preferred lock duration
- Each vault entry is now associated with a specific product

## Default Products Created

### Product 1: "Flexible Savings"

- **Description**: Flexible savings product with multiple duration options including instant withdrawal
- **Available Durations**:
  - Flexible (withdraw anytime)
  - 1 hour (60 minutes)
  - 1 day (1440 minutes)
  - 1 month (43200 minutes)

### Product 2: "Quick Staking"

- **Description**: Short-term staking product for active traders
- **Available Durations**:
  - 15 minutes
  - 1 hour (60 minutes)
  - 1 week (10080 minutes)

## New Functions Available

### Admin Functions

1. `admin_create_product(name, description, available_durations)` - Create new products
2. `admin_update_product(product_id, name?, description?, available_durations?, is_active?)` - Update existing products
3. `admin_delete_product(product_id)` - Delete products

### User Functions

1. `vault_lock_tokens(amount, product_id, selected_duration)` - Lock tokens using a specific product and duration
2. `vault_unlock_tokens(entry_id)` - Unlock tokens (unchanged)

### Query Functions

1. `get_all_products()` - Get all products (including inactive)
2. `get_active_products()` - Get only active products
3. `get_product(product_id)` - Get specific product details
4. `get_vault_info()` - Updated to include product statistics
5. `get_user_vault_entries(user)` - Updated to include product_id and selected_duration

## Example Usage

### Creating a New Product (Admin Only)

```motoko
// Create a long-term savings product
admin_create_product(
  "Long-term Savings",
  "High-yield savings for long-term investors",
  [#Minutes(43200), #Minutes(129600), #Minutes(525600)] // 1 month, 3 months, 1 year
)
```

### Locking Tokens with a Product

```motoko
// Lock 1000 tokens in "Flexible Savings" product with 1-day duration
vault_lock_tokens(1000, 1, #Minutes(1440))

// Lock 500 tokens in "Quick Staking" product with flexible duration
vault_lock_tokens(500, 2, #Flexible)
```

### Querying Products

```motoko
// Get all active products
get_active_products()

// Get specific product details
get_product(1)
```

## Migration Notes

- Existing vault entries will need to be migrated to include product references
- The old `vault_lock_tokens` function signature has changed - it now requires `product_id` and `selected_duration` parameters
- All query functions now return additional product-related information
