import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  CanvasTexture,
  CircleGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  RingGeometry,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Le Socle en 3D, construit en code : un palet noir mat au bord arrondi, un anneau creusé au
 * centre, « SOCLE » gravé et une LED d'état. Rayon 1, hauteur 0,34. Chaque `[data-puck3d]` reçoit
 * sa propre scène ; le dessin SVG qu'il contient sert de repli tant que WebGL n'est pas prêt.
 */

export type Led = 'blink' | 'on';
export interface PuckApi {
  /** Élévation de la caméra en degrés (0 de profil, 90 de dessus) et rotation du palet en radians. */
  setView(elevation: number, spin?: number): void;
  /** Ondes NFC, de 0 (rien) à 1 (passées). */
  setPulse(p: number): void;
  setLed(led: Led): void;
  /** Position verticale du centre du dessus, en fraction de la hauteur du canvas. */
  topY(): number;
}

const HEIGHT = 0.34;
const TOP = 0.3;
const FOV = 20;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const registry = new Map<string, PuckApi>();
const waiting = new Map<string, ((api: PuckApi) => void)[]>();
export function whenPuck(id: string): Promise<PuckApi> {
  const ready = registry.get(id);
  if (ready) return Promise.resolve(ready);
  return new Promise((resolve) => waiting.set(id, [...(waiting.get(id) ?? []), resolve]));
}

function arc(cx: number, cy: number, r: number, from: number, to: number, steps = 10) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = ((from + ((to - from) * i) / steps) * Math.PI) / 180;
    return new Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  });
}

/** Profil tourné autour de l'axe : dessous, bord arrondi, dessus plat, puis la cuvette centrale. */
function profile() {
  return [
    new Vector2(0, 0),
    new Vector2(0.9, 0),
    ...arc(0.9, 0.09, 0.09, -90, 0),
    ...arc(0.9, HEIGHT - 0.09, 0.09, 0, 90),
    new Vector2(0.62, HEIGHT),
    ...arc(0.62, HEIGHT - 0.02, 0.02, 90, 180, 6),
    new Vector2(0.595, TOP + 0.004),
    new Vector2(0.56, TOP),
    new Vector2(0, TOP),
  ];
}

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function radial(size: number, stops: [number, string][]) {
  return canvasTexture(size, (ctx) => {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (const [o, c] of stops) g.addColorStop(o, c);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  });
}

async function engraving() {
  await document.fonts.load('500 120px "Geist Mono Variable"').catch(() => {});
  return canvasTexture(1024, (ctx) => {
    ctx.font = '500 118px "Geist Mono Variable", ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '42px';
    // Lèvre inférieure éclairée, puis la taille sombre par-dessus.
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillText('SOCLE', 533, 518);
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillText('SOCLE', 533, 512);
  });
}

