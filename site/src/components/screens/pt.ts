/**
 * Les écrans reprennent les cotes de l'app en points (écran de 390 pt de large). `--pt` vaut un
 * point à la taille du téléphone affiché (défini dans Phone.astro).
 */
export const pt = (n: number) => `calc(${n} * var(--pt))`;
