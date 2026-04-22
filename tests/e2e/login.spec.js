const { test, expect } = require('@playwright/test');

const PIN_ALUMNO  = 'MAR001';
const PIN_DOCENTE = 'PROF01';

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('muestra pantalla de login al inicio', async ({ page }) => {
    await expect(page.locator('#loginScreen')).toBeVisible();
    await expect(page.locator('#appScreen')).not.toBeVisible();
    await expect(page.locator('#docenteScreen')).not.toBeVisible();
  });

  test('login exitoso con PIN de alumno demo', async ({ page }) => {
    await page.fill('#pinInput', PIN_ALUMNO);
    await page.click('.login-btn');
    await expect(page.locator('#appScreen')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#loginScreen')).not.toBeVisible();
  });

  test('login con PIN en mayúsculas y minúsculas (case-insensitive)', async ({ page }) => {
    await page.fill('#pinInput', PIN_ALUMNO.toLowerCase());
    await page.click('.login-btn');
    await expect(page.locator('#appScreen')).toBeVisible({ timeout: 8000 });
  });

  test('login con tecla Enter', async ({ page }) => {
    await page.fill('#pinInput', PIN_ALUMNO);
    await page.press('#pinInput', 'Enter');
    await expect(page.locator('#appScreen')).toBeVisible({ timeout: 8000 });
  });

  test('muestra error con PIN inválido', async ({ page }) => {
    await page.fill('#pinInput', 'INVALID999');
    await page.click('.login-btn');
    await expect(page.locator('#loginError')).toBeVisible();
    await expect(page.locator('#appScreen')).not.toBeVisible();
  });

  test('no hace login con PIN vacío', async ({ page }) => {
    await page.click('.login-btn');
    await expect(page.locator('#loginScreen')).toBeVisible();
  });

  test('login como docente muestra panel docente', async ({ page }) => {
    await page.fill('#pinInput', PIN_DOCENTE);
    await page.click('.login-btn');
    await expect(page.locator('#docenteScreen')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#appScreen')).not.toBeVisible();
  });

  test('logout vuelve a pantalla de login', async ({ page }) => {
    await page.fill('#pinInput', PIN_ALUMNO);
    await page.click('.login-btn');
    await expect(page.locator('#appScreen')).toBeVisible({ timeout: 8000 });
    await page.locator('[onclick="doLogout()"]').first().click();
    await expect(page.locator('#loginScreen')).toBeVisible();
    await expect(page.locator('#appScreen')).not.toBeVisible();
  });

  test('auto-login con PIN en URL', async ({ page }) => {
    await page.goto(`/?pin=${PIN_ALUMNO}`);
    await expect(page.locator('#appScreen')).toBeVisible({ timeout: 8000 });
  });
});
