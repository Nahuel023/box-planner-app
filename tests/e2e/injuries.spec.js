const { test, expect } = require('@playwright/test');

const PIN_DOCENTE = 'PROF01';
const PIN_ALUMNO  = 'MAR001';

test.describe('Módulo de lesiones — docente', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('#pinInput', PIN_DOCENTE);
    await page.click('.login-btn');
    await expect(page.locator('#docenteScreen')).toBeVisible({ timeout: 8000 });
    await page.locator('.alumno-card, [onclick*="openAlumnoDetail"]').first().click();
    await expect(page.getByRole('heading', { name: 'Lesiones' })).toBeVisible({ timeout: 5000 });
  });

  test('sección lesiones visible en detalle de alumno', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Lesiones' })).toBeVisible();
    await expect(page.locator('button:has-text("+ Agregar")')).toBeVisible();
    await expect(page.locator('button:has-text("PDF")')).toBeVisible();
  });

  test('abre modal crear lesión', async ({ page }) => {
    await page.click('button:has-text("+ Agregar")');
    await expect(page.locator('#crearLesionModal')).toBeVisible();
    await expect(page.locator('#clZona')).toBeVisible();
    await expect(page.locator('#clTipo')).toBeVisible();
    await expect(page.locator('#clGravedad')).toBeVisible();
  });

  test('validación: tipo de lesión obligatorio', async ({ page }) => {
    await page.click('button:has-text("+ Agregar")');
    await page.selectOption('#clZona', 'hombro_izq');
    /* No llenamos tipo — debe mostrar toast de advertencia */
    await page.click('button:has-text("Guardar lesión")');
    const toast = page.locator('#bpToast');
    await expect(toast).toBeVisible();
    await expect(toast).toHaveAttribute('data-type', 'warn');
    /* Modal debe seguir abierto */
    await expect(page.locator('#crearLesionModal')).toBeVisible();
  });

  test('crea lesión exitosamente', async ({ page }) => {
    await page.click('button:has-text("+ Agregar")');
    await page.selectOption('#clZona', 'rodilla_der');
    await page.fill('#clTipo', 'Esguince test');
    await page.selectOption('#clGravedad', 'moderada');
    await page.click('button:has-text("Guardar lesión")');
    await expect(page.locator('#crearLesionModal')).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Esguince test')).toBeVisible();
  });

  test('abre modal editar lesión', async ({ page }) => {
    const editBtn = page.locator('button:has-text("Editar")').first();
    if (!await editBtn.count()) test.skip();
    await editBtn.click();
    await expect(page.locator('#editarLesionModal')).toBeVisible();
    await expect(page.locator('#elZona')).toBeVisible();
  });

  test('genera reporte PDF (abre popup)', async ({ page, context }) => {
    const [popup] = await Promise.all([
      context.waitForEvent('page', { timeout: 5000 }),
      page.click('button:has-text("PDF")'),
    ]);
    await popup.waitForLoadState('domcontentloaded');
    const title = await popup.title();
    expect(title).toContain('Lesiones');
  });
});

test.describe('Módulo de lesiones — alumno (tab Salud)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('#pinInput', PIN_ALUMNO);
    await page.click('.login-btn');
    await expect(page.locator('#appScreen')).toBeVisible({ timeout: 8000 });
    await page.click('#navSalud');
  });

  test('tab Salud es visible y accesible', async ({ page }) => {
    await expect(page.locator('#tabSalud')).toBeVisible();
    await expect(page.locator('#saludWrap')).toBeVisible();
  });

  test('muestra estado OK o tarjetas de lesión', async ({ page }) => {
    const okBox   = page.locator('.lesion-ok-box');
    const cards   = page.locator('.lesion-alumno-card');
    const okCount = await okBox.count();
    const cardCount = await cards.count();
    expect(okCount + cardCount).toBeGreaterThan(0);
  });
});
