# Melhorias de operação

As cinco melhorias mantêm as regras em entidades e casos de uso, com contratos de repositórios e implementações em memória e Prisma.

1. Criação de pedidos idempotente, inclusive sob concorrência no MySQL. A tela mantém o envio pendente na sessão da aba e permite confirmar o mesmo pedido após falha de conexão ou recarga.
2. Comandas permitem adicionar consumos, retirar itens inteiros com motivo, transferir mesa e dividir o saldo em parcelas sem perder centavos. Preço e custo antigos são preservados. Edições concorrentes são rejeitadas pela versão.
3. Equipe com perfis administrador, gerente, caixa e cozinha, autorização na API, revogação de sessões e histórico de ações atômico com as alterações.
4. Pedidos e painel atualizam a cada 10 segundos enquanto visíveis. O painel recalcula a data no fuso da loja. Na tela Pedidos, o operador pode ativar som; o aviso acompanha novos pedidos visíveis nos filtros. Recebidos/em preparo há mais de 20 minutos recebem indicação de atraso.
5. Cancelamento posterior preserva o fechamento original e gera reembolso pendente. A confirmação registra a saída no caixa atual. Vendas concluídas geram ajuste financeiro no período do cancelamento; taxas permanecem como custo. Perdas de mercadoria devem ser registradas como despesas quando aplicável.

## Publicação

Aplicar `npm run db:prepare` antes de iniciar a versão nova (Pre-deploy do Railway). A migração `202609140001_operacao` é aditiva: não apaga tabelas ou vendas. Usuários existentes recebem perfil administrador e permanecem ativos; ajuste os perfis em Equipe e histórico conforme a função de cada pessoa.

## Validação

O desenvolvimento iniciou com testes que falharam para as novas regras e avançou para implementação e refatoração. Cobertura inclui rollback de auditoria, permissões HTTP, revogação de sessão, concorrência real no MySQL, versão da comanda, parcelas em centavos, cancelamento iFood e preservação de caixa fechado. Testes de navegador cobrem desktop e celular. Execute `npm run check`, `npm run db:test`, `npm run test:integration` e `npm run test:browser`.
