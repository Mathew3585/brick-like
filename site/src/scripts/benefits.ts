import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';

gsap.registerPlugin(Flip);

/**
 * « Ce que tu récupères » : la grande carte joue sa vidéo, puis la suivante prend sa place.
 * La rotation ne tourne que si la section est à l'écran. Sans animation : posters fixes, pas de rotation.
 */
const root = document.querySelector<HTMLElement>('[data-benefits]');
const reduced = document.documentElement.classList.contains('reduced');
/** Une carte ne reste pas en grand plus longtemps que ça, même si sa vidéo est plus longue. */
const MAX = 9;
const SLOTS = ['big', 'top', 'bot'] as const;

if (root && !reduced) {
  const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-benefit]'));
  const video = (c: HTMLElement) => c.querySelector('video')!;
  let order = [...cards];
  let visible = false;
  let moving = false;

  const big = () => order[0];

  function play() {
    const v = video(big());
    if (!visible) return;
    v.play().catch(() => {});
  }

  function tick() {
    const c = big();
    const v = video(c);
    const length = Math.min(v.duration || MAX, MAX);
    if (v.currentTime >= length && !moving) next(1);
  }

  /** Fait passer en grand la carte `steps` positions plus loin (1 = celle du haut à droite). */
  function next(steps: number) {
    if (moving || steps === 0) return;
    moving = true;
    const old = big();
    video(old).pause();
    // L'ancienne grande va en bas, celle du haut monte en grand, celle du bas monte en haut.
    order = [...order.slice(steps), ...order.slice(0, steps)];
    const state = Flip.getState(cards);
    order.forEach((c, i) => (c.dataset.slot = SLOTS[i]));
    Flip.from(state, {
      duration: 0.9,
      ease: 'power3.inOut',
      absolute: true,
      nested: true,
      onComplete: () => {
        moving = false;
        const v = video(big());
        v.currentTime = 0;
        play();
      },
    });
  }

  for (const c of cards) {
    const v = video(c);
    v.addEventListener('timeupdate', () => c === big() && tick());
    v.addEventListener('ended', () => c === big() && !moving && next(1));
    c.querySelector('button')!.addEventListener('click', () => {
      const i = order.indexOf(c);
      if (i > 0) next(i);
    });
  }

  // Les vidéos ne se chargent qu'à l'approche de la section, et ne jouent que quand elle est visible.
  new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible) {
        for (const c of cards) if (video(c).preload !== 'auto') video(c).preload = 'auto';
        play();
      } else {
        video(big()).pause();
      }
    },
    { rootMargin: '200px 0px', threshold: 0 },
  ).observe(root);
}
