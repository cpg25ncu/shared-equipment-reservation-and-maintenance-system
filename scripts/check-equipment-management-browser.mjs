import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { repo, runtime, baseURL, demoPassword, state } from './lib/local-demo-client.mjs';

// Actual local UI/session/CSRF/application/database only. No intercepted requests or SQL writes.
assert.equal(state.data, path.join(runtime, 'pg18'));
const require = createRequire(path.join(repo, 'frontend/package.json'));
const { chromium, expect } = require('@playwright/test');
const output = path.join(runtime, 'equipment-management-browser-' + Date.now());
fs.mkdirSync(output, { recursive: true });
const summary = {
  status: 'running', mocked: false, startedAt: new Date().toISOString(), checks: [], records: [],
  startingHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(),
  fetchedMain: execFileSync('git', ['rev-parse', 'origin/main'], { cwd: repo, encoding: 'utf8' }).trim(),
  sourceHashes: ['scripts/check-equipment-management-browser.mjs',
    'frontend/src/features/equipment/EquipmentManagementPage.tsx',
    'app/src/main/java/sg/edu/nus/serms/equipment/service/EquipmentManagementService.java'].map(file => ({
    path: file, sha256: createHash('sha256').update(fs.readFileSync(path.join(repo, file))).digest('hex'),
  })),
};
const pass = label => { summary.checks.push(label); console.log('PASS ' + label); };
const browser = await chromium.launch({ headless: true });
const errors = [];
async function responseFor(page, method, route, action) {
  const response = page.waitForResponse(r => r.request().method() === method && new URL(r.url()).pathname === route);
  await action();
  return response;
}
try {
  for (const [device, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    for (const account of ['custodian', 'admin']) {
      const context = await browser.newContext({ viewport });
      let traced = false;
      try {
        const page = await context.newPage();
        page.setDefaultTimeout(30000);
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(baseURL + '/login');
        await page.getByLabel('Email address').fill(account + '@example.test');
        await page.getByLabel('Password', { exact: true }).fill(demoPassword);
        await page.getByRole('button', { name: 'Sign in', exact: true }).click();
        await expect(page.getByRole('heading', { level: 1, name: /^Welcome/ })).toBeVisible();
        await context.tracing.start({ screenshots: true, snapshots: true });
        traced = true;
        await page.getByRole('link', { name: 'Manage equipment', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Manage equipment', exact: true })).toBeVisible();
        const marker = randomUUID().slice(0, 8);
        const category = 'QA-' + marker;
        await page.getByRole('textbox', { name: 'New category', exact: true }).fill(category);
        const createdCategory = await responseFor(page, 'POST', '/api/v1/equipment/manage/categories',
          () => page.getByRole('button', { name: 'Create category', exact: true }).click());
        assert.equal(createdCategory.status(), 201);
        await expect(page.getByText('Category created.', { exact: true })).toBeVisible();
        const name = 'A Quality ' + device + ' ' + account + ' ' + marker;
        await page.getByRole('button', { name: 'Register equipment', exact: true }).click();
        const form = page.getByRole('form', { name: 'Equipment form' });
        await form.getByRole('textbox', { name: 'Asset tag', exact: true }).fill('DEMO-QA-' + marker);
        await form.getByRole('textbox', { name: 'Serial number', exact: true }).fill('QA-SERIAL-' + marker);
        await form.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
        await form.getByRole('combobox', { name: 'Category', exact: true }).selectOption(category);
        await form.getByRole('textbox', { name: 'Location', exact: true }).fill('Quality acceptance lab');
        await form.getByLabel('Requires approval', { exact: true }).check();
        await form.getByLabel(/Maximum borrowing duration/).fill('PT2H');
        const registered = await responseFor(page, 'POST', '/api/v1/equipment/manage',
          () => form.getByRole('button', { name: 'Save equipment', exact: true }).click());
        assert.equal(registered.status(), 201);
        const item = await registered.json();
        assert.equal(item.name, name);
        assert.equal(item.status, 'AVAILABLE');
        assert.equal(item.requiresApproval, true);
        assert.equal(item.maxBorrowDuration, 'PT2H');
        await expect(page.getByText('Equipment registered.', { exact: true })).toBeVisible();
        summary.records.push({ device, account, equipmentId: item.equipmentId, assetTag: item.assetTag, category });
        pass(device + ' ' + account + ': actual category creation and equipment registration');
        await page.getByRole('button', { name: 'Edit ' + name, exact: true }).click();
        await form.getByRole('textbox', { name: 'Location', exact: true }).fill('Updated quality lab');
        const update = await responseFor(page, 'PUT', '/api/v1/equipment/manage/' + item.equipmentId,
          () => form.getByRole('button', { name: 'Save equipment', exact: true }).click());
        assert.equal(update.status(), 200);
        const updated = await update.json();
        assert.equal(updated.location, 'Updated quality lab');
        assert.equal(updated.status, 'AVAILABLE');
        assert.ok(updated.version > item.version);
        await expect(page.getByText('Equipment updated.', { exact: true })).toBeVisible();
        pass(device + ' ' + account + ': versioned equipment update without unintended status change');
        const renamedCategory = category + '-renamed';
        await page.getByRole('combobox', { name: 'Category to rename', exact: true }).selectOption(category);
        await page.getByRole('textbox', { name: 'New name', exact: true }).fill(renamedCategory);
        const rename = await responseFor(page, 'PATCH', '/api/v1/equipment/manage/categories/' + category,
          () => page.getByRole('button', { name: 'Rename category', exact: true }).click());
        assert.equal(rename.status(), 200);
        await expect(page.getByText('Category renamed.', { exact: true })).toBeVisible();
        // Records are table rows since the #26 visual pass, with the status shown by its display name.
        const card = page.getByRole('row').filter({ hasText: item.assetTag });
        await expect(card).toContainText(renamedCategory);
        pass(device + ' ' + account + ': ordinary category rename cascades to existing equipment');
        await page.getByRole('button', { name: 'Retire ' + name, exact: true }).click();
        const retirement = await responseFor(page, 'POST', '/api/v1/equipment/manage/' + item.equipmentId + '/retire',
          () => page.getByRole('alertdialog').getByRole('button', { name: 'Retire equipment', exact: true }).click());
        assert.equal(retirement.status(), 200);
        assert.equal((await retirement.json()).status, 'RETIRED');
        await expect(page.getByText('Equipment retired.', { exact: true })).toBeVisible();
        await expect(card).toContainText('Retired');
        await expect(card.getByRole('button')).toHaveCount(0);
        const catalogue = await page.request.get(baseURL + '/api/v1/equipment?' + new URLSearchParams({ q: item.assetTag }));
        assert.equal(catalogue.status(), 200);
        assert.equal((await catalogue.json()).totalElements, 0);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'No page-level overflow');
        await page.screenshot({ path: path.join(output, device + '-' + account + '-retired.png'), fullPage: true });
        pass(device + ' ' + account + ': confirmed retirement retains history and excludes the item from search');
        await page.getByRole('button', { name: 'Sign out', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
      } finally {
        if (traced) await context.tracing.stop({ path: path.join(output, device + '-' + account + '-private-trace.zip') });
        await context.close();
      }
    }
  }
  assert.deepEqual(errors, [], 'No uncaught browser errors');
  summary.status = 'passed';
} catch (error) {
  summary.status = 'failed';
  summary.failure = String(error.message).replaceAll(demoPassword, '[redacted]');
  console.error(summary.failure);
  process.exitCode = 1;
} finally {
  summary.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify(summary, null, 2) + '\n');
  await browser.close();
  console.log('Equipment management evidence: ' + output);
}
