import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import type { PuckApi } from './puck3d';

gsap.registerPlugin(ScrollTrigger);

const reduced = document.documentElement.classList.contains('reduced');
const SPRING = 'expo.out';

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(sel));

/* ---------- Ton de la page : papier, encre, papier ---------- */

const themeMeta = $<HTMLMetaElement>('meta[name="theme-color"]');
function setTone(tone: 'light' | 'dark') {
  if (document.documentElement.dataset.tone === tone) return;
  document.documentElement.dataset.tone = tone;
  themeMeta?.setAttribute('content', tone === 'dark' ? '#050505' : '#FAFAF9');
}

/* ---------- Chronos : ils ne tournent que s'ils sont lancés et visibles ---------- */

const fmt = (s: number) => [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((n) => String(n).padStart(2, '0')).join(':');
const clocks = $$('[data-clock]');
const visible = new Set<Element>();
const io = new IntersectionObserver((entries) => entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target))));
clocks.forEach((c) => io.observe(c));
/** Affiche un temps et fait suivre l'anneau d'objectif de l'écran, s'il en a un. */
function showTime(c: HTMLElement, s: number) {
  c.dataset.clock = String(s);
  c.textContent = fmt(s);
  const ring = c.closest('.screen')?.querySelector<SVGCircleElement>('[data-ring]');
  if (!ring) return;
  const len = Number(ring.getAttribute('stroke-dasharray'));
  ring.setAttribute('stroke-dashoffset', String(len * (1 - Math.max(0.004, Math.min(1, s / Number(ring.dataset.ring))))));
}
setInterval(() => {
  for (const c of clocks) {
    if (!visible.has(c) || c.dataset.run === 'false') continue;
    showTime(c, Number(c.dataset.clock) + 1);
  }
}, 1000);

/* ---------- Socles 3D ---------- */

// Three.js arrive dans un morceau à part ; tant qu'il charge, le dessin SVG tient la place.
const puck3d = import('./puck3d').then(async (m) => {
  await m.mountAll();
  ScrollTrigger.refresh();
  return m;
});
const pucks: Record<string, PuckApi | undefined> = {};
for (const id of ['hero', 'lock', 'object']) puck3d.then((m) => m.whenPuck(id)).then((api) => (pucks[id] = api));

/* ---------- Défilement fluide ---------- */

