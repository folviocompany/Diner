# Diner · Sistema de gestão de loja

Implementação do [documento de arquitetura original](docs/arquitetura-original.md): pedidos de comanda, balcão e iFood em um único domínio, caixa com conferência, produtos com custos históricos e relatórios de resultados. Interface em português, responsiva, com Vue 3, Vite, Pinia e PrimeVue 4; API Node.js/Express 5; Prisma 7 e MySQL 8.4.

## Experimentar sem banco

Requisito: Node.js 24 LTS (mínimo 22.12).

```sh
npm ci
npm run db:generate
npm run build
npm run demo
```

Abra **http://127.0.0.1:3001**. Acesso de demonstração:

- E-mail: `demo@diner.local`
- Senha: `DinerDemo2026!`

A demonstração inclui 30 dias de vendas fictícias, produtos e pedidos em andamento. Usa o mesmo domínio e os mesmos contratos de repositório, com adaptador em memória. Os dados são descartados ao reiniciar. Só aceita execução local e não funciona com `NODE_ENV=production`.

## Executar com dados persistentes

```sh
npm ci
```

Copie `.env.example` para `.env` e preencha `ADMIN_PASSWORD` com pelo menos 10 caracteres. No PowerShell:

```powershell
Copy-Item .env.example .env
```

Inicie o MySQL e a aplicação:

```sh
docker compose up -d --wait
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

- Interface de desenvolvimento: **http://127.0.0.1:5173**.
- API: **http://127.0.0.1:3001/api**.
- Login: `ADMIN_EMAIL` e `ADMIN_PASSWORD` definidos no `.env`.
- A carga inicial cria somente o administrador e preserva usuários existentes. Cadastre os produtos reais pela interface.
- O Vite encaminha `/api` ao backend. A versão compilada é servida pelo próprio Express (`npm run build` e `npm start`).

### Ambiente já preparado neste computador

O projeto está atualmente em **F:/Diner**. Execute os comandos nesta pasta.

Como o Docker não estava instalado, foi preparado um MySQL portátil **8.4.9** em `.local/mysql/`, sem instalação de serviço Windows. Os bancos `diner` e `diner_test` estão separados na porta **3307**, com usuários próprios. `.env` contém as credenciais geradas e não entra no Git. O banco `diner` tem um administrador e está pronto para o cadastro dos dados reais.

Para iniciar esse MySQL novamente:

```powershell
powershell -File scripts/start-local-mysql.ps1
npm start
```

Para desligá-lo, após parar a aplicação:

```sh
node scripts/stop-local-mysql.js
```

O diretório `.local/` é específico deste computador e não faz parte do código versionado. Em outras máquinas use Docker Compose ou um MySQL próprio. O administrador do banco portátil usa senha aleatória, armazenada somente em `.local/root-credentials.json`.

## Fluxos implementados

- **Pedidos:** criação em balcão ou comanda, mesa/cliente/observações, quantidades com até três casas decimais, descontos, acréscimos, custos de taxas, pesquisa, filtros por canal/status/data, paginação e detalhes.
- **Operação:** recebido → em preparo → pronto → concluído. Conclusão local exige pagamento integral. Cancelamento exige motivo e estorna pagamentos em caixa aberto.
- **Produtos:** cadastro, edição, categorias, preço, custo, disponibilidade e vínculo pelo código externo iFood. A desativação preserva o histórico.
- **Pagamentos:** dinheiro, Pix, crédito, débito e vale; pagamentos divididos; chave de idempotência e prevenção transacional de cobrança acima do saldo. O sistema registra pagamentos; não processa cobranças em adquirentes.
- **Caixa:** uma sessão aberta por loja, fundo inicial, sangrias, suprimentos, recebimentos por forma, dinheiro esperado, conferência, diferença e últimas 50 sessões.
- **Relatórios:** diário, semanal (segunda a domingo), mensal e intervalo de até 366 dias; receita, custo de produtos, taxas, despesas, lucro operacional estimado, margem, ticket médio, recebíveis, canais, itens mais vendidos, série diária e exportação CSV.
- **iFood:** assinatura HMAC-SHA256, eventos idempotentes, payload bruto persistido em JSON, fila durável no MySQL, worker com lease e token de posse, tentativas com backoff, oito tentativas antes de falha definitiva, reprocessamento manual, OAuth centralizado, consulta de detalhes e sincronização de status.
- **Acesso:** administrador, senhas scrypt com salt aleatório, sessão opaca com hash persistido, cookie HttpOnly/SameSite e expiração, limitação de tentativas de login, proteção de mutações por cabeçalho customizado, Helmet e erros centralizados.

## Regras de resultado e caixa

Todos os campos monetários da API usam **inteiros em centavos**. Nunca envie `19.90`; envie `1990`. Limite por valor: R$ 1.000.000,00. Preço e custo unitários são copiados para os itens no momento da venda. O backend calcula os totais; preços enviados pelo navegador são recusados.

O relatório reconhece vendas **concluídas na data da conclusão**, no fuso `STORE_TIMEZONE`, padrão `America/Manaus`. O fim do intervalo é exclusivo na consulta; a data final escolhida na interface é inclusiva. Cancelados não geram receita nem custo dos itens. Eventuais desperdícios devem ser lançados como despesa.

```text
Lucro operacional estimado = receita da loja − custo dos itens − taxas dos pedidos − despesas
Dinheiro esperado = fundo inicial + recebimentos em dinheiro − estornos em dinheiro
                    + suprimentos − sangrias
