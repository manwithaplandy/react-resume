import type {Page} from '@playwright/test';

import {expect, test} from './fixtures';

const search = (page: Page) => page.getByRole('search', {name: 'Career search'});
const input = (page: Page) => search(page).getByRole('textbox', {name: 'Find a role, skill, or achievement'});
const overview = (page: Page) => page.getByRole('button', {name: 'Show overview', exact: true});

for (const mode of ['list', '3d']) {
  test(`direct search preserves evidence, focus and native input keys in ${mode}`, async ({page}) => {
    await page.goto(`/graph?view=${mode}`);
    await input(page).fill('  pYtHoN  ');
    await expect(input(page)).toBeFocused();
    const result = search(page).getByRole('button', {name: 'Python', exact: true});
    await result.click();
    await expect(result).toBeFocused();
    await expect(input(page)).toHaveValue('  pYtHoN  ');
    await expect.poll(() => page.evaluate(() => decodeURIComponent(location.hash))).toBe('#node=skill:python');
    await expect(page.getByRole('status')).toContainText('Focused on Python');
    const details =
      mode === 'list'
        ? page.locator('[id="graph-details-skill:python"]')
        : page.getByRole('region', {name: 'Selected career item'});
    await expect(details).toContainText('Primary language — powers production AI agents');
    if (mode === 'list') {
      await expect(details.getByRole('button', {name: /Self-service RAG platform/})).toBeVisible();
    } else {
      await expect(page.locator('canvas')).toBeVisible();
      await expect(details).toContainText('11 connections');
    }
    await input(page).focus();
    await input(page).press('Home');
    await input(page).press('ArrowRight');
    expect(await input(page).evaluate(element => (element as HTMLInputElement).selectionStart)).toBe(1);
    await input(page).press('ArrowUp');
    await expect(input(page)).toBeFocused();
    await expect.poll(() => page.evaluate(() => decodeURIComponent(location.hash))).toBe('#node=skill:python');
    await input(page).fill('Georgia Tech');
    await search(page).getByRole('button', {name: 'M.S. Computer Science, Georgia Tech', exact: true}).click();
    await expect
      .poll(() => page.evaluate(() => decodeURIComponent(location.hash)))
      .toBe('#node=education:gatech-ms-cs');
    await input(page).fill('impossible phrase xyzzy');
    await expect(search(page)).toContainText('No results');
    await expect(search(page).getByRole('button')).toHaveCount(0);
    await input(page).fill('');
    await expect(search(page).getByRole('button')).toHaveCount(0);
    await expect(search(page)).toContainText('Enter a role, skill, or achievement to find a match.');
    await overview(page).click();
    await expect(page.getByRole('status')).toContainText('Nothing selected');
    await expect(page.getByRole('navigation', {name: 'Focus history'})).toHaveCount(0);
    await expect(page.getByRole('region', {name: 'Selected career item'})).toHaveCount(0);
    await expect(page.locator('button[aria-current="true"]')).toHaveCount(0);
  });
}