if (!reduced) {
  const lenis = new Lenis({ anchors: true, lerp: 0.1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ---------- Nav : cachée en haut, elle s'ouvre dès qu'on descend ---------- */

const nav = $('[data-nav]');
// Une pastille glisse sous le lien survolé ; elle apparaît sur place quand on arrive de l'extérieur.
const linkList = $('[data-nav-links]');
const pill = $('[data-nav-pill]');
if (linkList && pill) {
  for (const a of $$('a', linkList)) {
    a.addEventListener('pointerenter', () => {
      const fresh = !pill.classList.contains('is-on');
      pill.classList.toggle('is-jump', fresh);
      pill.style.setProperty('--px', `${a.offsetLeft}px`);
      pill.style.setProperty('--pw', `${a.offsetWidth}px`);
      pill.classList.add('is-on');
    });
  }
  linkList.addEventListener('pointerleave', () => pill.classList.remove('is-on'));
}
if (nav) ScrollTrigger.create({ start: 80, end: 'max', onToggle: (self) => nav.classList.toggle('is-shown', self.isActive) });

/* ---------- Séquence centrale ---------- */

const lock = $('[data-lock]')!;
// Le chrono de la séquence suit le défilement, pas l'horloge : on fait passer le temps en accéléré.
const lockClock = $('[data-screen="locked"] [data-clock]', lock)!;
lockClock.dataset.run = 'false';
const LAPSE = 21 * 60;
let darkStart: () => number;

if (reduced) {
  showTime(lockClock, LAPSE);
  const st = ScrollTrigger.create({ trigger: lock, start: 'top 40%' });
  darkStart = () => st.start;
  // Sans défilement animé, le Socle de la section objet est montré de trois quarts, gravure visible.
  puck3d.then((m) => m.whenPuck('object')).then((api) => api.setView(48, 0));
} else {
  const phone = $('[data-lock-phone]', lock)!;
  const puck = $('[data-lock-puck]', lock)!;
  const home = $('[data-screen="home"]', lock)!;
  const locked = $('[data-screen="locked"]', lock)!;
  const [s0, s1, s2] = $$('[data-step]', lock);
  const names = $$('[data-mode]', lock);

  // Distance entre le centre du téléphone et le centre du dessus du Socle, donné par la scène 3D.
  const top = $('[data-puck3d]', puck)!;
  const drop = () => puck.offsetTop + puck.offsetHeight * Number(top.dataset.topY ?? 0.45) - (phone.offsetTop + phone.offsetHeight / 2);
  // Le téléphone se couche à 90° moins l'élévation de la caméra 3D : il est alors à plat sur le Socle.
  const lay = 90 - Number(top.dataset.elev ?? 28);
  const fx = { pulse: 0, t: 0, land: 0 };
  // Position recalculée à chaque image depuis la mise en page réelle : une distance mémorisée au
  // chargement serait fausse si la page s'ouvre au milieu de la séquence.
  const land = () => gsap.set(phone, { y: drop() * fx.land, rotateX: lay * fx.land, scale: 1 - 0.1 * fx.land });

  // Moment où le téléphone touche le Socle, en temps de timeline puis en progression.
  const CONTACT = 4.5;
  let contactAt = 0.5;
  const tl = gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    scrollTrigger: {
      trigger: lock,
      start: 'top top',
      end: '+=320%',
      pin: true,
      scrub: 0.8,
      invalidateOnRefresh: true,
    },
  });

  // 1. Choisir un mode : le nom passe sur Lecture, puis revient sur Travail.
  tl.to(names[0], { opacity: 0, y: -8, duration: 0.3 }, 0.5)
    .fromTo(names[1], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3 }, 0.55)
    .to(names[1], { opacity: 0, y: -8, duration: 0.3 }, 1.2)
    .fromTo(names[0], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, immediateRender: false }, 1.25)
    // 2. Poser sur le Socle.
    .to(s0, { opacity: 0, y: -24, duration: 0.4 }, 2)
    .fromTo(s1, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.4 }, 2.3)
    .to(fx, { land: 1, duration: 2, ease: 'power3.inOut', onUpdate: land }, 2.4)
    // Contact : ondes NFC, l'écran passe au noir.
    .fromTo(
      fx,
      { pulse: 0 },
      {
        pulse: 1,
        duration: 1.3,
        ease: 'power1.out',
        onUpdate: () => {
          pucks.lock?.setPulse(fx.pulse);
          pucks.lock?.setLed(fx.pulse > 0 ? 'on' : 'blink');
        },
      },
      CONTACT - 0.1,
    )
    .to(home, { opacity: 0, duration: 0.35 }, CONTACT)
    .to(locked, { opacity: 1, duration: 0.35 }, CONTACT)
    // 3. Tout se tait : le téléphone se relève, le temps passe, l'anneau se remplit.
    .to(s1, { opacity: 0, y: -24, duration: 0.4 }, 5.1)
    .fromTo(s2, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.4 }, 5.4)
    .to(fx, { land: 0, duration: 1.6, ease: 'power3.inOut', onUpdate: land }, 5.2)
    .to(fx, { t: LAPSE, duration: 2.2, ease: 'power1.in', onUpdate: () => showTime(lockClock, Math.round(fx.t)) }, 5.4)
    .to({}, { duration: 0.8 });

  contactAt = CONTACT / tl.duration();
  const st = tl.scrollTrigger!;
  darkStart = () => st.start + (st.end - st.start) * contactAt;
}

/* ---------- Confidentialité : les trois promesses défilent au même endroit ---------- */

// Créée ici, dans l'ordre de la page : les déclencheurs placés plus bas tiennent compte de son épinglage.
const privacy = $('[data-privacy]');
if (privacy && !reduced) {
  const points = $$('[data-point]', privacy);
  const bars = $$('[data-point-bar]', privacy);
  const tl = gsap.timeline({
    defaults: { ease: 'power3.inOut' },
    scrollTrigger: { trigger: privacy, start: 'top top', end: '+=220%', pin: true, scrub: 0.6 },
  });
  points.forEach((p, i) => {
    const title = $('[data-point-title]', p)!;
    const body = $('[data-point-body]', p)!;
    const icon = $('[data-point-icon]', p)!;
    const at = i * 1.2;
    if (i > 0) {
      tl.set(p, { opacity: 1 }, at)
        .fromTo(title, { yPercent: 105 }, { yPercent: 0, duration: 0.6 }, at)
        .fromTo(body, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, at + 0.15)
        .fromTo(icon, { scale: 0.6, opacity: 0, rotate: -30 }, { scale: 1, opacity: 1, rotate: 0, duration: 0.6 }, at);
    }
    tl.to(bars[i], { scaleX: 1, duration: 1.2, ease: 'none' }, at);
    if (i < points.length - 1) {
      const out = at + 1.2;
      tl.to(title, { yPercent: -105, duration: 0.6 }, out)
        .to(body, { opacity: 0, y: -16, duration: 0.4 }, out)
        .to(icon, { scale: 0.6, opacity: 0, rotate: 30, duration: 0.5 }, out)
        .set(p, { opacity: 0 }, out + 0.6);
    }
  });
}

