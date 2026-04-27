export const APPAREL_EDITOR_CANVAS_WIDTH = 520;
export const APPAREL_EDITOR_CANVAS_HEIGHT = 520;

export type ApparelSurfaceId =
  | "front"
  | "back"
  | "sleeve-right"
  | "sleeve-left"
  | "neck-label-inner";

export const DEFAULT_APPAREL_SURFACE_ID: ApparelSurfaceId = "front";

type Point3D = [number, number, number];

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type BoundsVector = {
  x: number;
  y: number;
  z: number;
};

export type ApparelPreviewBounds = {
  min: BoundsVector;
  max: BoundsVector;
  center: BoundsVector;
  size: BoundsVector;
};

type ApparelPreviewView = {
  cameraPosition: Point3D;
  target: Point3D;
};

type ApparelPreviewDecal = {
  position: Point3D;
  rotation: Point3D;
  scale: Point3D;
};

function aspectScale(height: number, aspect: number, depth: number): Point3D {
  return [height * aspect, height, depth];
}

type ApparelSurface = {
  id: ApparelSurfaceId;
  label: string;
  backgroundImage: string;
  getPrintArea: (width: number, height: number) => Rect;
  previewView: ApparelPreviewView;
  getPreviewDecal: (bounds: ApparelPreviewBounds) => ApparelPreviewDecal;
};

const APPAREL_TECH_DRAWINGS_BASE = "/t-shirt%20tech%20drawing";

function scaleCoverRect(
  width: number,
  height: number,
  sourceWidth: number,
  sourceHeight: number,
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number
): Rect {
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const scaledWidth = sourceWidth * scale;
  const scaledHeight = sourceHeight * scale;
  const offsetX = (width - scaledWidth) / 2;
  const offsetY = (height - scaledHeight) / 2;

  return {
    x: Math.round(offsetX + rectX * scale),
    y: Math.round(offsetY + rectY * scale),
    width: Math.round(rectWidth * scale),
    height: Math.round(rectHeight * scale),
  };
}

const APPAREL_FRONT_EDITOR_BACKGROUND = `${APPAREL_TECH_DRAWINGS_BASE}/front.svg`;
const APPAREL_BACK_EDITOR_BACKGROUND = `${APPAREL_TECH_DRAWINGS_BASE}/back.svg`;
const APPAREL_SLEEVE_EDITOR_BACKGROUND = `${APPAREL_TECH_DRAWINGS_BASE}/sleve.svg`;
const APPAREL_NECK_LABEL_EDITOR_BACKGROUND = `${APPAREL_TECH_DRAWINGS_BASE}/neck.svg`;

export const APPAREL_EDITOR_SURFACES: ApparelSurface[] = [
  {
    id: "front",
    label: "Front side",
    backgroundImage: APPAREL_FRONT_EDITOR_BACKGROUND,
    getPrintArea: (width, height) => scaleCoverRect(width, height, 900, 900, 340, 260, 220, 300),
    previewView: {
      cameraPosition: [0, 0.12, 5.6],
      target: [0, 0.02, 0],
    },
    getPreviewDecal: ({ center, max, size }) => ({
      position: [center.x, center.y - size.y * 0.015, max.z - size.z * 0.16],
      rotation: [0, 0, 0],
      scale: aspectScale(size.y * 0.46, 220 / 300, size.z * 0.34),
    }),
  },
  {
    id: "back",
    label: "Back side",
    backgroundImage: APPAREL_BACK_EDITOR_BACKGROUND,
    getPrintArea: (width, height) => scaleCoverRect(width, height, 900, 900, 340, 260, 220, 300),
    previewView: {
      cameraPosition: [0, 0.12, -5.6],
      target: [0, 0.02, 0],
    },
    getPreviewDecal: ({ center, min, size }) => ({
      position: [center.x, center.y - size.y * 0.015, min.z + size.z * 0.16],
      rotation: [0, Math.PI, 0],
      scale: aspectScale(size.y * 0.46, 220 / 300, size.z * 0.34),
    }),
  },
  {
    id: "sleeve-right",
    label: "Sleeve right",
    backgroundImage: APPAREL_SLEEVE_EDITOR_BACKGROUND,
    getPrintArea: (width, height) => scaleCoverRect(width, height, 400, 400, 140, 160, 120, 100),
    previewView: {
      cameraPosition: [5.4, 0.3, 4.4],
      target: [0.18, 0.08, 0.04],
    },
    getPreviewDecal: ({ center, max, size }) => ({
      position: [max.x - size.x * 0.14, center.y + size.y * 0.12, center.z + size.z * 0.015],
      rotation: [0, Math.PI / 2, 0],
      scale: aspectScale(size.y * 0.2, 120 / 100, size.x * 0.2),
    }),
  },
  {
    id: "sleeve-left",
    label: "Sleeve left",
    backgroundImage: APPAREL_SLEEVE_EDITOR_BACKGROUND,
    getPrintArea: (width, height) => scaleCoverRect(width, height, 400, 400, 140, 160, 120, 100),
    previewView: {
      cameraPosition: [-5.4, 0.3, 4.4],
      target: [-0.18, 0.08, 0.04],
    },
    getPreviewDecal: ({ center, min, size }) => ({
      position: [min.x + size.x * 0.14, center.y + size.y * 0.12, center.z + size.z * 0.015],
      rotation: [0, -Math.PI / 2, 0],
      scale: aspectScale(size.y * 0.2, 120 / 100, size.x * 0.2),
    }),
  },
  {
    id: "neck-label-inner",
    label: "Neck label inner",
    backgroundImage: APPAREL_NECK_LABEL_EDITOR_BACKGROUND,
    getPrintArea: (width, height) => scaleCoverRect(width, height, 900, 600, 350, 260, 200, 180),
    previewView: {
      cameraPosition: [0, 2.9, -4.4],
      target: [0, 0.22, -0.08],
    },
    getPreviewDecal: ({ center, max, min, size }) => ({
      position: [center.x, max.y - size.y * 0.15, min.z + size.z * 0.1],
      rotation: [0, Math.PI, 0],
      scale: aspectScale(size.y * 0.14, 200 / 180, size.z * 0.16),
    }),
  },
];

export function getApparelEditorSurface(
  surfaceId: ApparelSurfaceId = DEFAULT_APPAREL_SURFACE_ID
) {
  return (
    APPAREL_EDITOR_SURFACES.find((surface) => surface.id === surfaceId) ??
    APPAREL_EDITOR_SURFACES[0]
  );
}

export function getApparelPrintArea(
  width = APPAREL_EDITOR_CANVAS_WIDTH,
  height = APPAREL_EDITOR_CANVAS_HEIGHT,
  surfaceId: ApparelSurfaceId = DEFAULT_APPAREL_SURFACE_ID
): Rect {
  return getApparelEditorSurface(surfaceId).getPrintArea(width, height);
}

export function getApparelPreviewView(
  surfaceId: ApparelSurfaceId = DEFAULT_APPAREL_SURFACE_ID
): ApparelPreviewView {
  return getApparelEditorSurface(surfaceId).previewView;
}

export function getApparelPreviewDecal(
  bounds: ApparelPreviewBounds,
  surfaceId: ApparelSurfaceId = DEFAULT_APPAREL_SURFACE_ID
): ApparelPreviewDecal {
  return getApparelEditorSurface(surfaceId).getPreviewDecal(bounds);
}

export { APPAREL_FRONT_EDITOR_BACKGROUND };