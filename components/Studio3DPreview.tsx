"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls, useGLTF } from "@react-three/drei";
import { Box, Check, Images, Sparkles } from "lucide-react";
import * as THREE from "three";

type Studio3DPreviewProps = {
  productName: string;
  variantLabel?: string;
  previewImage?: string;
  mockupImages: string[];
  isGeneratingMockups?: boolean;
};

type MugModelProps = {
  modelPath: string;
  modelStyle: "pbr" | "shaded";
  textureUrl?: string;
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

function MugModel({ modelPath, modelStyle, textureUrl }: MugModelProps) {
  const { scene } = useGLTF(modelPath);
  const [designTexture, setDesignTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDesignTexture() {
      if (!textureUrl) {
        setDesignTexture(null);
        return;
      }

      const loader = new THREE.TextureLoader();
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(textureUrl, resolve, undefined, reject);
      });

      if (cancelled) {
        texture.dispose();
        return;
      }

      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 16;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.needsUpdate = true;

      setDesignTexture((previous) => {
        previous?.dispose();
        return texture;
      });
    }

    void loadDesignTexture();

    return () => {
      cancelled = true;
    };
  }, [textureUrl]);

  useEffect(() => {
    return () => {
      designTexture?.dispose();
    };
  }, [designTexture]);

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
        if (typeof mat.metalness === "number") mat.metalness = modelStyle === "pbr" ? 0.14 : 0;
        if (typeof mat.roughness === "number") mat.roughness = modelStyle === "pbr" ? 0.76 : 0.98;
        if (typeof mat.envMapIntensity === "number") mat.envMapIntensity = modelStyle === "pbr" ? 0.28 : 0.08;
        mat.needsUpdate = true;
      }

      object.material = Array.isArray(object.material) ? mats : mats[0];
    });
    return clone;
  }, [scene, modelStyle]);

  return (
    <group scale={1.72} position={[0, -0.98, 0]} rotation={[0, Math.PI / 10, 0]}>
      <primitive object={clonedScene} castShadow receiveShadow />
      {designTexture ? (
        <mesh position={[0, 0.69, 0]} renderOrder={2}>
          <cylinderGeometry
            args={[0.855, 0.855, 0.82, 96, 1, true, -Math.PI * 0.36, Math.PI * 0.72]}
          />
          <meshStandardMaterial
            map={designTexture}
            transparent
            opacity={1}
            alphaTest={0.02}
            side={THREE.FrontSide}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
            metalness={0}
            roughness={1}
          />
        </mesh>
      ) : null}
    </group>
  );
}

function MugCanvas({ modelPath, modelStyle, textureUrl }: MugModelProps) {
  return (
    <Canvas camera={{ position: [0, 0.3, 5.2], fov: 28 }} dpr={[1, 1.75]}>
      <color attach="background" args={["#000000"]} />
      <ambientLight intensity={1.15} />
      <directionalLight position={[3, 5, 4]} intensity={1.45} />
      <directionalLight position={[-4, 2, -3]} intensity={0.55} color="#dbeafe" />
      <Suspense fallback={null}>
        <MugModel modelPath={modelPath} modelStyle={modelStyle} textureUrl={textureUrl} />
        <Environment preset="studio" />
        <ContactShadows position={[0, -1.3, 0]} opacity={0.38} scale={5.2} blur={2.2} far={3.5} />
      </Suspense>
      <OrbitControls
        enablePan={false}
        enableDamping
        target={[0, -0.05, 0]}
        minDistance={3.1}
        maxDistance={8.4}
        maxPolarAngle={Math.PI * 0.62}
      />
    </Canvas>
  );
}

const ClientMugCanvas = dynamic(async () => Promise.resolve(MugCanvas), {
  ssr: false,
});

export { ClientMugCanvas };

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
  variantLabel,
  previewImage,
  mockupImages,
  isGeneratingMockups = false,
}: Studio3DPreviewProps) {
  const [activeMockupIndex, setActiveMockupIndex] = useState(0);
  const safeMockupIndex =
    mockupImages.length > 0 ? Math.min(activeMockupIndex, mockupImages.length - 1) : 0;
  const activeMockup = mockupImages[safeMockupIndex];

  return (
    <div className="rounded-[2rem] border border-zinc-200/70 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.24),_transparent_35%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(245,245,244,0.92))] p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)] dark:border-zinc-800 dark:bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_28%),linear-gradient(180deg,_rgba(24,24,27,0.98),_rgba(9,9,11,0.96))]">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-600 dark:text-amber-400">
            Mockup Preview
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Review your design across multiple product perspectives
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
            <Sparkles className="h-3.5 w-3.5" /> Mockups update live from the studio
          </span>
          {isGeneratingMockups ? (
            <span className="rounded-full border border-zinc-200 bg-white/80 px-3 py-1 dark:border-zinc-700 dark:bg-zinc-900/70">
              Generating mockups...
            </span>
          ) : null}
        </div>

        <FlatPreviewCard
          productName={productName}
          variantLabel={variantLabel}
          previewImage={previewImage}
          fallbackImage={activeMockup}
        />

        {mockupImages.length > 1 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
              <Images className="h-4 w-4" />
              Perspectives
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {mockupImages.map((image, index) => {
                const active = index === activeMockupIndex;
                return (
                  <button
                    key={`${image}-${index}`}
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
                      src={image}
                      alt={`${productName} mockup ${index + 1}`}
                      className="aspect-square h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 py-2 text-white">
                      <span className="text-xs font-semibold">
                        View {index + 1}
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
          Flip through multiple mockup angles before checkout.
        </div>
        <div className="rounded-2xl border border-zinc-200/70 bg-white/80 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300">
          Live design updates stay overlaid on the selected product image.
        </div>
        <div className="rounded-2xl border border-zinc-200/70 bg-white/80 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300">
          Review placement and scale before adding to cart.
        </div>
      </div>
    </div>
  );
}

useGLTF.preload("/models/mug_pbr.glb");
useGLTF.preload("/models/mug_shaded.glb");
