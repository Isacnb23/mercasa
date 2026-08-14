"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import styles from "./PageLoader3D.module.css";

type Phase = "loading" | "leaving" | "done" | "hidden";

type Props = {
  phase: Phase;
  onProgress: (percent: number) => void;
  onIndeterminate: () => void;
  onResolved: () => void;
  onFallback: () => void;
};

// El logo MERCASA YA viene incorporado como malla dentro del GLB
// (nodo "logotipo_mercasa_azul_metálico_en_3d", hijo del camión). NO se carga
// ningún PNG ni se crea un PlaneGeometry para el branding: el modelo se pinta
// tal cual viene de Blender.
const MODEL_URL = "/models/mercasa-truck.glb";
const MODEL_TIMEOUT = 9000; // ms — si no carga en este tiempo, se cae al loader 2D

const ENTER_DURATION = 1650; // ms — entrada con easeOutCubic (elegante, sin prisa)
const LEAVE_DURATION = 1100; // ms — salida con easeInCubic
const RIG_BASE_Y = -0.62; // altura del camión sobre el piso
// Posición central en X. Ligeramente a la derecha para compensar el sesgo
// visual del remolque (largo hacia -X) y centrar la masa del camión en cuadro.
const CENTER_X = 0.2;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t: number) => t * t * t;

// El GLTFLoader reporta manager.abort() (nuestro propio cleanup, incluido el
// falso desmontaje de Strict Mode) a través del mismo canal de error que un
// fallo de red real — hay que distinguirlos para no caer al 2D por algo que
// nosotros mismos cancelamos a propósito.
function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException) return err.name === "AbortError";
  if (typeof err === "object" && err !== null) {
    const e = err as { name?: string; type?: string };
    return e.name === "AbortError" || e.type === "abort";
  }
  return false;
}

// Detección barata de WebGL — si no hay contexto, ni siquiera intentamos crear
// el renderer (evita descargar 55MB para nada) y caemos al 2D.
function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

// Paleta navy/teal/gold del proyecto (app/globals.css) — nada de los azules
// eléctricos del prototipo. El teal es el glow protagonista; el gold es una
// luz cálida secundaria muy sutil.
const COLOR = {
  hemiSky: 0xbfe9e4, // niebla con tinte teal
  hemiGround: 0x0c2236, // navy-900
  key: 0xfff3e6, // blanco cálido neutro
  rim: 0x4fe0d3, // teal-400 (glow principal)
  gold: 0xf0c368, // gold-400 (relleno cálido secundario)
  point: 0x1ac9bf, // teal-500 (halo bajo el camión)
  glowCore: "rgba(79,224,211,0.85)", // teal-400
  glowMid: "rgba(26,201,191,0.26)", // teal-500
  smoke: 0xdfeeea, // vapor blanco-gris con un hilo de teal
};

type TruckState = "waiting" | "entering" | "idle" | "leaving" | "gone";

type Framing = { enterX: number; centerX: number; exitX: number };

type Smoke = {
  sprite: THREE.Sprite;
  mat: THREE.SpriteMaterial;
  active: boolean;
  age: number;
  life: number;
  vx: number;
  vy: number;
  vz: number;
  base: number;
};

type Wheel = { obj: THREE.Object3D; axis: "x" | "y" | "z"; dir: number };

type AnimState = {
  truckRig: THREE.Group | null;
  floorGlow: THREE.Mesh | null;
  wheels: Wheel[];
  smoke: Smoke[];
  emitAcc: number;
  framing: Framing;
  state: TruckState;
  modelReadyAt: number;
  leaveStartAt: number;
  leaveStartX: number;
};

