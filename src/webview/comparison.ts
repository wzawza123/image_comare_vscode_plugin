/** Shared geometry for the live comparison and captioned clipboard export. */
export interface ComparisonCell {
  x: number; y: number; width: number; height: number; index: number;
}

export function comparisonCells(indices: number[], width: number, height: number): ComparisonCell[] {
  const columns = indices.length <= 3 ? Math.max(1, indices.length) : Math.ceil(Math.sqrt(indices.length));
  const rows = Math.ceil(indices.length / columns);
  return indices.map((index, i) => ({
    index, x: (i % columns) * width / columns, y: Math.floor(i / columns) * height / rows,
    width: width / columns, height: height / rows,
  }));
}

export const CAPTION_HEIGHT = 40;

export function drawComparison(
  ctx: CanvasRenderingContext2D, cells: ComparisonCell[],
  images: ({ img: HTMLImageElement; width: number; height: number } | undefined)[],
  labels: string[], zoom: number, panX: number, panY: number, selected = -1,
): void {
  for (const cell of cells) {
    const { x, y, width, height, index } = cell;
    const imageHeight = Math.max(1, height - CAPTION_HEIGHT);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, imageHeight);
    ctx.clip();
    ctx.fillStyle = '#171717';
    ctx.fillRect(x, y, width, imageHeight);
    const image = images[index];
    if (image?.img) {
      const scale = Math.min(width / image.width, imageHeight / image.height) * zoom;
      const w = image.width * scale, h = image.height * scale;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image.img, x + (width - w) / 2 + panX, y + (imageHeight - h) / 2 + panY, w, h);
    } else {
      ctx.fillStyle = '#bbb';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(image ? 'Image not available' : 'Loading…', x + width / 2, y + imageHeight / 2, Math.max(1, width - 16));
    }
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y + imageHeight, width, CAPTION_HEIGHT);
    ctx.fillStyle = '#111';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labels[index], x + width / 2, y + imageHeight + CAPTION_HEIGHT / 2, Math.max(1, width - 20));
    ctx.textBaseline = 'alphabetic';
    ctx.strokeStyle = index === selected ? '#0098ff' : '#666';
    ctx.lineWidth = index === selected ? 3 : 1;
    ctx.strokeRect(x + 1.5, y + 1.5, Math.max(0, width - 3), Math.max(0, height - 3));
  }
}
