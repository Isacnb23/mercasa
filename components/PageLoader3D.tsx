"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
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
// El GLB se re-exportó con compresión de geometría Draco (55.9MB → 7.8MB, sin
// tocar UVs/normales visibles ni la jerarquía de nodos/nombres que usa este
// archivo para identificar ruedas y el chasis). El decoder wasm se sirve
// desde /public/draco (copiado de three/examples/jsm/libs/draco/gltf) para no
// depender de un CDN externo en el camino crítico del loader.
const DRACO_DECODER_PATH = "/draco/";
const MODEL_TIMEOUT = 7000; // ms — si no carga en este tiempo, se cae al loader 2D

// Debe calzar con ENTER_DURATION/COMPLETE_DURATION en PageLoader.tsx: el
// padre arranca su propio timer de "estadía" (DWELL_DURATION) usando este
// mismo valor como referencia de cuándo la entrada ya terminó — si no
// coinciden, la coreografía se desincroniza otra vez.
const ENTER_DURATION = 600; // ms — entrada ágil, sin crawl al llegar al centro
// Debe calzar EXACTO con LEAVE_DURATION_3D en PageLoader.tsx (ver esa constante).
const LEAVE_DURATION = 500; // ms — salida con easeInCubic (acelera al "jalar")
const RIG_BASE_Y = -0.74; // altura del camión sobre el piso: apoyado pero con aire de estudio
// Posición central en X. Ligeramente a la derecha para compensar el sesgo
// visual del remolque (largo hacia -X) y centrar la masa del camión en cuadro.
const CENTER_X = 0;

// easeOutQuint (potencia 5) prácticamente ya llegó al 99.99% del recorrido a
// t=0.9 pero con velocidad casi nula ahí — el resultado es "coastear" casi
// sin moverse durante el último tramo, que se lee como que se quedó pegado
// en vez de llegar y frenar. Probamos un overshoot (easeOutBack) para darle
// energía, pero eso generó DOS frenados visibles (uno al pasarse del centro,
// otro al corregir de vuelta) — se sentía igual de pegado, solo que dos
// veces. easeOutCubic resuelve ambos problemas: sigue moviéndose con
// velocidad perceptible hasta bien entrado el final del recorrido y luego
// se detiene en un solo frenado limpio, sin arrastre y sin rebote.
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
  hemiSky: 0xc8dbef, // niebla azul-corporativa más profesional
  hemiGround: 0x0a2033, // navy profundo corporativo
  key: 0xf7fbff, // blanco neutro frío y limpio
  rim: 0x7db6ff, // azul corporativo como glow principal
  gold: 0xc8d7ea, // relleno frío muy suave, más sobrio
  point: 0x3f8fe2, // azul eléctrico contenido bajo el camión
  glowCore: "rgba(120,180,255,0.38)", // azul corporativo contenido
  glowMid: "rgba(53,122,204,0.16)", // azul medio para el halo
  smoke: 0xe8eef5, // vapor frío muy sutil
};