export default function PageLoader3D({ phase, onProgress, onIndeterminate, onResolved, onFallback }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimState>({
    truckRig: null,
    floorGlow: null,
    wheels: [],
    smoke: [],
    emitAcc: 0,
    framing: { enterX: -11.5, centerX: -0.2, exitX: 14.6 },
    state: "waiting",
    modelReadyAt: 0,
    leaveStartAt: 0,
    leaveStartX: -11.5,
  });

  // Refs para callbacks: el efecto de montaje de Three.js corre una sola vez,
  // pero necesita leer siempre la versión más reciente de estos props.
  const onProgressRef = useRef(onProgress);
  const onIndeterminateRef = useRef(onIndeterminate);
  const onResolvedRef = useRef(onResolved);
  const onFallbackRef = useRef(onFallback);
  useEffect(() => {
    onProgressRef.current = onProgress;
    onIndeterminateRef.current = onIndeterminate;
    onResolvedRef.current = onResolved;
    onFallbackRef.current = onFallback;
  }, [onProgress, onIndeterminate, onResolved, onFallback]);

  // Dispara la fase de salida cuando React avisa "leaving", desde donde sea
  // que el camión esté en ese momento (evita saltos si aún estaba entrando).
  useEffect(() => {
    const anim = animRef.current;
    if (phase === "leaving" && anim.truckRig && anim.state !== "leaving" && anim.state !== "gone") {
      anim.leaveStartAt = performance.now();
      anim.leaveStartX = anim.truckRig.position.x;
      anim.state = "leaving";
    }
  }, [phase]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // WebGL no disponible → ni renderer ni descarga del GLB, directo al 2D.
    if (!webglAvailable()) {
      onFallbackRef.current();
      return;
    }

    let disposed = false;
    let resolvedCalled = false;
    let rafId = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const scene = new THREE.Scene();
    // FOV estrecho (teleobjetivo): con la cámara más lejos, aplana la
    // perspectiva y el camión (largo) deja de verse "doblado"/curvado. Look de
    // fotografía de producto, más limpio y premium.
    const camera = new THREE.PerspectiveCamera(22, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 1.8, 9);
    // Sin lookAt: la cámara mira horizontal a la altura y=1.8; como el camión
    // vive por debajo (RIG_BASE_Y), queda en el tercio inferior-centro, que es
    // la composición del prototipo de referencia (camión sobre la carretera,
    // textos debajo).

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // ---- Iluminación de estudio (teal principal, gold secundario) ----
    scene.add(new THREE.HemisphereLight(COLOR.hemiSky, COLOR.hemiGround, 1.5));

    const key = new THREE.DirectionalLight(COLOR.key, 2.5);
    key.position.set(3, 5, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 30;
    key.shadow.bias = -0.0005;
    scene.add(key);

    const rim = new THREE.DirectionalLight(COLOR.rim, 1.7); // rim teal detrás/lateral
    rim.position.set(-5, 3, -3);
    scene.add(rim);

    const goldFill = new THREE.DirectionalLight(COLOR.gold, 0.5); // cálido, muy sutil
    goldFill.position.set(2, 1.4, 4);
    scene.add(goldFill);

    const pointGlow = new THREE.PointLight(COLOR.point, 14, 26, 2); // halo teal bajo el camión
    pointGlow.position.set(0, 1.1, 0);
    scene.add(pointGlow);

    // ---- Piso: sombra proyectada + halo de luz teal ----
    const floorGeo = new THREE.PlaneGeometry(22, 9);
    const floorMat = new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.32 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.4;
    floor.receiveShadow = true;
    scene.add(floor);

    function makeGlowTexture() {
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext("2d")!;
      const g = ctx.createRadialGradient(256, 256, 5, 256, 256, 250);
      g.addColorStop(0, COLOR.glowCore);
      g.addColorStop(0.32, COLOR.glowMid);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 512, 512);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }
    const glowTex = makeGlowTexture();
    const floorGlowGeo = new THREE.PlaneGeometry(8.4, 3);
    const floorGlowMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const floorGlow = new THREE.Mesh(floorGlowGeo, floorGlowMat);
    floorGlow.rotation.x = -Math.PI / 2;
    floorGlow.position.set(0, -1.35, 0);
    scene.add(floorGlow);

    // ---- Sistema de humo (sprites, muy sutil, sin tocar el GLB) ----
    function makeSmokeTexture() {
      const c = document.createElement("canvas");
      c.width = 128;
      c.height = 128;
      const ctx = c.getContext("2d")!;
      const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
      g.addColorStop(0, "rgba(255,255,255,0.9)");
      g.addColorStop(0.45, "rgba(255,255,255,0.35)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    }
    const smokeTex = makeSmokeTexture();
    const SMOKE_COUNT = 18;
    const smokeGroup = new THREE.Group();
    scene.add(smokeGroup);
    const smoke: Smoke[] = [];
    for (let i = 0; i < SMOKE_COUNT; i++) {
      const mat = new THREE.SpriteMaterial({
        map: smokeTex,
        color: COLOR.smoke,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.NormalBlending,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      sprite.position.set(0, -999, 0);
      smokeGroup.add(sprite);
      smoke.push({ sprite, mat, active: false, age: 0, life: 1, vx: 0, vy: 0, vz: 0, base: 1 });
    }
    animRef.current.smoke = smoke;

    // El camión mira hacia +X (avanza a la derecha); el escape/vapor sale por
    // la zona superior-trasera (lado -X). Estos offsets se ajustan al cargar el
    // modelo según sus bounds reales.
    const emitter = { x: -1.3, y: RIG_BASE_Y + 1.15, z: 0.35 };

    function emitSmoke(leaving: boolean, truckX: number) {
      const p = smoke.find((s) => !s.active);
      if (!p) return;
      p.active = true;
      p.sprite.visible = true;
      p.age = 0;
      p.life = leaving ? 0.85 + Math.random() * 0.4 : 1.3 + Math.random() * 0.7;
      // arranca cerca del escape, con jitter mínimo
      p.sprite.position.set(
        truckX + emitter.x + (Math.random() - 0.5) * 0.18,
        emitter.y + (Math.random() - 0.5) * 0.12,
        emitter.z + (Math.random() - 0.5) * 0.18
      );
      // deriva hacia atrás (-X) y sube; al acelerar se estira más hacia atrás
      p.vx = leaving ? -1.9 - Math.random() * 0.7 : -0.42 - Math.random() * 0.22;
      p.vy = 0.5 + Math.random() * 0.28;
      p.vz = (Math.random() - 0.5) * 0.14;
      p.base = (leaving ? 0.7 : 0.9) + Math.random() * 0.5;
      p.mat.rotation = Math.random() * Math.PI;
    }

    function updateSmoke(dt: number) {
      for (const p of smoke) {
        if (!p.active) continue;
        p.age += dt;
        const t = p.age / p.life;
        if (t >= 1) {
          p.active = false;
          p.sprite.visible = false;
          p.mat.opacity = 0;
          continue;
        }
        p.sprite.position.x += p.vx * dt;
        p.sprite.position.y += p.vy * dt;
        p.sprite.position.z += p.vz * dt;
        p.vx *= 0.985; // se frena a medida que se disipa
        // crece al ascender
        const scale = THREE.MathUtils.lerp(p.base * 0.5, p.base * 2.4, t);
        p.sprite.scale.set(scale, scale, 1);
        // opacidad: sube rápido, baja lento (nunca opaco → vapor delicado)
        const fade = t < 0.22 ? t / 0.22 : 1 - (t - 0.22) / 0.78;
        p.mat.opacity = Math.max(0, fade) * 0.24;
      }
    }

    // ---- Rig del camión ----
    const truckRig = new THREE.Group();
    // Perfil lateral con un 3/4 frontal muy ligero. Este GLB (el de ruedas
    // separadas) trae una orientación base distinta al branded, por eso su
    // ángulo óptimo es ~-0.5 en vez de -0.22.
    truckRig.rotation.y = -0.5;
    truckRig.position.set(animRef.current.framing.enterX, RIG_BASE_Y, 0.25);
    scene.add(truckRig);
    animRef.current.truckRig = truckRig;
    animRef.current.floorGlow = floorGlow;

    // Encuadre responsive: elige la distancia de cámara y los puntos de
    // entrada/salida a partir del ancho visible real, de modo que el camión
    // quepa completo y arranque/termine fuera de cuadro en cualquier viewport.
    let truckHalfX = 3.97;
    function computeFraming() {
      const aspect = camera.aspect;
      const vFov = (camera.fov * Math.PI) / 180;
      const tan = Math.tan(vFov / 2);
      // Fracción del ancho que debe ocupar el camión: menos en pantallas anchas
      // (protagonista pero con aire), más en pantallas estrechas/verticales
      // para que no se pierda. Encuadramos SIEMPRE al ancho → tamaño coherente.
      const targetFrac = THREE.MathUtils.clamp(1.0 - 0.24 * aspect, 0.56, 0.72);
      const halfWNeeded = truckHalfX / targetFrac;
      const dist = THREE.MathUtils.clamp(halfWNeeded / (tan * Math.max(aspect, 0.4)), 10, 70);
      camera.position.z = dist + 0.25;
      // Apuntar un poco por debajo del camión lo eleva al medio-superior del
      // cuadro (independiente del aspect), dejando el tercio inferior libre
      // para la carretera y los textos. Sin esto, en viewports estrechos el
      // camión baja demasiado y solapa la marca.
      camera.lookAt(CENTER_X, RIG_BASE_Y + 0.25, 0.25);
      camera.updateMatrixWorld(true);
      const halfW = dist * tan * aspect;
      const off = halfW + truckHalfX + 1.4;
      animRef.current.framing = { enterX: -off, centerX: CENTER_X, exitX: off };
    }
    computeFraming();
    truckRig.position.x = animRef.current.framing.enterX;
    animRef.current.leaveStartX = animRef.current.framing.enterX;

    const manager = new THREE.LoadingManager();

    function fallbackToLoader2D() {
      if (disposed || resolvedCalled) return;
      resolvedCalled = true;
      clearTimeout(timeoutId);
      manager.abort();
      onFallbackRef.current();
    }

    timeoutId = setTimeout(fallbackToLoader2D, MODEL_TIMEOUT);

    const gltfLoader = new GLTFLoader(manager);
    gltfLoader.load(
      MODEL_URL,
      (gltf: GLTF) => {
        if (disposed || resolvedCalled) return;
        resolvedCalled = true;
        clearTimeout(timeoutId);

        const model = gltf.scene;
        const wheels: Wheel[] = [];
        const wheelRaw: { obj: THREE.Object3D; size: THREE.Vector3 }[] = [];
        model.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((m) => {
              if (!m) return;
              const std = m as THREE.MeshStandardMaterial;
              // Blender a veces exporta materiales demasiado metálicos/brillantes:
              // moderamos sin destruir las texturas base ni el logo incorporado.
              if ("metalness" in std && std.metalness !== undefined) {
                std.metalness = Math.min(std.metalness, 0.25);
              }
              if ("roughness" in std && std.roughness !== undefined) {
                std.roughness = THREE.MathUtils.clamp(std.roughness, 0.45, 0.98);
              }
            });
          }
          // Recolecta las ruedas si el GLB las trae como nodos separados
          // (este modelo trae 10 nombradas "...rueda..."). El eje se resuelve
          // después por mayoría (ver abajo). Si un GLB no separa las ruedas, no
          // habrá coincidencias y quedan estáticas (sin deformar).
          if (obj instanceof THREE.Mesh && /wheel|rueda|llanta|tire|tyre/i.test(obj.name)) {
            obj.geometry.computeBoundingBox();
            wheelRaw.push({ obj, size: obj.geometry.boundingBox!.getSize(new THREE.Vector3()) });
          }
        });

        // Eje de giro (el del buje = dimensión más delgada de la rueda). Todas
        // las ruedas comparten marco local, así que se decide por MAYORÍA: evita
        // que una malla con bounding box casi cúbico elija un eje distinto y
        // "bambolee" en vez de rodar.
        const votes: Record<"x" | "y" | "z", number> = { x: 0, y: 0, z: 0 };
        for (const { size } of wheelRaw) {
          const a = size.x <= size.y && size.x <= size.z ? "x" : size.y <= size.z ? "y" : "z";
          votes[a]++;
        }
        const axle = (["x", "y", "z"] as const).reduce((a, b) => (votes[b] > votes[a] ? b : a));
        for (const { obj } of wheelRaw) {
          // dir: el signo hace rodar hacia delante; las ruedas del lado opuesto
          // del eje se reflejan y necesitan giro invertido.
          const dir = obj.position[axle] >= 0 ? 1 : -1;
          wheels.push({ obj, axis: axle, dir });
        }
        animRef.current.wheels = wheels;

        // Centrar y escalar a un tamaño de escena consistente
        let bounds = new THREE.Box3().setFromObject(model);
        const center = bounds.getCenter(new THREE.Vector3());
        model.position.sub(center);
        bounds = new THREE.Box3().setFromObject(model);
        const size = bounds.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        model.scale.setScalar(7.6 / maxDim);
        truckRig.add(model);

        // Bounds finales (ya escalado) → ancho para el encuadre y origen del humo
        bounds = new THREE.Box3().setFromObject(truckRig);
        const fSize = bounds.getSize(new THREE.Vector3());
        truckHalfX = fSize.x / 2;
        // Escape: justo detrás/encima de la cabina. La cabina va delante en el
        // sentido de marcha (+X), así que el vapor nace en +X alto y deriva
        // hacia atrás (-X) sobre el remolque.
        emitter.x = fSize.x * 0.2;
        emitter.y = RIG_BASE_Y + fSize.y * 0.52;
        emitter.z = 0.3;
        computeFraming();

        onProgressRef.current(100);
        animRef.current.state = "entering";
        animRef.current.modelReadyAt = performance.now();
        onResolvedRef.current();
      },
      (evt: ProgressEvent) => {
        if (disposed) return;
        if (evt.total > 0) {
          onProgressRef.current((evt.loaded / evt.total) * 100);
        } else {
          onIndeterminateRef.current();
        }
      },
      (err) => {
        if (isAbortError(err)) return;
        console.error("[PageLoader3D] Error cargando el modelo GLB:", err);
        fallbackToLoader2D();
      }
    );

    function resize() {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      computeFraming();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", resize);

    let lastT = performance.now();
    function animate() {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      const anim = animRef.current;
      const { enterX, centerX, exitX } = anim.framing;

      if (anim.state === "entering") {
        const t = Math.min(1, (now - anim.modelReadyAt) / ENTER_DURATION);
        truckRig.position.x = THREE.MathUtils.lerp(enterX, centerX, easeOutCubic(t));
        if (t >= 1) anim.state = "idle";
      } else if (anim.state === "idle") {
        truckRig.position.x = centerX;
      } else if (anim.state === "leaving") {
        const t = Math.min(1, (now - anim.leaveStartAt) / LEAVE_DURATION);
        truckRig.position.x = THREE.MathUtils.lerp(anim.leaveStartX, exitX, easeInCubic(t));
        if (t >= 1) anim.state = "gone";
      }

      const leaving = anim.state === "leaving";
      const alive = anim.state !== "waiting" && anim.state !== "gone";

      if (alive) {
        // suspensión/ralentí: pocos px visuales
        truckRig.position.y = RIG_BASE_Y + Math.sin(now * 0.0056) * 0.02;
        // glow sigue al camión y respira
        floorGlow.position.x = THREE.MathUtils.lerp(floorGlow.position.x, truckRig.position.x * 0.4, 0.1);
        const s = 1 + Math.sin(now * 0.003) * 0.03 + (leaving ? 0.06 : 0);
        floorGlow.scale.set(s, s, 1);
        pointGlow.position.x = truckRig.position.x * 0.5;

        // ruedas (solo si el GLB las trae separadas): giran incluso en idle
        // para acompañar la carretera en movimiento; aceleran al salir.
        if (anim.wheels.length) {
          const rate = leaving ? 30 : anim.state === "entering" ? 20 : 12; // rad/s
          const step = rate * dt;
          for (const w of anim.wheels) w.obj.rotation[w.axis] += step * w.dir;
        }
      }

      // Emisión de humo: tranquila en idle, más frecuente al acelerar, se
      // detiene cuando el camión ya salió (las partículas vivas terminan solas).
      if (alive && anim.state !== "entering") {
        anim.emitAcc += dt;
        const interval = leaving ? 0.09 : 0.17;
        while (anim.emitAcc >= interval) {
          anim.emitAcc -= interval;
          emitSmoke(leaving, truckRig.position.x);
        }
      }
      updateSmoke(dt);

      renderer.render(scene, camera);

      // Corta el loop cuando el camión ya salió y no quedan partículas vivas:
      // ahorra GPU durante la transición CSS de salida del overlay.
      const smokeAlive = smoke.some((p) => p.active);
      if (anim.state === "gone" && !smokeAlive) {
        return; // sin requestAnimationFrame → loop detenido
      }
      rafId = requestAnimationFrame(animate);
    }
    rafId = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      clearTimeout(timeoutId);
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafId);
      // NO llamamos manager.abort() aquí: three.js deduplica peticiones al
      // mismo URL a nivel de módulo (cache compartido entre TODAS las
      // instancias). En React Strict Mode (dev) el montaje-fantasma y el real
      // piden el mismo .glb y three.js los fusiona; abortar el fantasma
      // mataría la descarga del montaje real. Los callbacks ya están
      // protegidos con `if (disposed) return`, así que basta con dejar de
      // escuchar sin cancelar la red.

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m?.dispose());
        }
      });
      smoke.forEach((p) => p.mat.dispose());
      smokeTex.dispose();
      glowTex.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      floorGlowGeo.dispose();
      floorGlowMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      animRef.current = {
        truckRig: null,
        floorGlow: null,
        wheels: [],
        smoke: [],
        emitAcc: 0,
        framing: { enterX: -11.5, centerX: -0.2, exitX: 14.6 },
        state: "waiting",
        modelReadyAt: 0,
        leaveStartAt: 0,
        leaveStartX: -11.5,
      };
    };
    // El montaje de Three.js debe correr una sola vez; los callbacks se leen
    // desde refs (ver arriba) para no reiniciar la escena en cada re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leaving = phase === "leaving" || phase === "done";

  return (
    <div className={leaving ? `${styles.stage} ${styles.isLeaving}` : styles.stage} aria-hidden>
      <div className={styles.aurora} />
      <div className={styles.radial} />
      <div className={styles.grid} />
      {/* piso técnico en perspectiva que se desplaza hacia el espectador */}
      <div className={styles.floor} />
      <div className={styles.horizon} />
      <div ref={containerRef} className={styles.canvasHost} />
      {/* motas de luz flotando: aportan "vida" y profundidad, muy sutiles */}
      <div className={styles.motes}>
        {Array.from({ length: 18 }).map((_, i) => {
          const r = ((i * 9301 + 49297) % 233280) / 233280; // pseudo-aleatorio estable
          const r2 = ((i * 4523 + 7919) % 100) / 100;
          const size = 1.5 + r2 * 2;
          return (
            <span
              key={i}
              style={{
                left: `${(r * 100).toFixed(1)}%`,
                width: `${size.toFixed(1)}px`,
                height: `${size.toFixed(1)}px`,
                animationDuration: `${(11 + r2 * 9).toFixed(1)}s`,
                animationDelay: `${(-r * 16).toFixed(1)}s`,
              }}
            />
          );
        })}
      </div>
      <div className={styles.road}>
        <span className={styles.roadEdge} />
        <span className={styles.roadDash} />
      </div>
      <div className={styles.speedlines}>
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