```

Pix e cartão não entram na gaveta física. Uma sangria não é automaticamente despesa: pode ser apenas transferência de dinheiro. Registre separadamente o gasto em Relatórios quando aplicável. Inclua impostos, aluguel, salários e demais gastos nas despesas para que sejam considerados no resultado. Pagamentos pendentes de pedidos iFood concluídos aparecem como recebíveis.

Caixa fechado não é reescrito por um cancelamento posterior: a operação é recusada para preservar a conferência histórica e exige conciliação gerencial externa. O estorno é um registro no sistema; a devolução física ou na operadora deve ser feita pela equipe. Este escopo não inclui módulo fiscal/NFC-e, estoque, ficha técnica de receitas, conciliação bancária, múltiplas filiais ou perfis de acesso por funcionário; não estavam no documento original.

## Integração iFood

Veja [docs/ifood.md](docs/ifood.md) para credenciais, catálogo, assinatura, cálculos e homologação. O webhook fica em:

```text
POST /api/webhooks/ifood
```

O servidor recebe os eventos e confirma a persistência antes de responder `202`. A consulta à API iFood acontece no worker. Sem credenciais, a integração permanece desativada e o endpoint retorna `503`. Nenhuma chave real está incluída.

O worker inicia junto da API quando `IFOOD_CLIENT_ID` está configurado. Também pode rodar separadamente com `npm run worker`; leases e transações permitem múltiplos consumidores. A sincronização de status é **de entrada**: aceite, despacho e cancelamento no iFood continuam no Gestor de Pedidos da plataforma. A integração real depende de credenciais, endpoint HTTPS público, catálogo vinculado e homologação no portal.

## Arquitetura e API

```text
src/domain/                 Entidades, contratos e funções de negócio
src/application/use-cases/  Orquestração por casos de uso
src/infra/                  Prisma, MySQL, memória, segurança e cliente iFood
src/interfaces/             HTTP, controllers, validação e webhook
src/shared/                 Container manual, configuração e erros
src/tests/                  Unitários, integração e E2E de API
web/src/                    Vue, Pinia, rotas e componentes
tests/browser/              Fluxos Playwright em desktop e celular
docs/                       Arquitetura original, API e integração
```

`domain` e `application` não importam Prisma nem infraestrutura. Um verificador de dependências roda no lint. Adaptadores Prisma e de memória herdam os mesmos contratos. Todas as mutações de agregados passam por `UnitOfWork.transaction`; MySQL usa isolamento serializável e repetição limitada para conflitos de serialização.

O contrato HTTP, exemplos e erros estão em [docs/api.md](docs/api.md). Documentação de decisões: [docs/decisoes.md](docs/decisoes.md).

## Testes

```sh
npm run lint
npm test
npm run test:coverage
```

Testes MySQL isolados:

```sh
docker compose -f docker-compose.test.yml up -d --wait
```

Defina `TEST_DATABASE_URL=mysql://diner_test:diner_test@127.0.0.1:3307/diner_test` no ambiente ou no `.env`. No ambiente portátil descrito acima isso já está configurado, dispensando o Docker.

