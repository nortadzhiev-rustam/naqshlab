"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls, useGLTF } from "@react-three/drei";
import { Box, Check, Images, Sparkles } from "lucide-react";
import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  APPAREL_EDITOR_CANVAS_HEIGHT,
  APPAREL_EDITOR_CANVAS_WIDTH,
  getApparelPreviewDecal,
  getApparelPrintArea,
  getApparelPreviewView,
  type ApparelSurfaceId,
} from "@/lib/apparel-editor";
import { MUG_CANVAS_HEIGHT, MUG_CANVAS_WIDTH, MUG_WRAP_ANGLE } from "@/lib/mug-wrap";

type MugCaptureViewId = "front" | "angle" | "side";
type MugViewPreset = "interactive" | MugCaptureViewId;

type MugCaptureView = {
  id: MugCaptureViewId;
  label: string;
  cameraPosition: [number, number, number];
  target: [number, number, number];
};

const MUG_INTERACTIVE_VIEW = {
  cameraPosition: [0, 0.3, 5.2] as [number, number, number],
  target: [0, -0.05, 0] as [number, number, number],
};

const DEFAULT_APPAREL_MODEL_PATH = "/models/t-shirt-2.glb";

const MUG_CAPTURE_VIEWS: MugCaptureView[] = [
  {
    id: "front",
    label: "Front",
    cameraPosition: [0, 0.3, 5.2],
    target: [0, -0.05, 0],
  },
  {
    id: "angle",
    label: "Angle",
    cameraPosition: [3.3, 0.4, 4.05],
    target: [0, -0.05, 0],
  },
  {
    id: "side",
    label: "Side",
    cameraPosition: [5.15, 0.35, -0.35],
    target: [0, -0.05, 0],
  },
];

type Studio3DPreviewProps = {
  productName: string;
  productCategory?: string;
  apparelSurfaceId?: ApparelSurfaceId;
  variantLabel?: string;
  previewImage?: string;
  mockupImages: string[];
  isGeneratingMockups?: boolean;
  paintMode?: boolean;
  brushColor?: string;
  brushSize?: number;
  hasPaintLayer?: boolean;
  onPaintModeChange?: (enabled: boolean) => void;
  onBrushColorChange?: (color: string) => void;
  onBrushSizeChange?: (size: number) => void;
  onClearPaint?: () => void;
  onPaintTextureCommit?: (dataUrl: string) => void;
};

type MugModelProps = {
  modelPath?: string;
  textureUrl?: string;
  paintMode?: boolean;
  brushColor?: string;
  brushSize?: number;
  onTextureCommit?: (dataUrl: string) => void;
  onTextureReadyChange?: (ready: boolean) => void;
};

type MugCanvasProps = MugModelProps & {
  viewPreset?: MugViewPreset;
  captureKey?: string;
  onCapture?: (dataUrl: string) => void;
  transparentBackground?: boolean;
};

type ApparelCanvasProps = {
  modelPath?: string;
  textureUrl?: string;
  surfaceId?: ApparelSurfaceId;
};

type CanvasPoint = {
  x: number;
  y: number;
};

type MugSurfaceMaterial = THREE.Material & {
  color: THREE.Color;
  map: THREE.Texture | null;
  metalness?: number;
  roughness?: number;
  envMapIntensity?: number;
  needsUpdate: boolean;
};

function isMugSurfaceMaterial(material: THREE.Material): material is MugSurfaceMaterial {
  return "map" in material && "color" in material;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function loadPaintSource(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadApparelPreviewTexture(
  src: string,
  surfaceId: ApparelSurfaceId = "front"
): Promise<THREE.Texture> {
  const source = await loadPaintSource(src);
  const printArea = getApparelPrintArea(
    APPAREL_EDITOR_CANVAS_WIDTH,
    APPAREL_EDITOR_CANVAS_HEIGHT,
    surfaceId
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(printArea.width));
  canvas.height = Math.max(1, Math.round(printArea.height));

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to create apparel preview texture canvas");
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    source,
    printArea.x,
    printArea.y,
    printArea.width,
    printArea.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  return texture;
}

function getMugViewConfig(viewPreset: MugViewPreset) {
  if (viewPreset === "interactive") {
    return MUG_INTERACTIVE_VIEW;
  }

  return MUG_CAPTURE_VIEWS.find((view) => view.id === viewPreset) ?? MUG_INTERACTIVE_VIEW;
}

function MugCameraController({ viewPreset }: { viewPreset: MugViewPreset }) {
  const { camera } = useThree();
  const view = getMugViewConfig(viewPreset);

  useEffect(() => {
    camera.position.set(...view.cameraPosition);
    camera.lookAt(...view.target);
    camera.updateProjectionMatrix();
  }, [camera, viewPreset, view]);

  return null;
}

function MugSnapshotCapture({
  enabled,
  captureKey,
  onCapture,
}: {
  enabled: boolean;
  captureKey?: string;
  onCapture?: (dataUrl: string) => void;
}) {
  const { gl, scene, camera } = useThree();
  const frameCountRef = useRef(0);
  const capturedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    frameCountRef.current = 0;
    capturedKeyRef.current = null;
  }, [captureKey]);

  useFrame(() => {
    if (!enabled || !captureKey || !onCapture) return;
    if (capturedKeyRef.current === captureKey) return;

    frameCountRef.current += 1;
    if (frameCountRef.current < 12) return;

    gl.render(scene, camera);
    onCapture(gl.domElement.toDataURL("image/png"));
    capturedKeyRef.current = captureKey;
  });

  return null;
}

