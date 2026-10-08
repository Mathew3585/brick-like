/**
 * Envoie l'e-mail en JSON ({ email }) à PUBLIC_WAITLIST_ENDPOINT (Formspree, un webhook, etc.).
 * Sans adresse configurée : en dev on simule, en prod on affiche une erreur plutôt que de perdre l'inscription.
 */
const ENDPOINT = import.meta.env.PUBLIC_WAITLIST_ENDPOINT as string | undefined;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HELP = "Un seul e-mail, le jour de la sortie. Rien d'autre.";

async function send(email: string) {
  if (!ENDPOINT) {
    if (import.meta.env.DEV) {
      console.warn('[waitlist] PUBLIC_WAITLIST_ENDPOINT absent, inscription simulée :', email);
      await new Promise((r) => setTimeout(r, 700));
      return;
    }
    throw new Error('no-endpoint');
  }
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(String(res.status));
}

for (const form of document.querySelectorAll<HTMLFormElement>('form[data-waitlist]')) {
  const input = form.querySelector('input')!;
  const button = form.querySelector('button')!;
  const msg = form.querySelector<HTMLElement>('[data-msg]')!;
  const arrow = form.querySelector('[data-arrow]')!;
  const spin = form.querySelector('[data-spin]')!;

  const say = (text: string, error = false) => {
    msg.textContent = text;
    msg.classList.toggle('text-fg', error);
    msg.classList.toggle('font-medium', error);
    input.setAttribute('aria-invalid', String(error));
  };
  const busy = (on: boolean) => {
    button.disabled = on;
    arrow.classList.toggle('hidden', on);
    spin.classList.toggle('hidden', !on);
  };

  input.addEventListener('input', () => {
    if (input.getAttribute('aria-invalid') === 'true') say(HELP);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = input.value.trim();
    if (!EMAIL.test(email)) {
      say(email ? 'Cette adresse ne semble pas complète.' : "Écris ton adresse e-mail d'abord.", true);
      input.focus();
      return;
    }
    busy(true);
    try {
      await send(email);
      // Les deux formulaires partagent l'inscription : inutile de redemander.
      for (const f of document.querySelectorAll<HTMLFormElement>('form[data-waitlist]')) {
        for (const el of f.querySelectorAll<HTMLElement>('label, [data-row], [data-msg]')) el.hidden = true;
        f.querySelector<HTMLElement>('[data-done]')!.hidden = false;
      }
    } catch {
      say("L'inscription n'est pas passée. Réessaie dans un instant.", true);
    } finally {
      busy(false);
    }
  });
}