// Encre du contact jusqu'au déverrouillage.
const final = $('[data-tone-section="light"]')!;
ScrollTrigger.create({
  start: () => darkStart(),
  endTrigger: final,
  end: 'top 55%',
  onToggle: (self) => setTone(self.isActive ? 'dark' : 'light'),
});

/* ---------- Le reste de la page ---------- */

if (!reduced) {
  // Hero : les lignes montent, le reste suit, le téléphone arrive en dernier.
  gsap
    .timeline({ defaults: { ease: SPRING, duration: 1.2 } })
    .from('[data-hero-line]', { yPercent: 110, stagger: 0.09 })
    .from('[data-hero-in]', { opacity: 0, y: 18, stagger: 0.08 }, 0.25)
    .from('[data-hero-object]', { opacity: 0, y: 60, scale: 0.96, duration: 1.6 }, 0.2);

  // En quittant l'accueil, le téléphone pivote pour montrer son autre tranche et s'élève.
  const heroPhone = $('[data-hero-phone]');
  if (heroPhone) {
    gsap.set(heroPhone, { transformPerspective: 1400, rotationY: -20, rotationX: 3 });
    gsap.to(heroPhone, {
      rotationY: 16,
      rotationX: 14,
      y: -70,
      scale: 0.94,
      ease: 'none',
      scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom top', scrub: 0.6 },
    });
  }

  // Le téléphone du hero suit légèrement le pointeur, comme un objet qu'on regarde.
  const stage = $('[data-hero-stage]');
  const obj = $('[data-hero-object]');
  if (stage && obj && matchMedia('(pointer: fine)').matches) {
    gsap.set(obj, { transformPerspective: 1200 });
    const rx = gsap.quickTo(obj, 'rotateX', { duration: 0.8, ease: 'power3' });
    const ry = gsap.quickTo(obj, 'rotateY', { duration: 0.8, ease: 'power3' });
    stage.addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * 12);
      rx(-((e.clientY - r.top) / r.height - 0.5) * 8);
    });
    stage.addEventListener('pointerleave', () => {
      rx(0);
      ry(0);
    });
  }

  // Apparitions au défilement.
  gsap.set('.reveal', { opacity: 0, y: 24 });
  ScrollTrigger.batch('.reveal', {
    start: 'top 88%',
    once: true,
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.1, stagger: 0.08, ease: SPRING }),
  });

  // Le constat s'allume mot à mot.
  for (const p of $$('[data-words]')) {
    gsap.to($$('.word', p), {
      opacity: 1,
      stagger: 0.1,
      ease: 'none',
      scrollTrigger: { trigger: p, start: 'top 78%', end: 'bottom 40%', scrub: true },
    });
  }

  // La limite d'écran se fait barrer.
  for (const s of $$('[data-strike]')) {
    gsap.to(s, { '--s': '100%', ease: 'none', scrollTrigger: { trigger: s, start: 'top 72%', end: 'top 38%', scrub: true } });
  }

  // On fait le tour du Socle : de profil à l'entrée, vu de dessus sur « SOCLE » à la sortie.
  const view = { elev: 14, spin: -0.9 };
  gsap.to(view, {
    elev: 62,
    spin: 0,
    ease: 'none',
    scrollTrigger: { trigger: '[data-object-stage]', start: 'top bottom', end: 'center 62%', scrub: 0.4 },
    onUpdate: () => pucks.object?.setView(view.elev, view.spin),
  });
  puck3d.then((m) => m.whenPuck('object')).then((api) => api.setView(view.elev, view.spin));

  // « Reprends. » monte quand la page repasse au papier.
  gsap.from('[data-final-word]', { yPercent: 105, duration: 1.4, stagger: 0.1, ease: SPRING, scrollTrigger: { trigger: final, start: 'top 60%' } });
}

// Les polices changent les hauteurs : on recalcule une fois qu'elles sont prêtes.
document.fonts?.ready.then(() => ScrollTrigger.refresh());
