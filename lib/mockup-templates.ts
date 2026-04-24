export type MockupPlacement = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotate?: number;
};

const MUG_PLACEMENTS: MockupPlacement[] = [
  { x: 0.24, y: 0.41, width: 0.34, height: 0.22, rotate: 0 },
  { x: 0.2, y: 0.43, width: 0.28, height: 0.2, rotate: -10 },
  { x: 0.38, y: 0.43, width: 0.28, height: 0.2, rotate: 10 },
  { x: 0.27, y: 0.44, width: 0.32, height: 0.22, rotate: -4 },
];

const DEFAULT_PLACEMENTS: MockupPlacement[] = [
  { x: 0.32, y: 0.3, width: 0.36, height: 0.36, rotate: 0 },
  { x: 0.31, y: 0.31, width: 0.34, height: 0.34, rotate: -8 },
  { x: 0.35, y: 0.31, width: 0.34, height: 0.34, rotate: 8 },
];

export function getMockupPlacement(category: string | undefined, index: number): MockupPlacement {
  const normalizedCategory = (category ?? "").toUpperCase();
  const placements = normalizedCategory === "MUG" ? MUG_PLACEMENTS : DEFAULT_PLACEMENTS;
  return placements[index % placements.length] ?? placements[0];
}
