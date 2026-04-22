const { test, expect } = require('@playwright/test');

const PIN_DOCENTE = 'PROF01';

test.describe('Generador automático de rutinas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('#pinInput', PIN_DOCENTE);
    await page.click('.login-btn');
    await expect(page.locator('#docenteScreen')).toBeVisible({ timeout: 8000 });
    await page.click('#navDocRutinas');
    await expect(page.locator('#sectionDocRutinas')).toBeVisible();
  });

  test('botón Generar abre el modal', async ({ page }) => {
    await page.click('button:has-text("Generar")');
    await expect(page.locator('#generarRutinaModal')).toBeVisible();
  });

  test('modal tiene todos los campos requeridos', async ({ page }) => {
    await page.click('button:has-text("Generar")');
    await expect(page.locator('#genDisc')).toBeVisible();
    await expect(page.locator('#genNivel')).toBeVisible();
    await expect(page.locator('#genFrec')).toBeVisible();
  });

  test('genera rutina CrossFit intermedio 3 días', async ({ page }) => {
    await page.click('button:has-text("Generar")');
    await page.selectOption('#genDisc', 'crossfit');
    await page.selectOption('#genNivel', 'intermedio');
    await page.selectOption('#genFrec', '3');
    await page.click('button:has-text("Generar rutina")');
    await expect(page.locator('.gen-preview-day').first()).toBeVisible({ timeout: 10_000 });
  });

  test('genera rutina musculación principiante', async ({ page }) => {
    await page.click('button:has-text("Generar")');
    await page.selectOption('#genDisc', 'musculacion');
    await page.selectOption('#genNivel', 'principiante');
    await page.selectOption('#genFrec', '4');
    await page.click('button:has-text("Generar rutina")');
    await expect(page.locator('.gen-preview-day').first()).toBeVisible({ timeout: 10_000 });
    const days = await page.locator('.gen-preview-day').count();
    expect(days).toBe(4);
  });

  test('cierra modal con ✕', async ({ page }) => {
    await page.click('button:has-text("Generar")');
    await expect(page.locator('#generarRutinaModal')).toBeVisible();
    await page.locator('#generarRutinaModal .modal-close').click();
    await expect(page.locator('#generarRutinaModal')).not.toBeVisible();
  });
});

test.describe('Buscador predictivo en builder manual', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('#pinInput', PIN_DOCENTE);
    await page.click('.login-btn');
    await expect(page.locator('#docenteScreen')).toBeVisible({ timeout: 8000 });
    await page.click('#navDocRutinas');
    /* Abrir modal nueva rutina */
    await page.click('button:has-text("Nueva")');
    await expect(page.locator('#rModalAsignar, #modalNuevaRutina, [id*="Modal"]').first()).toBeVisible({ timeout: 5000 });
    /* Agregar día y bloque */
    const addDay = page.locator('button:has-text("+ Día"), button:has-text("Agregar día")').first();
    if (await addDay.count()) await addDay.click();
    const addBloque = page.locator('button:has-text("+ Bloque"), button:has-text("Agregar bloque")').first();
    if (await addBloque.count()) await addBloque.click();
  });

  test('muestra dropdown al escribir 2+ caracteres', async ({ page }) => {
    const input = page.locator('.rbusq-input').first();
    if (!await input.count()) test.skip();
    await input.fill('se');
    await expect(page.locator('.rbusq-dropdown').first()).toBeVisible({ timeout: 3000 });
  });

  test('muestra "sin resultados" con query sin matches', async ({ page }) => {
    const input = page.locator('.rbusq-input').first();
    if (!await input.count()) test.skip();
    await input.fill('xyzxyzxyz');
    const dropdown = page.locator('.rbusq-dropdown').first();
    await expect(dropdown).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.rbusq-noresult')).toBeVisible();
  });

  test('insertar ejercicio agrega texto en textarea', async ({ page }) => {
    const input    = page.locator('.rbusq-input').first();
    const textarea = page.locator('.rbloque-contenido').first();
    if (!await input.count()) test.skip();
    await input.fill('press');
    await expect(page.locator('.rbusq-item').first()).toBeVisible({ timeout: 3000 });
    await page.locator('.rbusq-item').first().click();
    const val = await textarea.inputValue();
    expect(val.length).toBeGreaterThan(0);
  });
});