type TruckState = "waiting" | "warming" | "entering" | "idle" | "leaving" | "gone";

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
  enterElapsedMs: number;
  leaveStartAt: number;
  leaveStartX: number;
  warmupFramesLeft: number;
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
    enterElapsedMs: 0,
    leaveStartAt: 0,
    leaveStartX: -11.5,
    warmupFramesLeft: 0,
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
    const camera = new THREE.PerspectiveCamera(6, container.clientWidth / container.clientHeight, 0.1, 500);
    camera.position.set(0, 1.58, 9);
    // Sin lookAt: la cámara mira horizontal a la altura y=1.8; como el camión
    // vive por debajo (RIG_BASE_Y), queda en el tercio inferior-centro, que es
    // la composición del prototipo de referencia (camión sobre la carretera,
    // textos debajo).

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    // Cap 1.5 en vez de 2: en pantallas de alta densidad (la mayoría de equipos
    // hoy) el render a devicePixelRatio 2 casi duplica los píxeles a sombrear
    // sin ganancia visible perceptible en una escena que dura ~1s en pantalla.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.82;
    // Sin shadow map real (shadowMap.enabled queda en su default: false).
    // Ver la nota junto a la luz `key`: recalcularlo cada frame porque el
    // caster (camión) se mueve durante toda la entrada era un costo
    // por-frame que competía justo con la hidratación de la página real por
    // debajo — la sombra de contacto falsa (más abajo) resuelve lo mismo a
    // costo ~0.
    container.appendChild(renderer.domElement);

    // Entorno de estudio para reflejos y respuesta más realista del material.
    // sigma=0.045 pedía más muestras de blur (22) de las que three.js permite
    // (20): se recortaba en cada carga (warning en consola) sin ganar nada,
    // solo gastando GPU de más antes del primer frame — justo el tipo de
    // costo que puede sentirse como un "enganchón" al arrancar en equipos
    // modestos. 0.035 cae dentro del límite y se ve igual de suave.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.035);
    scene.environment = envRT.texture;

    // ---- Iluminación de estudio más sobria y contrastada ----
    scene.add(new THREE.HemisphereLight(0xc6dbef, COLOR.hemiGround, 0.72));

    const key = new THREE.DirectionalLight(0xfffbf4, 1.42);
    key.position.set(4.2, 6.2, 7.8);
    // Sin castShadow: un shadow map real se recalcula cada frame porque el
    // caster (camión) se mueve durante toda la entrada/salida — ese costo
    // por-frame, no la compilación única de shaders, era lo que seguía
    // sintiéndose como jank en la entrada aun con el warm-up. La sombra de
    // contacto (elipse falsa, más abajo) vende el "apoyado en el piso" sin
    // recomputar nada por frame.
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xdbe9f5, 0.42);
    fill.position.set(-4.5, 2.2, 5.6);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0x8bbcff, 0.18); // recorte frío más sobrio
    rim.position.set(-5.6, 3.2, -4.2);
    scene.add(rim);

    const goldFill = new THREE.DirectionalLight(COLOR.gold, 0.05); // relleno frío casi imperceptible
    goldFill.position.set(2.5, 1.3, 3.4);
    scene.add(goldFill);

    const pointGlow = new THREE.PointLight(COLOR.point, 0.72, 8.2, 2); // halo muy sutil, casi imperceptible
    pointGlow.position.set(0, 0.88, 0);
    scene.add(pointGlow);

    // Catch light muy contenida: da vida al parabrisas y bordes sin quemar el blanco.
    const catchLight = new THREE.PointLight(0xffffff, 0.96, 10.5, 2);
    catchLight.position.set(0.9, 2.25, 8.5);
    scene.add(catchLight);

    // ---- Halo de luz teal en el piso ----
    // (El plano ShadowMaterial que recibía la sombra proyectada real se
    // quitó junto con castShadow en la luz `key` — ver esa nota. Sin un
    // shadow map generándolo, ese plano quedaba invisible pero seguía
    // costando un draw call por frame.)
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
    const floorGlowGeo = new THREE.PlaneGeometry(6.4, 1.45);
    const floorGlowMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.16,
    });
    const floorGlow = new THREE.Mesh(floorGlowGeo, floorGlowMat);
    floorGlow.rotation.x = -Math.PI / 2;
    floorGlow.position.set(0, -1.396, 0.015);
    scene.add(floorGlow);

    // ---- Sombra de contacto (AO falso) ----
    // Elipse oscura y nítida justo bajo las ruedas: es la ÚNICA sombra de la
    // escena (no hay shadow map real, ver notas junto a la luz `key`). Solo
    // sigue la posición X del camión cada frame — sin relighting, sin
    // recomputar nada — así que vende el "apoyado en el piso" a costo ~0
    // incluso durante todo el recorrido de entrada.
    function makeContactShadowTexture() {
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 256;
      const ctx = c.getContext("2d")!;
      const g = ctx.createRadialGradient(256, 128, 4, 256, 128, 250);
      g.addColorStop(0, "rgba(0,0,0,0.14)");
      g.addColorStop(0.36, "rgba(0,0,0,0.06)");
      g.addColorStop(0.72, "rgba(0,0,0,0.015)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 512, 256);
      return new THREE.CanvasTexture(c);
    }
    const contactTex = makeContactShadowTexture();
    const contactGeo = new THREE.PlaneGeometry(6.8, 0.42);
    const contactMat = new THREE.MeshBasicMaterial({
      map: contactTex,
      transparent: true,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(contactGeo, contactMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, -1.397, 0.02);
    scene.add(contactShadow);

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
    const SMOKE_COUNT = 11; // menos sprites activos a la vez → menos trabajo por frame
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
    // El rig se mantiene a 0°. Al cargar el GLB quitamos el giro Y que viene
    // horneado en su nodo raíz (~62°), así la vista queda REALMENTE de perfil.
    truckRig.rotation.y = 0;
    truckRig.position.set(animRef.current.framing.enterX, RIG_BASE_Y, 0.14);
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
      const targetFrac = THREE.MathUtils.clamp(0.84 - 0.18 * aspect, 0.42, 0.56);
      const halfWNeeded = truckHalfX / targetFrac;
      const dist = THREE.MathUtils.clamp(halfWNeeded / (tan * Math.max(aspect, 0.4)), 10, 220);
      camera.position.z = dist + 1.25;
      // Apuntar un poco por debajo del camión lo eleva al medio-superior del
      // cuadro (independiente del aspect), dejando el tercio inferior libre
      // para la carretera y los textos. Sin esto, en viewports estrechos el
      // camión baja demasiado y solapa la marca.
      camera.lookAt(CENTER_X, RIG_BASE_Y + 0.44, 0.08);
      camera.updateMatrixWorld(true);
      const halfW = dist * tan * aspect;
      const off = halfW + truckHalfX + 2.1;
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

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
    // El decoder .wasm es ~190KB pero solo se descarga cuando el propio GLB
    // trae geometría comprimida con Draco: no añade peso al camino crítico
    // para nadie que no vaya a ver el camión 3D.
    dracoLoader.setDecoderConfig({ type: "wasm" });

    const gltfLoader = new GLTFLoader(manager);
    gltfLoader.setDRACOLoader(dracoLoader);
    gltfLoader.load(
      MODEL_URL,
      (gltf: GLTF) => {
        if (disposed || resolvedCalled) return;
        resolvedCalled = true;
        clearTimeout(timeoutId);

        const model = gltf.scene;

        // El GLB fue exportado con un giro Y de ~62° en el nodo raíz "Camion con remolque".
        // Ese era el motivo real por el que, aunque el rig estuviera casi a 0°, seguía
        // viéndose en 3/4 y "doblado". Neutralizamos SOLO ese giro de presentación.
        const importedRoot = model.getObjectByName("Camion con remolque") ?? model.children[0];
        if (importedRoot) {
          const q = importedRoot.quaternion;
          const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
          e.y = 0;
          importedRoot.quaternion.setFromEuler(e);
          importedRoot.updateMatrixWorld(true);
        }

        const wheels: Wheel[] = [];
        const wheelRaw: { obj: THREE.Object3D; size: THREE.Vector3 }[] = [];
        model.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            // IMPORTANTÍSIMO: el GLB comparte un mismo material PBR/textura entre
            // carrocería y ruedas. Si modificamos ese material según una rueda,
            // también oscurecemos TODO el camión. Clonamos por malla antes de ajustar.
            const srcMats = Array.isArray(obj.material) ? obj.material : [obj.material];
            const clonedMats = srcMats.map((m) => m.clone());
            obj.material = Array.isArray(obj.material) ? clonedMats : clonedMats[0];

            clonedMats.forEach((m) => {
              if (!(m instanceof THREE.MeshStandardMaterial)) return;
              const label = `${obj.name} ${m.name}`.toLowerCase();
              const isLogo = /logotipo_mercasa|mercasa/i.test(label);
              const isWheel = /wheel|rueda|llanta|tire|tyre/i.test(label);

              // Mantener el color y TODAS las texturas originales del GLB.
              // Solo ajustamos la respuesta física; no "pintamos" la carrocería.
              m.aoMapIntensity = 1;
              m.emissive.setHex(0x000000);
              if (m.map) m.map.anisotropy = renderer.capabilities.getMaxAnisotropy();

              if (isLogo) {
                m.envMapIntensity = 0.8;
                m.metalness = Math.min(m.metalness, 0.28);
                m.roughness = Math.max(0.46, Math.min(m.roughness, 0.62));
              } else if (isWheel) {
                // La propia textura ya trae caucho/rines: no alterar color.
                m.envMapIntensity = 0.24;
                m.metalness = Math.min(m.metalness, 0.32);
                m.roughness = Math.max(m.roughness, 0.66);
              } else {
                // Pintura blanca: satinado automotriz, no plástico brillante.
                m.envMapIntensity = 0.34;
                m.metalness = Math.min(m.metalness, 0.16);
                m.roughness = Math.max(m.roughness, 0.62);
              }
              m.needsUpdate = true;
            });
          }

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
        model.scale.setScalar(7.0 / maxDim);
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
        // Asegura que el camión esté en su posición real de entrada (fuera
        // de cuadro) ANTES del warm-up de abajo — computeFraming() recién
        // recalculó enterX con los bounds reales del modelo, distintos del
        // estimado usado al montar la escena.
        truckRig.position.x = animRef.current.framing.enterX;

        onProgressRef.current(100);

        // ---- Warm-up explícito y determinista ----
        // El salto/tirón al arrancar la entrada no era el easing (ya era
        // ease-out): era que three.js compila los shaders de los materiales
        // del camión en el primer frame que los incluye. Ese trabajo
        // síncrono se comía tiempo real de reloj mientras el hilo principal
        // estaba bloqueado. Forzamos compile() + un render AHORA, con el
        // camión quieto en enterX (fuera de cuadro, invisible), para que ese
        // costo quede pagado antes de arrancar el conteo de ENTER_DURATION.
        renderer.compile(scene, camera); // precompila/enlaza los shaders de todos los materiales
        renderer.render(scene, camera); // primer render "en frío", con el camión ya en escena

        // Red de seguridad: 2 frames de rAF más quietos (el camión sigue en
        // enterX) antes de arrancar el travel, por si el navegador todavía
        // necesita asentar/pintar el frame recién forzado.
        animRef.current.state = "warming";
        animRef.current.warmupFramesLeft = 2;
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
      // Clamp a ~32ms (2 frames @60fps): si el hilo principal se traba un
      // instante (compite con la hidratación de la página real por debajo),
      // este frame avanza como máximo ese tanto en vez del tiempo real
      // transcurrido. Sin este tope, un hitch de ej. 300ms se traduciría en
      // un salto de posición de 300ms de recorrido de golpe — un objeto que
      // se frena un instante se ve fluido, uno que salta se ve roto.
      const dt = Math.min(0.032, (now - lastT) / 1000);
      lastT = now;
      const anim = animRef.current;
      const { enterX, centerX, exitX } = anim.framing;

      // enterRateT: 0 al arrancar la entrada, 1 al llegar al centro. Se usa
      // para que la velocidad de giro de las ruedas decelere EN SINCRONÍA
      // con el cuerpo del camión (ver más abajo) — sin esto, aunque la
      // posición del camión frene con una curva perfectamente suave, las
      // ruedas seguían girando a velocidad de "entrada" hasta el frame
      // exacto en que el estado cambiaba a "idle", y ahí caían de golpe a
      // la velocidad de reposo. Ese recorte abrupto en una parte del
      // camión que SÍ se sigue moviendo (las ruedas) es lo que se leía
      // como un enganchón justo al llegar al centro, aunque la carrocería
      // misma nunca saltara.
      let enterRateT = 1;
      if (anim.state === "warming") {
        // El costo pesado (compile() + primer shadow map) ya se pagó de
        // forma síncrona justo antes de entrar a este estado (ver el
        // callback de carga del GLB) — esto es solo una red de seguridad de
        // 2 frames quietos en enterX (fuera de cuadro) para que el navegador
        // termine de asentar/pintar ese frame forzado antes de que el reloj
        // de ENTER_DURATION arranque.
        truckRig.position.x = enterX;
        anim.warmupFramesLeft -= 1;
        if (anim.warmupFramesLeft <= 0) {
          anim.state = "entering";
          anim.enterElapsedMs = 0;
        }
      } else if (anim.state === "entering") {
        // Progreso acumulado por delta (ya clampeado arriba), NO reloj de
        // pared contra un instante fijo: así un hitch se traduce en una
        // pausa de este frame, nunca en un salto de posición para "ponerse
        // al día" con el tiempo real transcurrido.
        anim.enterElapsedMs += dt * 1000;
        const t = Math.min(1, anim.enterElapsedMs / ENTER_DURATION);
        enterRateT = easeOutCubic(t);
        truckRig.position.x = THREE.MathUtils.lerp(enterX, centerX, enterRateT);
        if (t >= 1) anim.state = "idle";
      } else if (anim.state === "idle") {
        truckRig.position.x = centerX;
      } else if (anim.state === "leaving") {
        const t = Math.min(1, (now - anim.leaveStartAt) / LEAVE_DURATION);
        truckRig.position.x = THREE.MathUtils.lerp(anim.leaveStartX, exitX, easeInCubic(t));
        if (t >= 1) anim.state = "gone";
      }

      const leaving = anim.state === "leaving";
      const alive = anim.state !== "waiting" && anim.state !== "warming" && anim.state !== "gone";

      if (alive) {
        // suspensión/ralentí: pocos px visuales
        truckRig.position.y = RIG_BASE_Y + Math.sin(now * 0.0052) * 0.0035;
        // glow sigue al camión y respira
        floorGlow.position.x = THREE.MathUtils.lerp(floorGlow.position.x, truckRig.position.x * 0.4, 0.1);
        const s = 1 + Math.sin(now * 0.003) * 0.008 + (leaving ? 0.02 : 0);
        floorGlow.scale.set(s, s, 1);
        pointGlow.position.x = truckRig.position.x * 0.5;
        // la sombra de contacto sí sigue al camión 1:1 — tiene que quedar
        // siempre exactamente bajo las ruedas.
        contactShadow.position.x = truckRig.position.x;

        // ruedas (solo si el GLB las trae separadas): giran incluso en idle
        // para acompañar la carretera en movimiento; aceleran al salir.
        if (anim.wheels.length) {
          // Entrando: interpola de 18 rad/s (llegando) a 7 rad/s (reposo) con
          // la MISMA curva que frena el cuerpo (enterRateT) — a t=1 da
          // exactamente 7, igual que el valor fijo de "idle", así que el
          // cambio de estado no produce ningún salto de velocidad.
          const rate = leaving ? 32 : anim.state === "entering" ? THREE.MathUtils.lerp(18, 7, enterRateT) : 7; // rad/s
          const step = rate * dt;
          for (const w of anim.wheels) w.obj.rotation[w.axis] += step * w.dir;
        }
      }

      // Emisión de humo: tranquila en idle, más frecuente al acelerar, se
      // detiene cuando el camión ya salió (las partículas vivas terminan solas).
      if (alive && anim.state !== "entering") {
        anim.emitAcc += dt;
        const interval = leaving ? 0.075 : 0.22;
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
      envRT.dispose();
      pmrem.dispose();
      floorGlowGeo.dispose();
      floorGlowMat.dispose();
      contactGeo.dispose();
      contactMat.dispose();
      contactTex.dispose();
      renderer.dispose();
      dracoLoader.dispose();
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
        enterElapsedMs: 0,
        leaveStartAt: 0,
        leaveStartX: -11.5,
        warmupFramesLeft: 0,
      };
    };
    // El montaje de Three.js debe correr una sola vez; los callbacks se leen
    // desde refs (ver arriba) para no reiniciar la escena en cada re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leaving = phase === "leaving" || phase === "done";

  return (
    <div className={leaving ? `${styles.stage} ${styles.isLeaving}` : styles.stage} aria-hidden>
      {/* Fondo premium: aurora + halo central + ondas de marca.
          Todo esto es CSS/SVG barato; el único elemento 3D pesado sigue siendo el camión. */}
      <div className={styles.backdrop} />
      <div className={styles.aurora} />
      <div className={styles.radial} />

      <svg className={styles.waveField} viewBox="0 0 1600 900" preserveAspectRatio="none">
        <defs>
          <linearGradient id="waveGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b7bff" stopOpacity="0" />
            <stop offset="30%" stopColor="#73aef8" stopOpacity=".24" />
            <stop offset="68%" stopColor="#9dc5ff" stopOpacity=".20" />
            <stop offset="100%" stopColor="#3b7bff" stopOpacity="0" />
          </linearGradient>
          <filter id="waveGlow" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className={styles.waveBack} fill="none" stroke="url(#waveGradient)" filter="url(#waveGlow)">
          <path d="M-90 420 C 170 180, 330 600, 620 382 S 1030 170, 1300 390 S 1580 520, 1700 305" />
          <path d="M-110 455 C 190 230, 355 625, 645 412 S 1050 210, 1310 418 S 1560 552, 1710 342" />
          <path d="M-120 490 C 210 280, 380 655, 675 442 S 1080 250, 1340 448 S 1580 585, 1720 380" />
        </g>
      </svg>

      <div className={styles.skySpecks}>
        {Array.from({ length: 26 }).map((_, i) => (
          <i key={i} style={{ ["--i" as string]: i } as CSSProperties} />
        ))}
      </div>

      {/* Silueta urbana muy discreta: ayuda a vender logística/corporativo sin competir con el GLB */}
      <div className={styles.skyline} aria-hidden>
        <span /><span /><span /><span /><span /><span /><span /><span /><span />
      </div>

      <div className={styles.floor} />
      <div className={styles.floorReflection} />
      <div className={styles.stageLight} />
      <div className={styles.surfacePlate} />
      <div className={styles.horizon} />

      <div ref={containerRef} className={styles.canvasHost} />

      <div className={styles.road}>
        <span className={styles.roadGlow} />
        <span className={styles.roadEdge} />
        <span className={styles.roadDash} />
      </div>

      <div className={styles.speedlines}>
        <span /><span /><span /><span />
      </div>

      <div className={styles.motes}>
        {Array.from({ length: 18 }).map((_, i) => {
          const r = ((i * 9301 + 49297) % 233280) / 233280;
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

      <div className={styles.vignette} />
    </div>
  );
}