function MugModel({
  modelPath = "/models/mug.glb",
  textureUrl,
  paintMode = false,
  brushColor = "#111827",
  brushSize = 22,
  onTextureCommit,
  onTextureReadyChange,
}: MugModelProps) {
  const { scene } = useGLTF(modelPath);
  const [designTexture, setDesignTexture] = useState<THREE.Texture | null>(null);
  const paintSurfaceRef = useRef<{
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    texture: THREE.CanvasTexture;
  } | null>(null);
  const activePaintPointRef = useRef<CanvasPoint | null>(null);

  const commitTexture = useCallback(() => {
    const surface = paintSurfaceRef.current;
    if (!surface) return;
    onTextureCommit?.(surface.canvas.toDataURL("image/png"));
  }, [onTextureCommit]);

  const mapUvToCanvas = useCallback((uv: THREE.Vector2): CanvasPoint => {
    const surface = paintSurfaceRef.current;
    const canvas = surface?.canvas;

    return {
      x: clamp(uv.x, 0, 1) * (canvas?.width ?? MUG_CANVAS_WIDTH),
      y: clamp(1 - uv.y, 0, 1) * (canvas?.height ?? MUG_CANVAS_HEIGHT),
    };
  }, []);

  const paintDot = useCallback(
    (point: CanvasPoint) => {
      const surface = paintSurfaceRef.current;
      if (!surface) return;

      surface.ctx.save();
      surface.ctx.fillStyle = brushColor;
      surface.ctx.beginPath();
      surface.ctx.arc(point.x, point.y, Math.max(brushSize / 2, 1), 0, Math.PI * 2);
      surface.ctx.fill();
      surface.ctx.restore();
      surface.texture.needsUpdate = true;
    },
    [brushColor, brushSize]
  );

  const paintSegment = useCallback(
    (from: CanvasPoint, to: CanvasPoint) => {
      const surface = paintSurfaceRef.current;
      if (!surface) return;

      surface.ctx.save();
      surface.ctx.strokeStyle = brushColor;
      surface.ctx.lineWidth = brushSize;
      surface.ctx.lineCap = "round";
      surface.ctx.lineJoin = "round";
      surface.ctx.beginPath();
      surface.ctx.moveTo(from.x, from.y);
      surface.ctx.lineTo(to.x, to.y);
      surface.ctx.stroke();
      surface.ctx.restore();
      surface.texture.needsUpdate = true;
    },
    [brushColor, brushSize]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDesignTexture() {
      onTextureReadyChange?.(false);

      const canvas = document.createElement("canvas");
      canvas.width = MUG_CANVAS_WIDTH;
      canvas.height = MUG_CANVAS_HEIGHT;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (textureUrl) {
        const source = await loadPaintSource(textureUrl);
        if (cancelled) return;
        ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      }

      const texture = new THREE.CanvasTexture(canvas);

      if (cancelled) {
        texture.dispose();
        return;
      }

      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = true;
      texture.anisotropy = 16;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.needsUpdate = true;

      paintSurfaceRef.current = { canvas, ctx, texture };
      activePaintPointRef.current = null;

      setDesignTexture((previous) => {
        previous?.dispose();
        return texture;
      });
      onTextureReadyChange?.(true);
    }

    void loadDesignTexture();

    return () => {
      cancelled = true;
    };
  }, [onTextureReadyChange, textureUrl]);

  useEffect(() => {
    return () => {
      designTexture?.dispose();
    };
  }, [designTexture]);

  useEffect(() => {
    function finishStroke() {
      if (!activePaintPointRef.current) return;
      activePaintPointRef.current = null;
      commitTexture();
    }

    window.addEventListener("pointerup", finishStroke);
    window.addEventListener("pointercancel", finishStroke);

    return () => {
      window.removeEventListener("pointerup", finishStroke);
      window.removeEventListener("pointercancel", finishStroke);
    };
  }, [commitTexture]);

  useEffect(() => {
    if (!paintMode) {
      activePaintPointRef.current = null;
    }
  }, [paintMode]);

  // Clone scene once per model/style — does NOT depend on texture (texture is updated separately)
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const mats = (
        Array.isArray(object.material) ? object.material : [object.material]
      ).map((m) => m.clone());

      for (const mat of mats) {
        if (!isMugSurfaceMaterial(mat)) continue;
        mat.color = new THREE.Color("#ffffff");
        if (typeof mat.metalness === "number") mat.metalness = 0.06;
        if (typeof mat.roughness === "number") mat.roughness = 0.9;
        if (typeof mat.envMapIntensity === "number") mat.envMapIntensity = 0.14;
        mat.needsUpdate = true;
      }

      object.material = Array.isArray(object.material) ? mats : mats[0];
    });
    return clone;
  }, [scene]);

  const mugWrap = useMemo(() => {
    scene.updateWorldMatrix(true, true);
    const bbox = new THREE.Box3().setFromObject(scene);
    const point = new THREE.Vector3();
    const sampledVertices: Array<{ radius: number; y: number }> = [];

    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const positionAttribute = object.geometry.getAttribute("position");
      if (!positionAttribute) return;

      for (let index = 0; index < positionAttribute.count; index += 1) {
        point.fromBufferAttribute(positionAttribute, index).applyMatrix4(object.matrixWorld);
        sampledVertices.push({ radius: Math.hypot(point.x, point.z), y: point.y });
      }
    });

    const sortedRadii = sampledVertices
      .map((vertex) => vertex.radius)
      .sort((left, right) => left - right);
    const outerRadius =
      sortedRadii[Math.min(sortedRadii.length - 1, Math.floor(sortedRadii.length * 0.78))] ??
      Math.max(Math.abs(bbox.min.x), Math.abs(bbox.max.x));
    const shellBand = sampledVertices.filter(
      (vertex) => vertex.radius >= outerRadius * 0.985 && vertex.radius <= outerRadius * 1.03
    );
    const shellYValues = shellBand.map((vertex) => vertex.y);

    const radius = outerRadius * 1.001;
    const minY = shellYValues.length > 0 ? Math.min(...shellYValues) : bbox.min.y;
    const maxY = shellYValues.length > 0 ? Math.max(...shellYValues) : bbox.max.y;
    const height = (maxY - minY) * 0.985;
    const centerY = (minY + maxY) / 2;
    const thetaLength = MUG_WRAP_ANGLE;

    return {
      radius,
      height,
      centerY,
      thetaStart: Math.PI - thetaLength / 2,
      thetaLength,
    };
  }, [scene]);

  const handlePointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!paintMode || !event.uv) return;

      event.stopPropagation();
      const point = mapUvToCanvas(event.uv);
      paintDot(point);
      activePaintPointRef.current = point;
    },
    [mapUvToCanvas, paintDot, paintMode]
  );

  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!paintMode || !event.uv || !activePaintPointRef.current) return;

      event.stopPropagation();
      const nextPoint = mapUvToCanvas(event.uv);
      const lastPoint = activePaintPointRef.current;

      if (Math.hypot(nextPoint.x - lastPoint.x, nextPoint.y - lastPoint.y) < 1) {
        return;
      }

      paintSegment(lastPoint, nextPoint);
      activePaintPointRef.current = nextPoint;
    },
    [mapUvToCanvas, paintMode, paintSegment]
  );

  const handlePointerEnd = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!paintMode || !activePaintPointRef.current) return;

      event.stopPropagation();
      activePaintPointRef.current = null;
      commitTexture();
    },
    [commitTexture, paintMode]
  );

  return (
    <group scale={1} position={[0, -1.5, 0]} rotation={[0, Math.PI / 10, 0]}>
      <primitive object={clonedScene} castShadow receiveShadow />
      {designTexture ? (
        <mesh
          position={[0, mugWrap.centerY, 0]}
          renderOrder={2}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerLeave={handlePointerEnd}
        >
          <cylinderGeometry
            args={[
              mugWrap.radius,
              mugWrap.radius,
              mugWrap.height,
              160,
              1,
              true,
              mugWrap.thetaStart,
              mugWrap.thetaLength,
            ]}
          />
          <meshBasicMaterial
            map={designTexture}
            transparent
            alphaTest={0.02}
            side={THREE.FrontSide}
            depthTest={false}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-4}
            color={new THREE.Color("#ffffff")}
            toneMapped={false}
          />
        </mesh>
      ) : null}
    </group>
  );
}

