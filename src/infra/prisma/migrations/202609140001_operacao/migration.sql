ALTER TABLE `Pedido` ADD COLUMN `chaveIdempotencia` VARCHAR(80) NULL, ADD COLUMN `hashCriacao` VARCHAR(64) NULL, ADD COLUMN `versao` INTEGER NOT NULL DEFAULT 0, ADD COLUMN `preservarReceita` BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX `Pedido_chaveIdempotencia_key` ON `Pedido`(`chaveIdempotencia`);
ALTER TABLE `Usuario` ADD COLUMN `perfil` VARCHAR(20) NOT NULL DEFAULT 'admin', ADD COLUMN `ativo` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `MovimentoCaixa` MODIFY `tipo` ENUM('sangria', 'suprimento', 'estorno') NOT NULL, ADD COLUMN `forma` ENUM('dinheiro','pix','credito','debito','vale','ifood_online') NULL;
CREATE TABLE `Auditoria` (
 `id` VARCHAR(36) NOT NULL, `usuarioId` VARCHAR(36) NULL, `usuarioNome` VARCHAR(120) NOT NULL,
 `acao` VARCHAR(80) NOT NULL, `recursoId` VARCHAR(36) NULL, `dados` JSON NOT NULL,
 `ocorridoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`id`), INDEX `Auditoria_ocorridoEm_idx` (`ocorridoEm`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `Reembolso` (
 `id` VARCHAR(36) NOT NULL, `pagamentoId` VARCHAR(36) NOT NULL, `pedidoId` VARCHAR(36) NOT NULL,
 `caixaOrigemId` VARCHAR(36) NOT NULL, `caixaDestinoId` VARCHAR(36) NULL,
 `forma` ENUM('dinheiro','pix','credito','debito','vale','ifood_online') NOT NULL,
 `valorCentavos` INTEGER NOT NULL, `motivo` VARCHAR(300) NOT NULL,
 `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `confirmadoEm` DATETIME(3) NULL,
 PRIMARY KEY (`id`), UNIQUE INDEX `Reembolso_pagamentoId_key` (`pagamentoId`), INDEX `Reembolso_confirmadoEm_criadoEm_idx` (`confirmadoEm`,`criadoEm`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `AjusteFinanceiro` (
 `id` VARCHAR(36) NOT NULL, `pedidoId` VARCHAR(36) NOT NULL, `receitaCentavos` INTEGER NOT NULL,
 `custoCentavos` INTEGER NOT NULL, `motivo` VARCHAR(300) NOT NULL, `ocorridoEm` DATETIME(3) NOT NULL,
 PRIMARY KEY (`id`), UNIQUE INDEX `AjusteFinanceiro_pedidoId_key` (`pedidoId`), INDEX `AjusteFinanceiro_ocorridoEm_idx` (`ocorridoEm`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
