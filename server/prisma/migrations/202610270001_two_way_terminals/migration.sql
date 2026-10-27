-- Keep independently operated local and live cash drawers separate.
ALTER TABLE `Shift` ADD COLUMN `terminalId` VARCHAR(191) NOT NULL DEFAULT 'cloud';