function MugCanvas({
  modelPath = "/models/mug.glb",
  textureUrl,
  paintMode = false,
  brushColor = "#111827",
  brushSize = 22,
  onTextureCommit,
  onTextureReadyChange,
  viewPreset = "interactive",
  captureKey,
  onCapture,
  transparentBackground = false,
}: MugCanvasProps) {
  const [textureReady, setTextureReady] = useState(false);
  const isInteractiveView = viewPreset === "interactive";

  return (
    <Canvas
      camera={{ position: [0, 0.3, 5.2], fov: 28 }}
      dpr={[1, 1.75]}
      gl={{
        alpha: transparentBackground,
        preserveDrawingBuffer: Boolean(onCapture),
      }}
    >
      {!transparentBackground ? <color attach="background" args={["#000000"]} /> : null}
      <ambientLight intensity={1.15} />
      <directionalLight position={[3, 5, 4]} intensity={1.45} />
      <directionalLight position={[-4, 2, -3]} intensity={0.55} color="#dbeafe" />
      <Suspense fallback={null}>
        <MugCameraController viewPreset={viewPreset} />
        <MugModel
          modelPath={modelPath}
          textureUrl={textureUrl}
          paintMode={paintMode}
          brushColor={brushColor}
          brushSize={brushSize}
          onTextureCommit={onTextureCommit}
          onTextureReadyChange={(ready) => {
            setTextureReady(ready);
            onTextureReadyChange?.(ready);
          }}
        />
        <Environment preset="studio" />
        <ContactShadows position={[0, -1.3, 0]} opacity={0.38} scale={5.2} blur={2.2} far={3.5} />
        <MugSnapshotCapture
          enabled={Boolean(onCapture) && textureReady}
          captureKey={captureKey}
          onCapture={onCapture}
        />
      </Suspense>
      <OrbitControls
        enabled={!paintMode && isInteractiveView}
        enablePan={false}
        enableDamping
        target={MUG_INTERACTIVE_VIEW.target}
        minDistance={3.1}
        maxDistance={8.4}
        maxPolarAngle={Math.PI * 0.62}
      />
    </Canvas>
  );
}

    function ApparelCameraController({ surfaceId }: { surfaceId?: ApparelSurfaceId }) {
      const { camera } = useThree();

      useEffect(() => {
        const view = getApparelPreviewView(surfaceId);
        camera.position.set(...view.cameraPosition);
        camera.lookAt(...view.target);
        camera.updateProjectionMatrix();
      }, [camera, surfaceId]);

      return null;
    }

    function ApparelModel({
      modelPath = DEFAULT_APPAREL_MODEL_PATH,
      textureUrl,
      surfaceId = "front",
    }: ApparelCanvasProps) {
      const APPAREL_MODEL_SCALE = 4.5;
      const { scene } = useGLTF(modelPath);
      const [designTexture, setDesignTexture] = useState<THREE.Texture | null>(null);

      useEffect(() => {
        let cancelled = false;

        async function loadTexture() {
          if (!textureUrl) {
            setDesignTexture((previous) => {
              previous?.dispose();
              return null;
            });
            return;
          }

          const texture = await loadApparelPreviewTexture(textureUrl, surfaceId);
          if (cancelled) {
            texture.dispose();
            return;
          }

          setDesignTexture((previous) => {
            previous?.dispose();
            return texture;
          });
        }

        void loadTexture();

        return () => {
          cancelled = true;
        };
      }, [surfaceId, textureUrl]);

      useEffect(() => {
        return () => {
          designTexture?.dispose();
        };
      }, [designTexture]);

      const displayScene = useMemo(() => {
        const clone = scene.clone(true);

        clone.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;

          const materials = (Array.isArray(object.material) ? object.material : [object.material]).map(
            (material) => material.clone()
          );

          for (const material of materials) {
            if (!isMugSurfaceMaterial(material)) continue;
            material.color = new THREE.Color("#ffffff");
            if (typeof material.metalness === "number") material.metalness = 0.04;
            if (typeof material.roughness === "number") material.roughness = 0.92;
            if (typeof material.envMapIntensity === "number") material.envMapIntensity = 0.1;
            material.needsUpdate = true;
          }

          object.material = Array.isArray(object.material) ? materials : materials[0];
          object.castShadow = true;
          object.receiveShadow = true;
        });

        return clone;
      }, [scene]);

      useEffect(() => {
        return () => {
          displayScene.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => material.dispose());
          });
        };
      }, [displayScene]);

      const mergedShirt = useMemo(() => {
        const geometries: THREE.BufferGeometry[] = [];
        let mergedMaterial: THREE.Material | null = null;

        scene.updateWorldMatrix(true, true);

        scene.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;

          const geometry = object.geometry.index
            ? object.geometry.toNonIndexed()
            : object.geometry.clone();
          geometry.applyMatrix4(object.matrixWorld);
          geometry.clearGroups();
          geometries.push(geometry);

          if (!mergedMaterial) {
            const baseMaterial = Array.isArray(object.material)
              ? object.material[0]
              : object.material;
            const material = baseMaterial.clone();

            if (isMugSurfaceMaterial(material)) {
              if (typeof material.metalness === "number") material.metalness = 0.08;
              if (typeof material.roughness === "number") material.roughness = 0.88;
              if (typeof material.envMapIntensity === "number") material.envMapIntensity = 0.16;
              material.needsUpdate = true;
            }

            mergedMaterial = material;
          }
        });

        const geometry = geometries.length > 0 ? mergeGeometries(geometries, false) : null;
        geometries.forEach((entry) => entry.dispose());
        const material = mergedMaterial ?? new THREE.MeshStandardMaterial({ color: "#ffffff" });

        if (!geometry) {
          material.dispose();
          return null;
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        return {
          mesh,
          geometry,
          material,
        };
      }, [scene]);

      useEffect(() => {
        return () => {
          if (!mergedShirt) return;
          mergedShirt.geometry.dispose();
          mergedShirt.material.dispose();
        };
      }, [mergedShirt]);

      const modelBounds = useMemo(() => {
        const target = mergedShirt?.mesh ?? displayScene;

        if (!target) {
          return {
            min: new THREE.Vector3(),
            max: new THREE.Vector3(),
            center: new THREE.Vector3(),
            size: new THREE.Vector3(1, 1, 1),
          };
        }

        const box = new THREE.Box3().setFromObject(target);
        return {
          min: box.min.clone(),
          max: box.max.clone(),
          center: box.getCenter(new THREE.Vector3()),
          size: box.getSize(new THREE.Vector3()),
        };
      }, [displayScene, mergedShirt]);

      const decalConfig = useMemo(
        () => getApparelPreviewDecal(modelBounds, surfaceId),
        [modelBounds, surfaceId]
      );

      const decals = useMemo(() => {
        if (!designTexture || !mergedShirt) {
          return [] as Array<{ key: string; geometry: DecalGeometry }>;
        }

        const orientation = new THREE.Euler(...decalConfig.rotation);
        const position = new THREE.Vector3(...decalConfig.position);
        const size = new THREE.Vector3(...decalConfig.scale);

        const geometry = new DecalGeometry(mergedShirt.mesh, position, orientation, size);
        const positionAttribute = geometry.getAttribute("position");

        if (!positionAttribute || positionAttribute.count === 0) {
          geometry.dispose();
          return [];
        }

        return [{ key: "merged-shirt", geometry }];
      }, [decalConfig.position, decalConfig.rotation, decalConfig.scale, designTexture, mergedShirt]);

      useEffect(() => {
        return () => {
          decals.forEach((decal) => decal.geometry.dispose());
        };
      }, [decals]);

      return (
        <group scale={APPAREL_MODEL_SCALE}>
          <group position={[-modelBounds.center.x, -modelBounds.center.y, -modelBounds.center.z]}>
            <primitive object={displayScene} castShadow receiveShadow />
            {designTexture
              ? decals.map((decal) => (
                  <mesh key={decal.key} geometry={decal.geometry} castShadow receiveShadow renderOrder={3}>
                    <meshStandardMaterial
                      map={designTexture}
                      transparent
                      alphaTest={0.04}
                      depthTest
                      depthWrite={false}
                      polygonOffset
                      polygonOffsetFactor={-2}
                    />
                  </mesh>
                ))
              : null}
          </group>
        </group>
      );
    }

    function ApparelCanvas({
      modelPath = DEFAULT_APPAREL_MODEL_PATH,
      textureUrl,
      surfaceId = "front",
    }: ApparelCanvasProps) {
      const view = getApparelPreviewView(surfaceId);

      return (
        <Canvas camera={{ position: view.cameraPosition, fov: 28 }} dpr={[1, 1.75]}>
          <color attach="background" args={["#000000"]} />
          <ambientLight intensity={1.25} />
          <directionalLight position={[3.5, 4, 5]} intensity={1.45} />
          <directionalLight position={[-3, 2.5, -4]} intensity={0.6} color="#dbeafe" />
          <Suspense fallback={null}>
            <ApparelCameraController surfaceId={surfaceId} />
            <ApparelModel modelPath={modelPath} textureUrl={textureUrl} surfaceId={surfaceId} />
            <Environment preset="studio" />
            <ContactShadows position={[0, -1.18, 0]} opacity={0.34} scale={6} blur={2.4} far={4.5} />
          </Suspense>
        <OrbitControls
          makeDefault
          enableRotate
          enableZoom
          enablePan={false}
          enableDamping
          rotateSpeed={0.85}
          zoomSpeed={0.95}
          target={view.target}
          minDistance={2.2}
          maxDistance={18}
          maxPolarAngle={Math.PI * 0.82}
        />
        </Canvas>
      );
    }

