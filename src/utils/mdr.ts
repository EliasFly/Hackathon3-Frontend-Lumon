// Lumon Macrodata Refinement Engine
// Algorithms for scary number detection, connectivity clustering & bin classification

import type { Rules, Tile, CellCoord, TemperBin } from '../types/lumon';

export interface ScaryCell {
  r: number;
  c: number;
  localR: number;
  localC: number;
  digit: number;
  tremor: number;
  refinedBin: string; // '.' or 'W','F','D','M'
  isScary: boolean;
}

export interface ScaryGroup {
  id: string;
  cells: CellCoord[];
  digits: number[];
  targetBin: TemperBin;
  strategyUsed: string;
  avgTremor: number;
  size: number;
}

/**
 * Decodes base64 tremor string into Uint8Array (0-100 values)
 */
export function decodeTremorBytes(base64: string): Uint8Array {
  try {
    const binStr = atob(base64);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    return bytes;
  } catch {
    return new Uint8Array(0);
  }
}

/**
 * Parses a tile into an indexed grid of cells with decoded tremors
 */
export function parseTileCells(tile: Tile, rules: Rules): ScaryCell[][] {
  const tremors = decodeTremorBytes(tile.tremor);
  const grid: ScaryCell[][] = [];

  for (let r = 0; r < tile.rows; r++) {
    const row: ScaryCell[] = [];
    for (let c = 0; c < tile.cols; c++) {
      const idx = r * tile.cols + c;
      const digit = parseInt(tile.values[idx] || '0', 10);
      const tremor = tremors[idx] ?? 0;
      const refinedBin = tile.bins[idx] || '.';
      const isScary = tremor >= rules.tremorThreshold && refinedBin === '.';

      row.push({
        r: tile.originRow + r,
        c: tile.originCol + c,
        localR: r,
        localC: c,
        digit,
        tremor,
        refinedBin,
        isScary,
      });
    }
    grid.push(row);
  }

  return grid;
}

/**
 * Finds all valid scary groups inside a tile following connectivity & size rules
 */
export function findScaryGroups(cellsGrid: ScaryCell[][], rules: Rules): ScaryGroup[] {
  const rows = cellsGrid.length;
  if (rows === 0) return [];
  const cols = cellsGrid[0].length;
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));

  const groups: ScaryGroup[] = [];

  const directions = rules.connectivity === 8
    ? [
        [-1, 0], [1, 0], [0, -1], [0, 1],
        [-1, -1], [-1, 1], [1, -1], [1, 1],
      ]
    : [
        [-1, 0], [1, 0], [0, -1], [0, 1],
      ];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = cellsGrid[r][c];
      if (!cell.isScary || visited[r][c]) continue;

      // BFS to find connected scary cells
      const queue: [number, number][] = [[r, c]];
      visited[r][c] = true;
      const clusterCells: ScaryCell[] = [];

      while (queue.length > 0) {
        const [currR, currC] = queue.shift()!;
        const currCell = cellsGrid[currR][currC];
        clusterCells.push(currCell);

        for (const [dr, dc] of directions) {
          const nr = currR + dr;
          const nc = currC + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            if (!visited[nr][nc] && cellsGrid[nr][nc].isScary) {
              visited[nr][nc] = true;
              queue.push([nr, nc]);
            }
          }
        }
      }

      // Check size criteria: minGroupSize <= size <= maxGroupSize
      if (clusterCells.length >= rules.minGroupSize && clusterCells.length <= rules.maxGroupSize) {
        const digits = clusterCells.map((c) => c.digit);
        const targetBin = calculateTargetBin(digits, rules);
        const totalTremor = clusterCells.reduce((acc, c) => acc + c.tremor, 0);

        groups.push({
          id: `grp-${clusterCells[0].r}-${clusterCells[0].c}`,
          cells: clusterCells.map((c) => ({ r: c.r, c: c.c })),
          digits,
          targetBin,
          strategyUsed: rules.binning.strategy,
          avgTremor: Math.round(totalTremor / clusterCells.length),
          size: clusterCells.length,
        });
      }
    }
  }

  return groups;
}

/**
 * Calculates target bin according to rules
 */
export function calculateTargetBin(digits: number[], rules: Rules): TemperBin {
  const { strategy, order } = rules.binning;
  let idx = 0;

  if (strategy === 'DIGIT_SUM_MOD') {
    const sum = digits.reduce((a, b) => a + b, 0);
    idx = sum % 4;
  } else if (strategy === 'MAX_DIGIT_MOD') {
    const maxDigit = Math.max(...digits, 0);
    idx = maxDigit % 4;
  }

  return order[idx] || order[0];
}

export const TEMPER_NAMES: Record<TemperBin, { name: string; label: string; color: string; bg: string }> = {
  WO: { name: 'Woe', label: 'WO', color: 'text-blue-400', bg: 'bg-blue-600/30 border-blue-500' },
  FC: { name: 'Frolic', label: 'FC', color: 'text-emerald-400', bg: 'bg-emerald-600/30 border-emerald-500' },
  DR: { name: 'Dread', label: 'DR', color: 'text-amber-400', bg: 'bg-amber-600/30 border-amber-500' },
  MA: { name: 'Malice', label: 'MA', color: 'text-rose-400', bg: 'bg-rose-600/30 border-rose-500' },
};
