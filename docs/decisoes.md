# Decisões de implementação

1. **JavaScript ES modules.** Mantém a linguagem dos exemplos do MD. `prisma.config.ts` é somente a configuração declarativa exigida pelo Prisma 7; o código de aplicação não depende de compilação TypeScript.
2. **PrimeVue 4.** Escolhido entre as alternativas propostas. Componentes acessíveis de botão e diálogo, com CSS próprio e fontes hospedadas junto da aplicação. Não há dependência de CDN no navegador.
3. **MySQL como fonte de verdade.** Produção usa Prisma com driver MariaDB compatível com MySQL. O adaptador em memória é limitado à demonstração e testes isolados. Testes de integração executam as mesmas regras no MySQL real.
4. **Fila no próprio banco.** Evita um Redis obrigatório nesse porte de projeto. A tabela de eventos funciona como inbox idempotente e fila de tarefas. Lease e token de posse impedem finalização por worker antigo.
5. **Transação no limite da operação.** Criação, pagamento, cancelamento e fechamento usam isolamento serializável. A restrição única de caixa aberto e a chave única de pagamento protegem contra processos concorrentes.
6. **Centavos e snapshots.** Cálculos nunca dependem de preços enviados pelo cliente ou de custo atual de produto para uma venda antiga. Quantidade é `Decimal(10,3)` no banco e convertida para número finito na fronteira do repositório.
7. **Receita e cobrança separadas.** Especialmente no iFood, cupom subsidiado e taxa da plataforma tornam o total do cliente diferente da receita atribuída à loja. A comissão é uma estimativa configurável, apresentada como tal.
8. **Resultado por competência simplificada.** Venda reconhecida na conclusão, despesa na data informada, sem rateios contábeis automáticos. O relatório é gerencial e depende dos lançamentos feitos pela equipe.
9. **Administrador único como perfil.** O MD não definiu permissões; incluído acesso autenticado para proteger informações operacionais. Os dados ficam na mesma origem, com cookie HttpOnly e cabeçalho customizado nas mutações. Não há cadastro público.
10. **Histórico de caixa preservado.** Cancelamento que exige alterar pagamento de sessão fechada é recusado. Não foi introduzido um fluxo silencioso de alteração retroativa da conferência.
11. **Sem operações financeiras externas.** Registrar pagamento ou estorno registra fatos no sistema. Cobrança, devolução na operadora e aceite/despacho na plataforma são ações da equipe nos sistemas correspondentes.
12. **Dependências fixadas.** `package-lock.json` registra versões. Overrides atualizam `mariadb`, `mysql2` e `deepmerge-ts` para versões sem as vulnerabilidades sinalizadas na auditoria inicial. Geração Prisma, migrações e adaptador foram validados com essas versões.