function cssColor(name: string) {
  return new Color(getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#000');
}

async function mount(el: HTMLElement): Promise<PuckApi | null> {
  const canvas = el.querySelector('canvas');
  if (!canvas) return null;
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;

  const fit = Number(el.dataset.fit ?? 0.8);
  let elevation = Number(el.dataset.elev ?? 28);
  let spin = 0;
  let led: Led = (el.dataset.led as Led) ?? 'blink';
  let pulse = 0;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.32;
  pmrem.dispose();

  const key = new DirectionalLight(0xffffff, 2);
  key.position.set(-3, 5, 3);
  const rim = new DirectionalLight(0xffffff, 1.4);
  rim.position.set(1.5, 2, -4);
  scene.add(key, rim, new HemisphereLight(0xffffff, 0x000000, 0.25));

  const puck = new Group();
  scene.add(puck);

  const body = new Mesh(
    new LatheGeometry(profile(), 160),
    new MeshPhysicalMaterial({ color: 0x0d0d0f, roughness: 0.58, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.5 }),
  );
  puck.add(body);

  // Ombre de contact douce.
  const shadow = new Mesh(
    new PlaneGeometry(2.7, 2.7),
    new MeshBasicMaterial({ map: radial(256, [[0, 'rgba(0,0,0,0.6)'], [0.5, 'rgba(0,0,0,0.16)'], [0.95, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.002;
  scene.add(shadow);

  {
    const text = new Mesh(
      new CircleGeometry(0.56, 96),
      new MeshStandardMaterial({ map: await engraving(), transparent: true, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    );
    text.rotation.x = -Math.PI / 2;
    text.position.y = TOP + 0.0005;
    puck.add(text);
  }

  // LED : un petit point blanc et sa lueur, posée à plat sur le dessus (un sprite traverserait la
  // surface et serait coupé net).
  const ledDot = new Mesh(new CircleGeometry(0.02, 32), new MeshBasicMaterial({ color: 0xf4f4f2, transparent: true }));
  ledDot.rotation.x = -Math.PI / 2;
  ledDot.position.set(0, HEIGHT + 0.0015, -0.8);
  const halo = new Mesh(
    new CircleGeometry(0.15, 48),
    new MeshBasicMaterial({
      map: radial(128, [[0, 'rgba(255,255,255,0.55)'], [0.18, 'rgba(255,255,255,0.18)'], [0.55, 'rgba(255,255,255,0.04)'], [1, 'rgba(255,255,255,0)']]),
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
    }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.set(0, HEIGHT + 0.001, -0.8);
  puck.add(halo, ledDot);

  // Ondes NFC : trois anneaux posés sur le dessus, qui s'élargissent en s'effaçant.
  const rippleMat = () => new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const ripples = [0, 1, 2].map(() => {
    const r = new Mesh(new RingGeometry(0.975, 1, 160), rippleMat());
    r.rotation.x = -Math.PI / 2;
    r.position.y = HEIGHT + 0.004;
    scene.add(r);
    return r;
  });

  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
  const target = new Vector3(0, HEIGHT / 2, 0);
  const tan = Math.tan(((FOV / 2) * Math.PI) / 180);

  function place() {
    const e = (elevation * Math.PI) / 180;
    const aspect = camera.aspect;
    // Recul pour que le diamètre occupe `fit` de la largeur, et que la silhouette tienne en hauteur.
    const byWidth = 1 / (fit * tan * aspect);
    const byHeight = (2 * Math.sin(e) + HEIGHT * Math.cos(e)) / (0.78 * 2 * tan);
    const d = Math.max(byWidth, byHeight);
    camera.position.set(0, target.y + Math.sin(e) * d, Math.cos(e) * d);
    camera.lookAt(target);
    puck.rotation.y = spin;
  }

  function resize() {
    const { width, height } = el.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    place();
    el.dataset.topY = String(api.topY());
    draw();
  }

  let visible = false;
  let raf = 0;
  const animated = () => !reduced && led === 'blink';

  function frame(now: number) {
    const glow = led === 'on' || reduced ? 1 : 0.25 + 0.75 * (0.5 + 0.5 * Math.cos((now / 3000) * Math.PI * 2));
    (ledDot.material as MeshBasicMaterial).opacity = glow;
    (halo.material as MeshBasicMaterial).opacity = glow;
    renderer.render(scene, camera);
    raf = visible && animated() ? requestAnimationFrame(frame) : 0;
  }
  function draw() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  const api: PuckApi = {
    setView(e, s) {
      elevation = e;
      if (s !== undefined) spin = s;
      place();
      draw();
    },
    setPulse(p) {
      pulse = p;
      const color = cssColor('--fg');
      ripples.forEach((r, i) => {
        const t = Math.min(Math.max((pulse - i * 0.15) / 0.7, 0), 1);
        r.scale.setScalar(0.9 + t * 0.75);
        const m = r.material as MeshBasicMaterial;
        m.color.copy(color);
        m.opacity = t > 0 && t < 1 ? (1 - t) * 0.8 : 0;
      });
      draw();
    },
    setLed(l) {
      if (l === led) return;
      led = l;
      draw();
    },
    topY() {
      const p = new Vector3(0, TOP, 0).applyMatrix4(puck.matrixWorld).project(camera);
      return (1 - p.y) / 2;
    },
  };

  new ResizeObserver(resize).observe(el);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) draw();
  }).observe(el);
  resize();
  scene.updateMatrixWorld();
  el.dataset.topY = String(api.topY());
  renderer.render(scene, camera);
  el.dataset.ready = 'true';
  return api;
}

export async function mountAll() {
  for (const el of document.querySelectorAll<HTMLElement>('[data-puck3d]')) {
    const api = await mount(el);
    if (!api) continue;
    const id = el.dataset.puck3d!;
    registry.set(id, api);
    waiting.get(id)?.forEach((resolve) => resolve(api));
    waiting.delete(id);
  }
}