const ClientMugCanvas = dynamic(async () => Promise.resolve(MugCanvas), {
  ssr: false,
});

const ClientApparelCanvas = dynamic(async () => Promise.resolve(ApparelCanvas), {
  ssr: false,
});

export { ClientMugCanvas, ClientApparelCanvas };

function FlatPreviewCard({
  productName,
  variantLabel,
  previewImage,
  fallbackImage,
}: {
  productName: string;
  variantLabel?: string;
  previewImage?: string;
  fallbackImage?: string;
}) {
  const [rotation, setRotation] = useState({ x: 10, y: -18 });

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    setRotation({
      x: 16 - y * 20,
      y: -24 + x * 24,
    });
  }

  function handlePointerLeave() {
    setRotation({ x: 10, y: -18 });
  }

  return (
    <div
      className="relative overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.82),_rgba(228,228,231,0.76))] p-6 dark:border-zinc-800 dark:bg-[linear-gradient(180deg,_rgba(39,39,42,0.78),_rgba(9,9,11,0.92))]"
      style={{ perspective: "1400px" }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="pointer-events-none absolute -right-8 top-5 h-28 w-28 rounded-full bg-amber-300/30 blur-3xl dark:bg-amber-500/10" />
      <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-cyan-200/50 blur-3xl dark:bg-cyan-500/10" />

      <div className="mb-6 flex flex-wrap gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
        <span className="rounded-full border border-zinc-200 bg-white/80 px-3 py-1 dark:border-zinc-700 dark:bg-zinc-900/70">
          {variantLabel ?? "Default"}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          <Sparkles className="h-3.5 w-3.5" /> Move to inspect
        </span>
      </div>

      <div className="relative flex min-h-[420px] items-center justify-center">
        <div className="absolute bottom-6 h-10 w-60 rounded-full bg-zinc-950/20 blur-2xl dark:bg-black/50" />
        <div
          className="relative h-[360px] w-[280px] transition-transform duration-150 ease-out"
          style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) translateZ(0)`,
            transformStyle: "preserve-3d",
          }}
        >
          <div className="absolute inset-y-4 -right-4 w-6 rounded-r-[1.5rem] bg-zinc-300/80 dark:bg-zinc-700/80" style={{ transform: "rotateY(90deg) translateZ(12px)" }} />
          <div className="absolute inset-x-4 -bottom-4 h-6 rounded-b-[1.5rem] bg-zinc-300/70 dark:bg-zinc-700/70" style={{ transform: "rotateX(-90deg) translateZ(12px)" }} />
          <div className="absolute inset-0 overflow-hidden rounded-[2rem] border border-white/70 bg-white/95 shadow-[0_32px_60px_-30px_rgba(0,0,0,0.55)] dark:border-zinc-700 dark:bg-zinc-950/95">
            <div className="absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,_rgba(255,255,255,0.45),_transparent)]" />
            {fallbackImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fallbackImage} alt={`${productName} preview base`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center bg-zinc-100 text-sm text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500">
                Preview unavailable
              </div>
            )}
            {previewImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewImage} alt={`${productName} design preview`} className="absolute inset-0 h-full w-full object-contain" />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Studio3DPreview({
  productName,
  productCategory,
  apparelSurfaceId,
  variantLabel,
  previewImage,
  mockupImages,
  isGeneratingMockups = false,
  paintMode = false,
  brushColor = "#111827",
  brushSize = 22,
  hasPaintLayer = false,
  onPaintModeChange,
  onBrushColorChange,
  onBrushSizeChange,
  onClearPaint,
  onPaintTextureCommit,
}: Studio3DPreviewProps) {
  const isMug = productCategory?.toUpperCase() === "MUG";
  const isApparel = productCategory?.toUpperCase() === "APPAREL";
  const [activeMockupIndex, setActiveMockupIndex] = useState(0);
  const [mugCaptureState, setMugCaptureState] = useState<{
    sessionKey: string;
    imagesById: Partial<Record<MugCaptureViewId, string>>;
  }>({ sessionKey: "", imagesById: {} });
  const mugCaptureSessionKey = previewImage ?? "__blank-mug__";
  const showPaintControls =
    isMug &&
    Boolean(
      onPaintModeChange &&
        onBrushColorChange &&
        onBrushSizeChange &&
        onClearPaint &&
        onPaintTextureCommit
    );

  const handleMugMockupCapture = useCallback(
    (sessionKey: string, viewId: MugCaptureViewId, dataUrl: string) => {
      setMugCaptureState((current) => {
        if (current.sessionKey !== sessionKey) {
          return {
            sessionKey,
            imagesById: { [viewId]: dataUrl },
          };
        }

        if (current.imagesById[viewId] === dataUrl) {
          return current;
        }

        return {
          sessionKey,
          imagesById: {
            ...current.imagesById,
            [viewId]: dataUrl,
          },
        };
      });
    },
    []
  );

  const resolvedMockups = useMemo(() => {
    if (isMug) {
      if (mugCaptureState.sessionKey !== mugCaptureSessionKey) {
        return [] as Array<{ image: string; key: string; label: string }>;
      }

      return MUG_CAPTURE_VIEWS.flatMap((view) => {
        const image = mugCaptureState.imagesById[view.id];
        if (!image) return [];

        return [
          {
            image,
            key: view.id,
            label: view.label,
          },
        ];
      });
    }

    if (isApparel) {
      return [] as Array<{ image: string; key: string; label: string }>;
    }

    return mockupImages.map((image, index) => ({
      image,
      key: `${index}`,
      label: `View ${index + 1}`,
    }));
  }, [isApparel, isMug, mockupImages, mugCaptureSessionKey, mugCaptureState]);

  const safeMockupIndex =
    resolvedMockups.length > 0 ? Math.min(activeMockupIndex, resolvedMockups.length - 1) : 0;
  const activeMockup = resolvedMockups[safeMockupIndex]?.image;
  const isRenderingMugMockups = isMug && resolvedMockups.length < MUG_CAPTURE_VIEWS.length;

  return (
    <div className="rounded-[2rem] border border-zinc-200/70 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.24),_transparent_35%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(245,245,244,0.92))] p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)] dark:border-zinc-800 dark:bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_28%),linear-gradient(180deg,_rgba(24,24,27,0.98),_rgba(9,9,11,0.96))]">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-600 dark:text-amber-400">
            {isMug || isApparel ? "3D Preview" : "Mockup Preview"}
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {isMug
              ? "Inspect the wrapped design on the 3D mug"
              : isApparel
                ? "Inspect the active apparel surface on the 3D shirt"
                : "Review your design across multiple product perspectives"}
          </h3>
        </div>
        <div className="rounded-full border border-white/70 bg-white/80 p-3 text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200">
          <Box className="h-5 w-5" />
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex flex-wrap gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
          <span className="rounded-full border border-zinc-200 bg-white/80 px-3 py-1 dark:border-zinc-700 dark:bg-zinc-900/70">
            {variantLabel ?? "Default"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            <Sparkles className="h-3.5 w-3.5" />
            {isMug
              ? "Rendered mockups update live from the 3D mug"
              : isApparel
                ? "The active canvas surface is projected onto the shirt model"
                : "Mockups update live from the studio"}
          </span>
          {isMug && isRenderingMugMockups ? (
            <span className="rounded-full border border-zinc-200 bg-white/80 px-3 py-1 dark:border-zinc-700 dark:bg-zinc-900/70">
              Rendering 2D mockups...
            </span>
          ) : null}
          {!isMug && isGeneratingMockups ? (
            <span className="rounded-full border border-zinc-200 bg-white/80 px-3 py-1 dark:border-zinc-700 dark:bg-zinc-900/70">
              Generating mockups...
            </span>
          ) : null}
        </div>

        {isMug ? (
          <div className="space-y-4">
            <div
              aria-hidden="true"
              style={{
                position: "fixed",
                left: -10000,
                top: 0,
                width: 0,
                height: 0,
                overflow: "hidden",
                pointerEvents: "none",
                opacity: 0,
              }}
            >
              {MUG_CAPTURE_VIEWS.map((view) => (
                <div key={`${mugCaptureSessionKey}-${view.id}`} className="h-[320px] w-[320px]">
                  <ClientMugCanvas
                    textureUrl={previewImage}
                    viewPreset={view.id}
                    captureKey={`${mugCaptureSessionKey}-${view.id}`}
                    onCapture={(dataUrl) =>
                      handleMugMockupCapture(mugCaptureSessionKey, view.id, dataUrl)
                    }
                    transparentBackground
                  />
                </div>
              ))}
            </div>

            {showPaintControls ? (
              <div className="flex flex-wrap items-center gap-3 rounded-[1.35rem] border border-zinc-200/80 bg-white/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/70">
                <button
                  type="button"
                  onClick={() => onPaintModeChange?.(!paintMode)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition-colors ${
                    paintMode
                      ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
                  }`}
                >
                  {paintMode ? "Painting on mug" : "Enable 3D paint"}
                </button>
                <label className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                  Color
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(event) => onBrushColorChange?.(event.target.value)}
                    className="h-7 w-9 cursor-pointer rounded-md border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-950"
                  />
                </label>
                <label className="flex min-w-[180px] flex-1 items-center gap-3 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                  Brush {brushSize}px
                  <input
                    type="range"
                    min={8}
                    max={72}
                    step={1}
                    value={brushSize}
                    onChange={(event) => onBrushSizeChange?.(Number(event.target.value))}
                    className="w-full accent-zinc-950 dark:accent-white"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => onClearPaint?.()}
                  disabled={!hasPaintLayer}
                  className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-950 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-white"
                >
                  Clear paint
                </button>
              </div>
            ) : null}

            <div className="relative overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.92),_rgba(226,232,240,0.88))] dark:border-zinc-800 dark:bg-[radial-gradient(circle_at_top,_rgba(39,39,42,0.88),_rgba(9,9,11,0.96))]">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-between px-5 pt-4 text-[11px] font-medium uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
              <span>Viewer</span>
              <span>
                {paintMode
                  ? "3D Paint Mode"
                  : hasPaintLayer
                    ? "Paint Layer Applied"
                    : previewImage
                      ? "Design Applied"
                      : "Blank Mug"}
              </span>
            </div>
            <div className="h-[460px]">
              <ClientMugCanvas
                textureUrl={previewImage}
                paintMode={paintMode}
                brushColor={brushColor}
                brushSize={brushSize}
                onTextureCommit={onPaintTextureCommit}
                viewPreset="interactive"
              />
            </div>
          </div>
          </div>
        ) : isApparel ? (
          <div className="relative overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.92),_rgba(226,232,240,0.88))] dark:border-zinc-800 dark:bg-[radial-gradient(circle_at_top,_rgba(39,39,42,0.88),_rgba(9,9,11,0.96))]">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-between px-5 pt-4 text-[11px] font-medium uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
              <span>Viewer</span>
              <span>{apparelSurfaceId?.replaceAll("-", " ") ?? "front"}</span>
            </div>
            <div className="h-[460px]">
              <ClientApparelCanvas
                modelPath={DEFAULT_APPAREL_MODEL_PATH}
                textureUrl={previewImage}
                surfaceId={apparelSurfaceId}
              />
            </div>
          </div>
        ) : (
          <FlatPreviewCard
            productName={productName}
            variantLabel={variantLabel}
            previewImage={previewImage}
            fallbackImage={activeMockup}
          />
        )}

        {resolvedMockups.length > 1 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
              <Images className="h-4 w-4" />
              Perspectives
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {resolvedMockups.map((mockup, index) => {
                const active = index === activeMockupIndex;
                return (
                  <button
                    key={`${mockup.key}-${index}`}
                    type="button"
                    onClick={() => setActiveMockupIndex(index)}
                    className={`group relative overflow-hidden rounded-[1.35rem] border text-left transition-all ${
                      active
                        ? "border-zinc-950 shadow-lg shadow-zinc-950/10 dark:border-white"
                        : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mockup.image}
                      alt={`${productName} mockup ${index + 1}`}
                      className="aspect-square h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 py-2 text-white">
                      <span className="text-xs font-semibold">
                        {mockup.label}
                      </span>
                      {active ? <Check className="h-4 w-4" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200/70 bg-white/80 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300">
          {isMug
            ? paintMode
              ? "Drag directly on the mug to paint the printable wrap. Turn paint mode off to orbit again."
              : "Orbit around the mug to inspect how the print wraps across the cylinder."
            : isApparel
              ? "Rotate around the shirt to inspect how the active surface placement sits on the model."
              : "Flip through multiple mockup angles before checkout."}
        </div>
        <div className="rounded-2xl border border-zinc-200/70 bg-white/80 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300">
          {isMug
            ? "3D paint writes into the same wrap texture used by the mug viewer and mockup pipeline."
            : isApparel
              ? "The preview uses the exported editor canvas for the currently selected apparel surface."
              : "Live design updates stay overlaid on the selected product image."}
        </div>
        <div className="rounded-2xl border border-zinc-200/70 bg-white/80 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300">
          {isMug
            ? "Treat 3D paint as a finishing pass after layout changes in the flat editor."
            : isApparel
              ? "Switch surfaces in the studio to preview front, back, sleeves, or neck label on the shirt model."
              : "Review placement and scale before adding to cart."}
        </div>
      </div>
    </div>
  );
}

useGLTF.preload("/models/mug.glb");
useGLTF.preload(DEFAULT_APPAREL_MODEL_PATH);

export { DEFAULT_APPAREL_MODEL_PATH };
