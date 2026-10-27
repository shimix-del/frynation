-- AlterTable
ALTER TABLE `Order` ADD COLUMN `clientRequestId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `CashMovement` ADD COLUMN `expenseId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `ActivityLog` (
    `id` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `actorName` VARCHAR(191) NOT NULL,
    `actorRole` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `shiftId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `details` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ActivityLog_branchId_createdAt_idx`(`branchId`, `createdAt`),
    INDEX `ActivityLog_shiftId_createdAt_idx`(`shiftId`, `createdAt`),
    INDEX `ActivityLog_actorId_createdAt_idx`(`actorId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockMovement` (
    `id` VARCHAR(191) NOT NULL,
    `stockItemId` VARCHAR(191) NOT NULL,
    `stockItemName` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `shiftId` VARCHAR(191) NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `reversesMovementId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `StockMovement_reversesMovementId_key`(`reversesMovementId`),
    INDEX `StockMovement_orderId_reason_idx`(`orderId`, `reason`),
    INDEX `StockMovement_branchId_createdAt_idx`(`branchId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Order_clientRequestId_key` ON `Order`(`clientRequestId`);

-- CreateIndex
CREATE UNIQUE INDEX `CashMovement_expenseId_key` ON `CashMovement`(`expenseId`);
