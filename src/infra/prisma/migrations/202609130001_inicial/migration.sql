-- CreateTable
CREATE TABLE `Produto` (
    `id` VARCHAR(36) NOT NULL,
    `nome` VARCHAR(120) NOT NULL,
    `categoria` VARCHAR(60) NOT NULL,
    `precoCentavos` INTEGER NOT NULL,
    `custoCentavos` INTEGER NOT NULL,
    `codigoExterno` VARCHAR(120) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Produto_codigoExterno_key`(`codigoExterno`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cliente` (
    `id` VARCHAR(36) NOT NULL,
    `nome` VARCHAR(120) NOT NULL,
    `contato` VARCHAR(40) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pedido` (
    `id` VARCHAR(36) NOT NULL,
    `numero` INTEGER NOT NULL AUTO_INCREMENT,
    `origem` ENUM('comanda', 'ifood', 'caixa') NOT NULL,
    `status` ENUM('recebido', 'preparando', 'pronto', 'concluido', 'cancelado') NOT NULL DEFAULT 'recebido',
    `mesa` VARCHAR(20) NULL,
    `clienteId` VARCHAR(36) NULL,
    `clienteNome` VARCHAR(120) NULL,
    `clienteContato` VARCHAR(40) NULL,
    `observacao` VARCHAR(500) NULL,
    `externoId` VARCHAR(36) NULL,
    `referenciaExterna` VARCHAR(60) NULL,
    `ultimoEventoEm` DATETIME(3) NULL,
    `subtotalCentavos` INTEGER NOT NULL,
    `descontoCentavos` INTEGER NOT NULL DEFAULT 0,
    `acrescimoCentavos` INTEGER NOT NULL DEFAULT 0,
    `totalCentavos` INTEGER NOT NULL,
    `receitaCentavos` INTEGER NOT NULL,
    `custoItensCentavos` INTEGER NOT NULL,
    `taxasCentavos` INTEGER NOT NULL DEFAULT 0,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,
    `concluidoEm` DATETIME(3) NULL,
    `canceladoEm` DATETIME(3) NULL,
    `motivoCancelamento` VARCHAR(300) NULL,

    UNIQUE INDEX `Pedido_numero_key`(`numero`),
    UNIQUE INDEX `Pedido_externoId_key`(`externoId`),
    INDEX `Pedido_criadoEm_origem_status_idx`(`criadoEm`, `origem`, `status`),
    INDEX `Pedido_concluidoEm_status_idx`(`concluidoEm`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ItemPedido` (
    `id` VARCHAR(36) NOT NULL,
    `pedidoId` VARCHAR(36) NOT NULL,
    `produtoId` VARCHAR(36) NOT NULL,
    `nome` VARCHAR(120) NOT NULL,
    `quantidade` DECIMAL(10, 3) NOT NULL,
    `precoUnitarioCentavos` INTEGER NOT NULL,
    `custoUnitarioCentavos` INTEGER NOT NULL,
    `subtotalCentavos` INTEGER NOT NULL,
    `observacao` VARCHAR(500) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pagamento` (
    `id` VARCHAR(36) NOT NULL,
    `pedidoId` VARCHAR(36) NOT NULL,
    `caixaId` VARCHAR(36) NULL,
    `forma` ENUM('dinheiro', 'pix', 'credito', 'debito', 'vale', 'ifood_online') NOT NULL,
    `valorCentavos` INTEGER NOT NULL,
    `status` ENUM('confirmado', 'estornado') NOT NULL DEFAULT 'confirmado',
    `chaveIdempotencia` VARCHAR(80) NULL,
    `recebidoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `estornadoEm` DATETIME(3) NULL,

    UNIQUE INDEX `Pagamento_chaveIdempotencia_key`(`chaveIdempotencia`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Caixa` (
    `id` VARCHAR(36) NOT NULL,
    `chaveAberto` VARCHAR(20) NULL,
    `valorInicialCentavos` INTEGER NOT NULL,
    `valorFinalCentavos` INTEGER NULL,
    `esperadoCentavos` INTEGER NULL,
    `diferencaCentavos` INTEGER NULL,
    `abertoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fechadoEm` DATETIME(3) NULL,
    `observacao` VARCHAR(300) NULL,

    UNIQUE INDEX `Caixa_chaveAberto_key`(`chaveAberto`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MovimentoCaixa` (
    `id` VARCHAR(36) NOT NULL,
    `caixaId` VARCHAR(36) NOT NULL,
    `tipo` ENUM('sangria', 'suprimento') NOT NULL,
    `valorCentavos` INTEGER NOT NULL,
    `motivo` VARCHAR(300) NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Despesa` (
    `id` VARCHAR(36) NOT NULL,
    `descricao` VARCHAR(200) NOT NULL,
    `categoria` VARCHAR(60) NOT NULL,
    `valorCentavos` INTEGER NOT NULL,
    `ocorridoEm` DATETIME(3) NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Despesa_ocorridoEm_idx`(`ocorridoEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EventoIfood` (
    `id` VARCHAR(36) NOT NULL,
    `orderId` VARCHAR(36) NOT NULL,
    `merchantId` VARCHAR(36) NOT NULL,
    `code` VARCHAR(80) NOT NULL,
    `ocorridoEm` DATETIME(3) NOT NULL,
    `payload` JSON NOT NULL,
    `status` ENUM('pendente', 'processando', 'processado', 'ignorado', 'falhou') NOT NULL DEFAULT 'pendente',
    `tentativas` INTEGER NOT NULL DEFAULT 0,
    `proximaTentativaEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `bloqueadoAte` DATETIME(3) NULL,
    `tokenProcessamento` VARCHAR(36) NULL,
    `erro` VARCHAR(1000) NULL,
    `recebidoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processadoEm` DATETIME(3) NULL,

    INDEX `EventoIfood_status_proximaTentativaEm_idx`(`status`, `proximaTentativaEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Usuario` (
    `id` VARCHAR(36) NOT NULL,
    `nome` VARCHAR(120) NOT NULL,
    `email` VARCHAR(200) NOT NULL,
    `senhaHash` VARCHAR(300) NOT NULL,

    UNIQUE INDEX `Usuario_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sessao` (
    `tokenHash` VARCHAR(64) NOT NULL,
    `usuarioId` VARCHAR(36) NOT NULL,
    `expiraEm` DATETIME(3) NOT NULL,

    INDEX `Sessao_expiraEm_idx`(`expiraEm`),
    PRIMARY KEY (`tokenHash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Pedido` ADD CONSTRAINT `Pedido_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemPedido` ADD CONSTRAINT `ItemPedido_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `Pedido`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemPedido` ADD CONSTRAINT `ItemPedido_produtoId_fkey` FOREIGN KEY (`produtoId`) REFERENCES `Produto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pagamento` ADD CONSTRAINT `Pagamento_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `Pedido`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pagamento` ADD CONSTRAINT `Pagamento_caixaId_fkey` FOREIGN KEY (`caixaId`) REFERENCES `Caixa`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimentoCaixa` ADD CONSTRAINT `MovimentoCaixa_caixaId_fkey` FOREIGN KEY (`caixaId`) REFERENCES `Caixa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sessao` ADD CONSTRAINT `Sessao_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
