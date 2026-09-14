import { test, expect } from '@playwright/test';

test('Swagger renderiza e executa login e consulta autenticada com cookie', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/api/docs/');
  await expect(page.getByRole('heading', { name: /Diner API/ })).toBeVisible();
  await expect(page.locator('.errors-wrapper')).toHaveCount(0);
  await page.getByRole('link', { name: 'Autenticação', exact: true }).click();
  const login = page.locator('#operations-Autenticação-post__auth_login');
  await login.locator('.opblock-summary').click();
  await login.getByRole('button', { name: 'Try it out' }).click();
  await login
    .locator('textarea')
    .fill(JSON.stringify({ email: 'demo@diner.local', senha: 'DinerDemo2026!' }));
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/api/auth/login') && r.request().method() === 'POST',
  );
  await login.getByRole('button', { name: 'Execute', exact: true }).click();
  expect((await response).status()).toBe(200);
  const me = page.locator('#operations-Autenticação-get__auth_me');
  await me.locator('.opblock-summary').click();
  await me.getByRole('button', { name: 'Try it out' }).click();
  const meResponse = page.waitForResponse((r) => r.url().endsWith('/api/auth/me'));
  await me.getByRole('button', { name: 'Execute', exact: true }).click();
  expect((await meResponse).status()).toBe(200);
  expect(errors).toEqual([]);
});
