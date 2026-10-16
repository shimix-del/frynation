-- ============================================================
--  NANI FRYS POS - Full Database Schema
--  Database: nani_fry_db
--  System: Multi-Branch Hotel, Restaurant & Food Joint POS
--  Generated: 2026-10-07
-- ============================================================

SET NAMES utf8mb4;
SET time_zone = '+03:00';    -- EAT (East Africa Time)
SET foreign_key_checks = 0;

-- Use the existing database
USE nani_fry_db;

-- ============================================================
--  TABLE: branches
--  Multi-branch support (Migadini Main, Express, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS `branches` (
  `id`             VARCHAR(36)   NOT NULL,
  `name`           VARCHAR(120)  NOT NULL,
  `code`           VARCHAR(20)   NOT NULL,
  `address`        VARCHAR(255)  DEFAULT NULL,
  `phone`          VARCHAR(30)   DEFAULT NULL,
  `till_number`    VARCHAR(30)   DEFAULT NULL,       -- M-PESA Till Number
  `paybill_number` VARCHAR(30)   DEFAULT NULL,       -- M-PESA Paybill
  `is_active`      TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_branch_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Physical/virtual branches of Nani Frys';

-- ============================================================
--  TABLE: users
--  Roles: OWNER | MANAGER | CASHIER
--  Auth: Email+Password (admin) or 4-digit PIN (cashier POS)
-- ============================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id`            VARCHAR(36)  NOT NULL,
  `branch_id`     VARCHAR(36)  DEFAULT NULL,         -- NULL = Owner (all branches)
  `name`          VARCHAR(100) NOT NULL,
  `email`         VARCHAR(120) NOT NULL,
  `phone`         VARCHAR(30)  DEFAULT NULL,
  `role`          ENUM('OWNER','MANAGER','CASHIER') NOT NULL DEFAULT 'CASHIER',
  `pin_code`      CHAR(4)      NOT NULL,             -- 4-digit rapid POS login PIN
  `password_hash` VARCHAR(255) NOT NULL,
  `is_active`     TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_email` (`email`),
  KEY `idx_user_branch` (`branch_id`),
  KEY `idx_user_pin` (`pin_code`),
  CONSTRAINT `fk_user_branch`
    FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Staff accounts — Owner, Manager, Cashier';

-- ============================================================
--  TABLE: categories
--  Menu categories (Fast Foods, Kuku & Meat, Drinks, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS `categories` (
  `id`         VARCHAR(36)  NOT NULL,
  `name`       VARCHAR(80)  NOT NULL,
  `code`       VARCHAR(50)  NOT NULL,
  `sort_order` INT          NOT NULL DEFAULT 0,
  `icon`       VARCHAR(60)  DEFAULT NULL,  -- Lucide icon name e.g. 'Flame'
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_category_name` (`name`),
  UNIQUE KEY `uq_category_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Menu categories shown in POS category bar';

-- ============================================================
--  TABLE: menu_items
--  Core menu: Chips, Pilau, Biryani, Kuku Choma, Drinks…
-- ============================================================
CREATE TABLE IF NOT EXISTS `menu_items` (
  `id`           VARCHAR(36)    NOT NULL,
  `category_id`  VARCHAR(36)    NOT NULL,
  `name`         VARCHAR(150)   NOT NULL,
  `description`  TEXT           DEFAULT NULL,
  `base_price`   DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  `cost_price`   DECIMAL(10,2)  NOT NULL DEFAULT 0.00,  -- COGS per item
  `image_url`    VARCHAR(500)   DEFAULT NULL,
  `is_available` TINYINT(1)     NOT NULL DEFAULT 1,
  `has_variants` TINYINT(1)     NOT NULL DEFAULT 0,     -- 1 = show variant selector
  `created_at`   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_menu_category` (`category_id`),
  KEY `idx_menu_available` (`is_available`),
  CONSTRAINT `fk_menu_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='All sellable menu items';

-- ============================================================
--  TABLE: menu_item_variants
--  Size/portion variants: 1/4 Kuku, 1/2 Kuku, Full Kuku…
-- ============================================================
CREATE TABLE IF NOT EXISTS `menu_item_variants` (
  `id`           VARCHAR(36)    NOT NULL,
  `menu_item_id` VARCHAR(36)    NOT NULL,
  `name`         VARCHAR(120)   NOT NULL,  -- "1/4 Chicken", "Plain Pilau", "500ml"
  `price`        DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  `cost_price`   DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  `is_available` TINYINT(1)     NOT NULL DEFAULT 1,
  `created_at`   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_variant_menu_item` (`menu_item_id`),
  CONSTRAINT `fk_variant_menu_item`
    FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Size / portion variants for menu items';

-- ============================================================
--  TABLE: stock_items
--  Inventory: Raw ingredients & packaged units per branch
-- ============================================================
CREATE TABLE IF NOT EXISTS `stock_items` (
  `id`               VARCHAR(36)    NOT NULL,
  `branch_id`        VARCHAR(36)    NOT NULL,
  `name`             VARCHAR(150)   NOT NULL,   -- "Potatoes (Shangi)", "Coca-Cola 300ml"
  `sku`              VARCHAR(60)    DEFAULT NULL,
  `type`             ENUM('RAW_INGREDIENT','PACKAGED_UNIT') NOT NULL DEFAULT 'RAW_INGREDIENT',
  `unit`             VARCHAR(30)    NOT NULL DEFAULT 'kg',  -- kg, litre, piece, bottle, crate, portion
  `current_stock`    DECIMAL(12,3)  NOT NULL DEFAULT 0.000,
  `min_stock_alert`  DECIMAL(12,3)  NOT NULL DEFAULT 5.000, -- Low-stock threshold
  `unit_cost`        DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  `supplier_name`    VARCHAR(120)   DEFAULT NULL,
  `created_at`       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_stock_branch` (`branch_id`),
  KEY `idx_stock_type` (`type`),
  CONSTRAINT `fk_stock_branch`
    FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Inventory items (raw ingredients & packaged units) per branch';

-- ============================================================
--  TABLE: menu_item_recipes  (Bill of Materials / BOM)
--  Links menu items/variants → stock items with quantities
-- ============================================================
CREATE TABLE IF NOT EXISTS `menu_item_recipes` (
  `id`                VARCHAR(36)   NOT NULL,
  `menu_item_id`      VARCHAR(36)   NOT NULL,
  `variant_id`        VARCHAR(36)   DEFAULT NULL,  -- NULL = applies to base item
  `stock_item_id`     VARCHAR(36)   NOT NULL,
  `quantity_required` DECIMAL(10,4) NOT NULL,      -- e.g. 0.350 kg of potatoes per chips plate
  `created_at`        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_recipe_menu_item` (`menu_item_id`),
  KEY `idx_recipe_variant` (`variant_id`),
  KEY `idx_recipe_stock_item` (`stock_item_id`),
  CONSTRAINT `fk_recipe_menu_item`
    FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_recipe_variant`
    FOREIGN KEY (`variant_id`) REFERENCES `menu_item_variants` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_recipe_stock_item`
    FOREIGN KEY (`stock_item_id`) REFERENCES `stock_items` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Recipe / Bill-of-Materials: maps menu items to stock ingredients';

-- ============================================================
--  TABLE: shifts
--  Cash float management per cashier per branch
-- ============================================================
CREATE TABLE IF NOT EXISTS `shifts` (
  `id`                    VARCHAR(36)    NOT NULL,
  `branch_id`             VARCHAR(36)    NOT NULL,
  `cashier_id`            VARCHAR(36)    NOT NULL,
  `opening_float`         DECIMAL(12,2)  NOT NULL DEFAULT 0.00,  -- Cash float at shift open
  `closing_cash_actual`   DECIMAL(12,2)  DEFAULT NULL,           -- Physically counted cash
  `closing_cash_expected` DECIMAL(12,2)  DEFAULT NULL,           -- System-computed expected
  `variance`              DECIMAL(12,2)  DEFAULT NULL,           -- Actual - Expected
  `total_cash_sales`      DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  `total_mpesa_sales`     DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  `total_card_sales`      DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  `total_expenses_paid`   DECIMAL(12,2)  NOT NULL DEFAULT 0.00,  -- Expenses during shift
  `status`                ENUM('OPEN','CLOSED') NOT NULL DEFAULT 'OPEN',
  `opened_at`             DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `closed_at`             DATETIME       DEFAULT NULL,
  `notes`                 TEXT           DEFAULT NULL,
  `created_at`            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_shift_branch` (`branch_id`),
  KEY `idx_shift_cashier` (`cashier_id`),
  KEY `idx_shift_status` (`status`),
  CONSTRAINT `fk_shift_branch`
    FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_shift_cashier`
    FOREIGN KEY (`cashier_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Cashier shifts — opening float, sales totals, Z-Report data';

-- ============================================================
--  TABLE: cash_movements
--  Float-in, Cash Drop, Payouts recorded during a shift
-- ============================================================
CREATE TABLE IF NOT EXISTS `cash_movements` (
  `id`             VARCHAR(36)   NOT NULL,
  `shift_id`       VARCHAR(36)   NOT NULL,
  `branch_id`      VARCHAR(36)   NOT NULL,
  `type`           ENUM('FLOAT_IN','CASH_DROP','PAYOUT') NOT NULL,
  `amount`         DECIMAL(12,2) NOT NULL,
  `reason`         VARCHAR(255)  NOT NULL,
  `authorized_by`  VARCHAR(100)  DEFAULT NULL,  -- Manager / Owner name
  `created_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cm_shift` (`shift_id`),
  KEY `idx_cm_branch` (`branch_id`),
  CONSTRAINT `fk_cm_shift`
    FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cm_branch`
    FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Cash float movements: float-ins, cash drops, payouts within a shift';

-- ============================================================
--  TABLE: orders
--  POS sales transactions — Dine In, Takeaway, Delivery
-- ============================================================
CREATE TABLE IF NOT EXISTS `orders` (
  `id`               VARCHAR(36)    NOT NULL,
  `order_number`     VARCHAR(40)    NOT NULL,        -- e.g. ORD-20261007-1042
  `branch_id`        VARCHAR(36)    NOT NULL,
  `cashier_id`       VARCHAR(36)    NOT NULL,
  `shift_id`         VARCHAR(36)    DEFAULT NULL,
  `order_type`       ENUM('DINE_IN','TAKEAWAY','DELIVERY') NOT NULL DEFAULT 'DINE_IN',
  `table_number`     VARCHAR(20)    DEFAULT NULL,
  `customer_name`    VARCHAR(100)   DEFAULT NULL,
  `customer_phone`   VARCHAR(30)    DEFAULT NULL,
  `status`           ENUM('COMPLETED','HELD','CANCELLED') NOT NULL DEFAULT 'COMPLETED',
  `subtotal`         DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  `discount_amount`  DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  `discount_reason`  VARCHAR(200)   DEFAULT NULL,
  `tax_amount`       DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  `total_amount`     DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  `notes`            TEXT           DEFAULT NULL,
  `is_offline_synced` TINYINT(1)   NOT NULL DEFAULT 0,  -- Offline-first sync flag
  `created_at`       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_order_number` (`order_number`),
  KEY `idx_order_branch` (`branch_id`),
  KEY `idx_order_cashier` (`cashier_id`),
  KEY `idx_order_shift` (`shift_id`),
  KEY `idx_order_status` (`status`),
  KEY `idx_order_created` (`created_at`),
  CONSTRAINT `fk_order_branch`
    FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_order_cashier`
    FOREIGN KEY (`cashier_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE,
  CONSTRAINT `fk_order_shift`
    FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='POS sale orders: dine-in, takeaway, delivery; supports held & offline orders';

-- ============================================================
--  TABLE: order_items
--  Line items within each order (menu item + variant + qty)
-- ============================================================
CREATE TABLE IF NOT EXISTS `order_items` (
  `id`           VARCHAR(36)    NOT NULL,
  `order_id`     VARCHAR(36)    NOT NULL,
  `menu_item_id` VARCHAR(36)    NOT NULL,
  `variant_id`   VARCHAR(36)    DEFAULT NULL,
  `item_name`    VARCHAR(150)   NOT NULL,   -- Snapshot at time of sale
  `variant_name` VARCHAR(120)   DEFAULT NULL,
  `quantity`     INT            NOT NULL DEFAULT 1,
  `unit_price`   DECIMAL(10,2)  NOT NULL,
  `unit_cost`    DECIMAL(10,2)  NOT NULL DEFAULT 0.00,  -- For COGS tracking
  `total_price`  DECIMAL(12,2)  NOT NULL,
  `notes`        VARCHAR(255)   DEFAULT NULL,           -- e.g. "no chili"
  `created_at`   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_oi_order` (`order_id`),
  KEY `idx_oi_menu_item` (`menu_item_id`),
  CONSTRAINT `fk_oi_order`
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_oi_menu_item`
    FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`id`)
    ON UPDATE CASCADE,
  CONSTRAINT `fk_oi_variant`
    FOREIGN KEY (`variant_id`) REFERENCES `menu_item_variants` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Line items of each order';

-- ============================================================
--  TABLE: payments
--  Payment records: Cash, M-PESA, Card, Split
-- ============================================================
CREATE TABLE IF NOT EXISTS `payments` (
  `id`              VARCHAR(36)    NOT NULL,
  `order_id`        VARCHAR(36)    NOT NULL,
  `branch_id`       VARCHAR(36)    NOT NULL,
  `amount`          DECIMAL(12,2)  NOT NULL,
  `payment_method`  ENUM('CASH','MPESA','CARD','SPLIT') NOT NULL DEFAULT 'CASH',
  `mpesa_code`      VARCHAR(20)    DEFAULT NULL,  -- e.g. QHK4928XLA
  `card_ref`        VARCHAR(60)    DEFAULT NULL,
  `cash_tendered`   DECIMAL(12,2)  DEFAULT NULL,
  `change_amount`   DECIMAL(12,2)  DEFAULT NULL,
  `status`          VARCHAR(20)    NOT NULL DEFAULT 'COMPLETED',
  `created_at`      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pay_order` (`order_id`),
  KEY `idx_pay_branch` (`branch_id`),
  KEY `idx_pay_method` (`payment_method`),
  CONSTRAINT `fk_pay_order`
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pay_branch`
    FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Payment records: Cash, M-PESA, Card, Split payments';

-- ============================================================
--  TABLE: expenses
--  Daily operational expenses per branch/shift
-- ============================================================
CREATE TABLE IF NOT EXISTS `expenses` (
  `id`              VARCHAR(36)    NOT NULL,
  `branch_id`       VARCHAR(36)    NOT NULL,
  `shift_id`        VARCHAR(36)    DEFAULT NULL,
  `category`        ENUM(
                      'MARKET_PRODUCE',
                      'GAS_CHARCOAL',
                      'COOKING_OIL',
                      'DAILY_WAGES',
                      'UTILITIES',
                      'REPAIRS',
                      'TRANSPORT_BODA',
                      'OTHER'
                    ) NOT NULL,
  `amount`          DECIMAL(12,2)  NOT NULL,
  `description`     VARCHAR(500)   NOT NULL,
  `paid_to`         VARCHAR(120)   DEFAULT NULL,   -- Vendor / supplier name
  `payment_source`  ENUM('CASH_DRAWER','BANK_MPESA') NOT NULL DEFAULT 'CASH_DRAWER',
  `receipt_number`  VARCHAR(60)    DEFAULT NULL,
  `created_at`      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_exp_branch` (`branch_id`),
  KEY `idx_exp_shift` (`shift_id`),
  KEY `idx_exp_category` (`category`),
  KEY `idx_exp_created` (`created_at`),
  CONSTRAINT `fk_exp_branch`
    FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_exp_shift`
    FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Daily operational expenses: produce, gas, wages, utilities, etc.';

-- ============================================================
--  TABLE: stock_transfers
--  Inter-branch stock transfers
-- ============================================================
CREATE TABLE IF NOT EXISTS `stock_transfers` (
  `id`               VARCHAR(36)    NOT NULL,
  `source_branch_id` VARCHAR(36)    NOT NULL,
  `dest_branch_id`   VARCHAR(36)    NOT NULL,
  `stock_item_id`    VARCHAR(36)    NOT NULL,
  `quantity`         DECIMAL(12,3)  NOT NULL,
  `status`           ENUM('PENDING','DISPATCHED','RECEIVED') NOT NULL DEFAULT 'PENDING',
  `requested_by`     VARCHAR(100)   DEFAULT NULL,   -- Name of requesting staff
  `notes`            TEXT           DEFAULT NULL,
  `created_at`       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_st_source` (`source_branch_id`),
  KEY `idx_st_dest` (`dest_branch_id`),
  KEY `idx_st_stock_item` (`stock_item_id`),
  KEY `idx_st_status` (`status`),
  CONSTRAINT `fk_st_source`
    FOREIGN KEY (`source_branch_id`) REFERENCES `branches` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_st_dest`
    FOREIGN KEY (`dest_branch_id`) REFERENCES `branches` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_st_stock_item`
    FOREIGN KEY (`stock_item_id`) REFERENCES `stock_items` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Inter-branch stock transfer requests and dispatches';

-- ============================================================
--  TABLE: stock_audits
--  Physical stock counts / reconciliation per branch
-- ============================================================
CREATE TABLE IF NOT EXISTS `stock_audits` (
  `id`            VARCHAR(36)    NOT NULL,
  `branch_id`     VARCHAR(36)    NOT NULL,
  `stock_item_id` VARCHAR(36)    NOT NULL,
  `system_stock`  DECIMAL(12,3)  NOT NULL,         -- System-reported before audit
  `counted_stock` DECIMAL(12,3)  NOT NULL,         -- Physically counted
  `variance`      DECIMAL(12,3)  NOT NULL,         -- counted - system
  `reason`        ENUM(
                    'RECONCILIATION',
                    'SPOILAGE',
                    'WASTAGE',
                    'THEFT',
                    'RECIPE_ADJUSTMENT',
                    'OTHER'
                  ) NOT NULL DEFAULT 'RECONCILIATION',
  `audited_by`    VARCHAR(100)   DEFAULT NULL,
  `notes`         TEXT           DEFAULT NULL,
  `created_at`    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sa_branch` (`branch_id`),
  KEY `idx_sa_stock_item` (`stock_item_id`),
  KEY `idx_sa_created` (`created_at`),
  CONSTRAINT `fk_sa_branch`
    FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sa_stock_item`
    FOREIGN KEY (`stock_item_id`) REFERENCES `stock_items` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Stock audit / physical count reconciliation records';

-- ============================================================
--  TABLE: restock_logs
--  Records every time stock is added/purchased (restocking)
-- ============================================================
CREATE TABLE IF NOT EXISTS `restock_logs` (
  `id`             VARCHAR(36)    NOT NULL,
  `stock_item_id`  VARCHAR(36)    NOT NULL,
  `branch_id`      VARCHAR(36)    NOT NULL,
  `quantity_added` DECIMAL(12,3)  NOT NULL,
  `unit_cost`      DECIMAL(10,2)  DEFAULT NULL,    -- Unit cost at time of restock
  `supplier_name`  VARCHAR(120)   DEFAULT NULL,
  `notes`          TEXT           DEFAULT NULL,
  `restocked_by`   VARCHAR(100)   DEFAULT NULL,
  `created_at`     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rl_stock_item` (`stock_item_id`),
  KEY `idx_rl_branch` (`branch_id`),
  CONSTRAINT `fk_rl_stock_item`
    FOREIGN KEY (`stock_item_id`) REFERENCES `stock_items` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_rl_branch`
    FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Restocking / purchasing log for inventory items';

SET foreign_key_checks = 1;

-- ============================================================
--  SEED DATA — Initial branches
-- ============================================================
INSERT IGNORE INTO `branches` (`id`, `name`, `code`, `address`, `phone`, `till_number`, `paybill_number`, `is_active`) VALUES
('branch-migadini', 'Migadini Main Shop', 'MGD01', 'Migadini, Mombasa', '0143285625', NULL, '247247', 1),
('branch-exp2',     'Branch 2 - Express', 'EXP02', 'Express Outlet',    '0143285625', NULL, '247247', 1);

-- ============================================================
--  SEED DATA — Initial users (Owner + Manager + Cashiers)
--  NOTE: Replace password_hash with real bcrypt hashes in production
-- ============================================================
INSERT IGNORE INTO `users` (`id`, `branch_id`, `name`, `email`, `role`, `pin_code`, `password_hash`, `is_active`) VALUES
('user-robina',   NULL,             'Robina',    'admin@nanifrys.co.ke',    'OWNER',   '9878', '$2b$10$placeholder_owner_hash',   1),
('user-manager',  'branch-migadini','Manager',   'manager@nanifrys.co.ke',  'MANAGER', '5609', '$2b$10$placeholder_manager_hash', 1),
('user-cashier1', 'branch-migadini','Cashier 1', 'cashier1@nanifrys.co.ke', 'CASHIER', '1298', '$2b$10$placeholder_cashier1_hash',1),
('user-cashier2', 'branch-migadini','Cashier 2', 'cashier2@nanifrys.co.ke', 'CASHIER', '1349', '$2b$10$placeholder_cashier2_hash',1),
('user-cashier3', 'branch-migadini','Cashier 3', 'cashier3@nanifrys.co.ke', 'CASHIER', '3456', '$2b$10$placeholder_cashier3_hash',1),
('user-cashier4', 'branch-migadini','Cashier 4', 'cashier4@nanifrys.co.ke', 'CASHIER', '4567', '$2b$10$placeholder_cashier4_hash',1);

-- ============================================================
--  SEED DATA — Menu categories
-- ============================================================
INSERT IGNORE INTO `categories` (`id`, `name`, `code`, `sort_order`, `icon`) VALUES
('cat-fast-food', 'Fast Foods & Chips',      'fast_foods',   1, 'Flame'),
('cat-meat',      'Kuku & Meat Dishes',      'meat_chicken', 2, 'Drumstick'),
('cat-rice',      'Swahili Cooked Meals',    'cooked_meals', 3, 'Soup'),
('cat-drinks',    'Drinks & Juices',         'drinks_juices',4, 'CupSoda'),
('cat-snacks',    'Snacks & Pasua Sides',    'snacks_sides', 5, 'Cookie');

-- ============================================================
--  SEED DATA — Menu items
-- ============================================================
INSERT IGNORE INTO `menu_items` (`id`, `category_id`, `name`, `description`, `base_price`, `cost_price`, `image_url`, `is_available`, `has_variants`) VALUES
('item-chips',        'cat-fast-food', 'Chips',         'Crispy golden potato chips',                                           100.00, 45.00,  './images/chips.jpg', 1, 0),
('item-chips-mayai',  'cat-fast-food', 'Chips Mayai',   'Crispy chips and eggs bound in double-egg omelette (Zege)',            180.00, 80.00,  './images/chips-mayai.jpg', 1, 0),
('item-chicken',      'cat-meat',      'Chicken',       'Seasoned golden deep-fried or grilled chicken portion',                250.00, 120.00, 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=500&q=80', 1, 0),
('item-pilau',        'cat-rice',      'Pilau',         'Authentic coastal Swahili spiced fragrant basmati pilau',              250.00, 110.00, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80', 1, 0),
('item-biriani',      'cat-rice',      'Biriani',       'Aromatic layered coastal Biriani rice with rich savory sauce',         350.00, 150.00, 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&q=80', 1, 0),
('item-viazi-karai',  'cat-snacks',    'Viazi Karai',   'Crispy golden Swahili battered spiced potatoes',                       50.00,  20.00,  './images/viazi-karai.jpg', 1, 0),
('item-sausages',     'cat-snacks',    'Sausages',      'Deep-fried Kenyan butcher beef sausages',                              50.00,  25.00,  'https://images.unsplash.com/photo-1585325701165-351af916e581?w=500&q=80', 1, 0),
('item-energy-drink', 'cat-drinks',    'Energy Drink',  'Chilled revitalizing energy drink',                                    70.00,  45.00,  './images/energy-drink.jpg', 1, 0),
('item-fresh-juice',  'cat-drinks',    'Fresh Juice',   '100% pure freshly squeezed and blended tropical juice',                70.00,  35.00,  'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&q=80', 1, 0),
('item-coca-cola',    'cat-drinks',    'Coca-Cola',     'Chilled classic Coca-Cola soda',                                       70.00,  40.00,  'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80', 1, 0),
('item-fanta',        'cat-drinks',    'Fanta',         'Chilled vibrant orange Fanta soda',                                    70.00,  40.00,  'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=500&q=80', 1, 0),
('item-sprite',       'cat-drinks',    'Sprite',        'Chilled crisp lemon-lime Sprite soda',                                 70.00,  40.00,  'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=500&q=80', 1, 0),
('item-stoney',       'cat-drinks',    'Stoney',        'Chilled fiery Stoney Tangawizi ginger soda',                           70.00,  40.00,  './images/stoney.jpg', 1, 0),
('item-krest',        'cat-drinks',    'Krest',         'Chilled sparkling Krest Bitter Lemon soda',                            70.00,  40.00,  './images/krest.jpg', 1, 0),
('item-water-small',  'cat-drinks',    'Water (Small)', 'Chilled pure mineral water (500ml small bottle)',                       30.00,  15.00,  './images/water-small.jpg', 1, 0),
('item-water-big',    'cat-drinks',    'Water (Big)',   'Chilled pure mineral water (1L big bottle)',                           50.00,  25.00,  './images/water-big.jpg', 1, 0);

-- ============================================================
--  SEED DATA — Inventory / Stock items (Migadini branch)
-- ============================================================
INSERT IGNORE INTO `stock_items` (`id`, `branch_id`, `name`, `type`, `unit`, `current_stock`, `min_stock_alert`, `unit_cost`, `supplier_name`) VALUES
('inv-1','branch-migadini','Potatoes (Shangi)',             'RAW_INGREDIENT', 'kg',     120.000, 25.000,  70.00, 'Farmers Co-op'),
('inv-2','branch-migadini','Raw Chicken (Whole/Cut)',       'RAW_INGREDIENT', 'kg',      80.000, 20.000, 380.00, 'Kenchic Supplies'),
('inv-3','branch-migadini','Basmati Rice (Grade 1)',        'RAW_INGREDIENT', 'kg',      95.000, 20.000, 160.00, 'Rice Millers'),
('inv-4','branch-migadini','Cooking Oil (Rina)',            'RAW_INGREDIENT', 'litre',   50.000, 15.000, 240.00, 'Bidco Africa'),
('inv-5','branch-migadini',"Smokies Pack (Farmer's Choice)",'PACKAGED_UNIT',  'piece',  150.000, 30.000,  28.00, "Farmer's Choice"),
('inv-6','branch-migadini','Coca-Cola 300ml Glass',         'PACKAGED_UNIT',  'bottle', 144.000, 24.000,  35.00, 'Nairobi Bottlers');

-- ============================================================
--  End of nani_fry_db schema & seed data
-- ============================================================
