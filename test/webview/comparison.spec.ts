import { test, expect } from '@playwright/test';
import { loadInited, getState, hideModalityViaMenu } from './helpers';

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

for (const count of [2, 3, 4]) {
  test(`${count} panes: layout, synchronized pan/zoom, ordering and captioned copy`, async ({ page }) => {
    await loadInited(page, {
      tupleNames: ['scene'], modalities: ['A', 'B', 'C', 'D'].slice(0, count),
      width: 320, height: 200, votingEnabled: false,
    });
    await page.locator('#layout-btn').click();
    await expect(page.locator('#layout-btn')).toHaveAttribute('aria-pressed', 'true');
    const canvas = page.locator('#canvas');
    const box = (await canvas.boundingBox())!;
    const cols = count === 4 ? 2 : count;
    const rows = count === 4 ? 2 : 1;
    // Clicking a pane selects its actual display index, including the bottom-right grid cell.
    await page.mouse.click(box.x + box.width * (cols - 0.5) / cols, box.y + box.height * (rows - 0.5) / rows - 20);
    expect((await getState(page)).currentModalityIndex).toBe(count - 1);
    await page.mouse.wheel(0, -200);
    await expect.poll(async () => (await getState(page)).zoom).toBeGreaterThan(1);
    const before = await getState(page);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * (cols - 0.5) / cols + 25, box.y + box.height * (rows - 0.5) / rows);
    await page.mouse.up();
    expect((await getState(page)).panX).toBeCloseTo(before.panX + 25);
    await page.locator('#reorder-left').click();
    expect((await getState(page)).modalityOrder[count - 2]).toBe(count - 1);
    await page.locator('#copy-comparison-btn').click();
    await expect(page.locator('#copy-toast')).toHaveText('Image copied');
    const copied = await page.evaluate(async () => {
      const blob = await (await navigator.clipboard.read())[0].getType('image/png');
      const bitmap = await createImageBitmap(blob);
      const c = document.createElement('canvas');
      c.width = bitmap.width; c.height = bitmap.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0);
      // Captions have a white background below the image, including in exported output.
      return { width: c.width, height: c.height, pixel: Array.from(ctx.getImageData(10, c.height - 10, 1, 1).data) };
    });
    expect(copied.width).toBe(Math.round(box.width * 2));
    expect(copied.height).toBe(Math.round(box.height * 2));
    expect(copied.pixel).toEqual([255, 255, 255, 255]);
    await hideModalityViaMenu(page, 0);
    await expect(page.locator('#status-info')).toContainText(`${count - 1} images`);
    await page.locator('#layout-btn').click();
    await expect(page.locator('#layout-btn')).toHaveAttribute('aria-pressed', 'false');
  });
}