```sh
npm run db:test
npm run test:integration
```

As verificações de integração limpam exclusivamente o banco apontado por `TEST_DATABASE_URL`; o nome obrigatoriamente termina em `_test`. Nunca use o banco de operação nessa variável. `db:test` usa migrations, não `db push`.

Testes completos da interface:

```sh
npm run build
# No Linux, instale Chromium e bibliotecas do sistema:
npx playwright install --with-deps chromium
npm run test:browser
```

No Windows o Playwright usa o Microsoft Edge instalado. O servidor de teste inicia a demonstração na porta 3100. São exercitados desktop e celular, incluindo cadastro, pedido, pagamento, preparo, conclusão, relatório, despesa, CSV e fechamento. Capturas ficam em `test-results/`.

O CI segue lint → unitários → MySQL isolado/migrações → integração → E2E de API → build → navegador.

## Execução em servidor

Um `Dockerfile` está incluído para construir a aplicação completa. Passe `DATABASE_URL` e demais variáveis ao contêiner, execute `npm run db:migrate` e `npm run db:seed` como etapas controladas do provisionamento e coloque a aplicação atrás de HTTPS. `NODE_ENV=production` exige cookies seguros. O proxy deve preservar `/api` e servir o frontend na mesma origem. Não exponha MySQL publicamente.

O código foi implementado e validado localmente. Não houve publicação externa nem homologação com conta real do iFood.

### Autenticação do MySQL após reinício

O conector permite obter a chave RSA de autenticação somente em conexões de loopback (127.0.0.1, localhost ou ::1). Para MySQL remoto, utilize ?ssl=true na URL; certificados são verificados. DATABASE_SSL_CA permite informar o arquivo PEM de uma CA própria, e MYSQL_SERVER_RSA_KEY fixa a chave pública RSA do servidor. Referência: [opções oficiais do conector MariaDB](https://mariadb.com/docs/connectors/mariadb-connector-nodejs/node-js-connection-options).

### Primeiro acesso no Railway

No serviço Diner, defina DATABASE_URL como referência ao MYSQL_URL do serviço MySQL, ADMIN_EMAIL e ADMIN_PASSWORD (mínimo de 10 caracteres). Em Settings → Deploy → Pre-Deploy Command, use um único comando:

```sh
npm run db:prepare
```

Aplique as alterações e implante o commit atualizado. Esse script executa as migrações e, somente se terminarem com sucesso, cria o administrador. Confira as duas etapas db:migrate e db:seed nos logs. Não basta executar somente db:migrate: ela cria as tabelas, mas não o usuário. Como proteção adicional, a aplicação cria o primeiro administrador ao iniciar quando a tabela Usuario está vazia e as variáveis ADMIN_EMAIL e ADMIN_PASSWORD estão definidas. Se já houver um usuário, a senha salva é preservada; alterar ADMIN_PASSWORD não redefine contas existentes.

O Docker inclui OpenSSL tanto no build quanto na execução. O aplicativo confia em um salto de proxy quando RAILWAY_ENVIRONMENT_ID está presente, para identificar o cliente no limite de tentativas de login. TRUST_PROXY_HOPS permite ajustar explicitamente essa quantidade; fora do Railway, o padrão é zero. Use um salto somente quando todo acesso público passar pelo proxy que acrescenta o IP real ao X-Forwarded-For.

Referências: [pre-deploy Railway](https://docs.railway.com/deployments/pre-deploy-command) e [Express atrás de proxy](https://expressjs.com/en/guide/behind-proxies/).
