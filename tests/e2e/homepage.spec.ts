import {expect, test} from './fixtures';

for (const width of [320, 390, 430]) {
  test(`homepage fits ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height: 844});
    await page.goto('/');
    await expect(page.getByRole('heading', {level: 1})).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
      .toBeLessThanOrEqual(1);
    for (const link of await page.locator('#hero a').all()) {
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    }
  });
}

test('homepage fits with 200% text', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900});
  await page.goto('/');
  await page.locator('html').evaluate(element => {
    element.style.fontSize = '200%';
  });

  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
    .toBeLessThanOrEqual(1);
});