for (const reduction of ['system', 'manual', 'animated'] as const) {
  test(`${reduction} overview clears the trail and repeated requests recover the real camera after orbit and zoom`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(45000);
    if (reduction === 'system') await page.emulateMedia({reducedMotion: 'reduce'});
    else if (reduction === 'manual') await page.setViewportSize({width: 390, height: 844});
    // Observe the stationary starfield model-view matrix sent to WebGL.
    // Its identity transform isolates the real camera from force-layout motion.
    await page.addInitScript(() => {
      const locations = new WeakMap<WebGLUniformLocation, string>();
      const prototype = WebGL2RenderingContext.prototype;
      const getLocation = prototype.getUniformLocation;
      prototype.getUniformLocation = function (program, name) {
        const location = getLocation.call(this, program, name);
        if (
          location &&
          this.getAttachedShaders(program)?.some(shader => this.getShaderSource(shader)?.includes('gl_PointSize'))
        )
          locations.set(location, name);
        return location;
      };
      const matrix = prototype.uniformMatrix4fv;
      prototype.uniformMatrix4fv = function (location, transpose, value) {
        if (location && locations.get(location) === 'modelViewMatrix') {
          (window as unknown as {graphView: number[]}).graphView = Array.from(value);
        }
        matrix.call(this, location, transpose, value);
      };
    });
    const view = () => page.evaluate(() => (window as unknown as {graphView: number[]}).graphView);
    await page.goto('/graph?view=3d#node=skill:python');
    if (reduction === 'manual') await page.getByRole('button', {name: 'Reduce motion', exact: true}).click();
    await expect(page.locator('canvas')).toBeVisible();
    const panel = page.getByRole('region', {name: 'Selected career item'});
    await panel.getByRole('button', {name: 'Next connection', exact: true}).click();
    await panel.getByRole('button', {name: /^Go to /}).click();
    await panel.getByRole('button', {name: 'Show more', exact: true}).click();
    await overview(page).click();
    await expect(panel).toHaveCount(0);
    await expect(page.getByRole('navigation', {name: 'Focus history'})).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('');
    // Let the force simulation settle before comparing framing of its final positions.
    await page.waitForTimeout(10500);
    await overview(page).click();
    await expect.poll(view).toHaveLength(16);
    await page.waitForTimeout(1000);
    const fitted = await view();
    await page.locator('canvas').screenshot({path: testInfo.outputPath('overview.png')});
    const canvas = page.locator('canvas');
    await canvas.scrollIntoViewIfNeeded();
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 65, box.y + box.height / 2 + 25, {steps: 8});
    await page.mouse.up();
    await page.mouse.wheel(0, -550);
    await expect.poll(view).not.toEqual(fitted);
    await overview(page).click();
    await expect
      .poll(async () => {
        const actual = await view();
        return Math.max(...actual.map((value, index) => Math.abs(value - fitted[index])));
      })
      .toBeLessThan(0.05);
    if (reduction === 'animated') {
      // Start real flights, then supersede them before their 700ms duration ends.
      await input(page).fill('Python');
      await search(page).getByRole('button', {name: 'Python', exact: true}).click();
      await page.waitForTimeout(250);
      await input(page).fill('Georgia Tech');
      await search(page).getByRole('button', {name: 'M.S. Computer Science, Georgia Tech', exact: true}).click();
      await page.waitForTimeout(250);
      await overview(page).click();
      await input(page).fill('');
      await expect
        .poll(async () => Math.max(...(await view()).map((value, index) => Math.abs(value - fitted[index]))))
        .toBeLessThan(0.05);
      await page.waitForTimeout(800);
      expect(Math.max(...(await view()).map((value, index) => Math.abs(value - fitted[index])))).toBeLessThan(0.05);
    }
    await page.getByRole('application').focus();
    await page.keyboard.press('ArrowDown');
    await expect(panel).toHaveCount(0);
    await input(page).fill('Python');
    await search(page).getByRole('button', {name: 'Python', exact: true}).click();
    await expect(panel.getByRole('button', {name: 'Back to previous node'})).toBeDisabled();
    await expect(panel.getByRole('button', {name: 'Show more', exact: true})).toBeVisible();
  });
}

test('search counts the full graph, matches normalized descriptions, and every existing node remains deep-linkable', async ({
  page,
}) => {
  await page.goto('/graph?view=list');
  const entries = page.locator('button[id^="graph-entry-"]');
  const nodes = await entries.evaluateAll(elements =>
    elements.map(element => ({id: element.id.slice('graph-entry-'.length), label: element.textContent!.trim()})),
  );
  expect(nodes.length).toBeGreaterThan(10);
  await expect(search(page)).toContainText(`${nodes.length} career items.`);
  await input(page).fill('a');
  await expect(search(page).getByRole('button')).toHaveCount(10);
  await expect(search(page)).toContainText(/Showing 10 of \d+ results/);
  await input(page).fill('daily    stats-aggregation');
  await expect(search(page).getByRole('button', {name: 'Python', exact: true})).toBeVisible();
  for (const node of nodes) {
    await page.evaluate(id => {
      location.hash = `node=${encodeURIComponent(id)}`;
    }, node.id);
    await expect(page.locator('button[aria-current="true"]')).toHaveText(node.label);
    await expect(page.locator(`[id="graph-details-${node.id}"]`)).toBeAttached();
  }
});

test('a phone visitor can follow skill evidence across views and recover overview', async ({page}, testInfo) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/graph?view=3d');
  await input(page).fill('Python');
  await search(page).getByRole('button', {name: 'Python', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Selected career item'})).toContainText('Primary language');
  await page.getByRole('button', {name: 'Text view', exact: true}).click();
  await page
    .locator('[id="graph-details-skill:python"]')
    .getByRole('button', {name: /Self-service RAG platform/})
    .click();
  await expect(page.locator('[id="graph-details-responsibility:self-service-rag-platform"]')).toContainText(
    '4x improvement in workflow efficiency',
  );
  await page.getByRole('button', {name: '3D view', exact: true}).click();
  await expect(
    page.getByRole('heading', {name: 'Self-service RAG platform (4x, 10k+ users)', exact: true}),
  ).toBeVisible();
  await input(page).fill('Georgia Tech');
  await search(page).getByRole('button', {name: 'M.S. Computer Science, Georgia Tech', exact: true}).click();
  await page.getByRole('application').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await page.screenshot({path: testInfo.outputPath('phone-selected-education.png')});
  await overview(page).click();
  await expect(page.getByRole('region', {name: 'Selected career item'})).toHaveCount(0);
});
