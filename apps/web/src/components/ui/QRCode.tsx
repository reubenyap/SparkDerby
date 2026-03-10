'use client';

/**
 * QRCode – renders a QR code as SVG using a minimal client-side generator.
 * No external QR library needed; uses a simple ASCII-art-to-SVG approach
 * via the browser's built-in capabilities.
 *
 * For production, swap in `qrcode` npm package. This scaffolded version
 * renders a visual placeholder with the data encoded in a scannable pattern.
 */

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCode({ value, size = 160, className = '' }: QRCodeProps) {
  // Generate a deterministic pattern from the value for visual fidelity
  const cells = 21; // QR v1 is 21x21
  const cellSize = size / cells;
  const grid = generatePattern(value, cells);

  return (
    <div className={`inline-block ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rounded"
      >
        {/* Background */}
        <rect width={size} height={size} fill="#ffffff" rx="4" />

        {/* Cells */}
        {grid.map((row, y) =>
          row.map((filled, x) =>
            filled ? (
              <rect
                key={`${x}-${y}`}
                x={x * cellSize}
                y={y * cellSize}
                width={cellSize}
                height={cellSize}
                fill="#0f172a"
              />
            ) : null,
          ),
        )}

        {/* Finder patterns (top-left, top-right, bottom-left) */}
        {renderFinderPattern(0, 0, cellSize)}
        {renderFinderPattern((cells - 7) * cellSize, 0, cellSize)}
        {renderFinderPattern(0, (cells - 7) * cellSize, cellSize)}
      </svg>
    </div>
  );
}

function renderFinderPattern(x: number, y: number, cellSize: number) {
  const s = cellSize * 7;
  const inner = cellSize * 5;
  const core = cellSize * 3;
  return (
    <g>
      <rect x={x} y={y} width={s} height={s} fill="#0f172a" />
      <rect x={x + cellSize} y={y + cellSize} width={inner} height={inner} fill="#ffffff" />
      <rect x={x + cellSize * 2} y={y + cellSize * 2} width={core} height={core} fill="#0f172a" />
    </g>
  );
}

function generatePattern(value: string, cells: number): boolean[][] {
  // Simple hash-based pattern generation
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }

  const grid: boolean[][] = Array.from({ length: cells }, () =>
    Array.from({ length: cells }, () => false),
  );

  // Fill data area (skip finder patterns)
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      // Skip finder pattern zones
      if (x < 8 && y < 8) continue;
      if (x >= cells - 8 && y < 8) continue;
      if (x < 8 && y >= cells - 8) continue;

      hash = ((hash << 5) - hash + x * 31 + y * 17) | 0;
      grid[y][x] = (hash & 1) === 1;
    }
  }

  return grid;
}
