import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill('demo@diner.local');
  await page.getByLabel('Senha', { exact: true }).fill('DinerDemo2026!');
  await page.getByRole('button', { name: 'Entrar na loja' }).click();
  await expect(page.getByRole('heading', { name: 'Visão geral.' })).toBeVisible();
});

test('navegação, estados reais e layout responsivo sem erro no navegador', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await expect(page.getByText('Receita de hoje', { exact: true })).toBeVisible();
  await page.screenshot({ path: `test-results/dashboard-${testInfo.project.name}.png`, fullPage: true });
  for (const [url, heading] of [
    ['/pedidos', 'Pedidos.'],
    ['/produtos', 'Produtos.'],
    ['/caixa', 'Caixa.'],
    ['/relatorios', 'Relatórios.'],
    ['/integracoes', 'Integrações.'],
    ['/pedidos/novo', 'Novo pedido.'],
  ]) {
    await page.goto(url);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(
      true,
    );
  }
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
    await page.getByRole('link', { name: 'Produtos', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Produtos.' })).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('cadastro, comanda, pagamento, preparo, relatório e fechamento', async ({ page }, testInfo) => {
  const nome = `Lanche teste ${testInfo.project.name} ${Date.now()}`;
  await page.goto('/produtos');
  await page.getByRole('button', { name: 'Novo produto', exact: true }).click();
  await page.getByLabel('Nome do produto').fill(nome);
  await page.getByLabel('Categoria', { exact: true }).fill('Testes');
  await page.getByRole('spinbutton', { name: 'Preço de venda', exact: true }).fill('12.34');
  await page.getByRole('spinbutton', { name: 'Custo por unidade', exact: true }).fill('4.56');
  await page.getByRole('button', { name: 'Salvar produto' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Buscar produto', exact: true }).fill(nome);
  await expect(page.getByRole('cell', { name: 'R$ 12,34', exact: true })).toBeVisible();
  await page.goto('/caixa');
  await expect(
    page.locator('.cash-status').or(page.getByRole('heading', { name: 'Vamos começar o movimento?' })),
  ).toBeVisible();
  if (await page.getByRole('button', { name: 'Abrir caixa', exact: true }).first().isVisible()) {
    await page.getByRole('button', { name: 'Abrir caixa', exact: true }).first().click();
    await page.getByRole('spinbutton', { name: 'Fundo inicial de troco', exact: true }).fill('100');
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await page.goto('/pedidos/novo');
  await page.getByRole('textbox', { name: 'Buscar produto', exact: true }).fill(nome);
  await page.getByRole('button', { name: new RegExp(nome) }).click();
  await page.getByRole('button', { name: 'Comanda', exact: true }).click();
  await page.getByLabel('Mesa', { exact: true }).fill('09');
  await page.getByLabel('Nome do cliente').fill('Cliente de teste');
  await page.getByRole('button', { name: 'Criar pedido', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('combobox', { name: 'Forma', exact: true }).selectOption('pix');
  await page.getByRole('button', { name: 'Registrar pagamento', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Receber pagamento', exact: true })).toHaveCount(0);
  for (const name of ['Iniciar preparo', 'Marcar como pronto', 'Concluir pedido'])
    await page.getByRole('button', { name, exact: true }).click();
  await expect(page.getByRole('dialog').getByText('Concluído', { exact: true })).toBeVisible();
  await page.screenshot({
    path: `test-results/pedido-concluido-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.goto('/relatorios');
  await page.getByRole('button', { name: 'Dia', exact: true }).click();
  await expect(page.getByRole('cell', { name: new RegExp(nome) })).toBeVisible();
  await page.getByRole('button', { name: 'Registrar despesa', exact: true }).click();
  await page.getByLabel('Descrição', { exact: true }).fill('Despesa de teste');
  await page.getByRole('spinbutton', { name: 'Valor', exact: true }).fill('2.50');
  await page.getByRole('dialog').getByRole('button', { name: 'Registrar despesa', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Exportar CSV' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('diner-relatorio.csv');
  await page.goto('/caixa');
  await page.getByRole('button', { name: 'Fechar caixa', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Dinheiro contado', exact: true }).fill('100');
  await page.getByRole('button', { name: 'Confirmar fechamento' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Vamos começar o movimento?' })).toBeVisible();
});
