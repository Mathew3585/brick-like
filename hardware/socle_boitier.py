"""
Boîtier du Socle, en deux pièces qui se ferment en tournant (fermeture à baïonnette).

- Base : plate et ronde. Son haut est un col un peu plus étroit qui porte 3 ergots à l'extérieur.
- Couvercle : coiffe le col (sa jupe descend à l'extérieur), porte le tag NFC dans un logement caché
  dessous et « SOCLE » gravé dessus. On aligne, on enfonce, on tourne de 25°.
  Fermé, le palet ne montre qu'une fine ligne : la jupe affleure le bas de la base.

Trois versions :

  python socle_boitier.py passif    juste le tag NFC : Ø 80 mm, 8 mm de haut (aucune électronique)
  python socle_boitier.py broches   + ESP32 posée sur ses broches soudées et lecteur PN532
  python socle_boitier.py plat      + ESP32 et PN532 sans broches, fils soudés directement

Sans argument, les trois sont générées. Sorties : socle_<version>_base.step, _couvercle.step,
_assemblage.step et les .stl à imprimer. Cotes en millimètres : mesure tes cartes et ajuste ici.
"""

import math
import sys
from dataclasses import dataclass
from pathlib import Path

import cadquery as cq

OUT = Path(__file__).parent


@dataclass(frozen=True)
class Version:
    diametre: float
    contenu: float          # hauteur occupée au-dessus du fond (cartes, ou rien pour le passif)
    electronique: bool      # guides pour l'ESP32 et le PN532, fenêtre USB-C, trou de LED
    usb_prise: float = 0.0  # hauteur du centre de la prise USB-C au-dessus du fond
    fond: float = 2.0
    ep_couvercle: float = 2.6
    col_h: float = 6.0      # hauteur du col (= de la jupe du couvercle)
    ergot_h: float = 2.0
    ergot_z: float = 1.6    # haut de l'ergot, sous le haut du col
    anneau_r: float = 28.0  # anneau gravé sur le dessus

    @property
    def r(self):
        return self.diametre / 2


VERSIONS = {
    # Le tag seul : le couvercle porte l'autocollant, la base n'a qu'un petit vide dessous.
    "passif": Version(diametre=80, contenu=3.2, electronique=False, fond=1.6, ep_couvercle=2.4,
                      col_h=4.2, ergot_h=1.6, ergot_z=1.2, anneau_r=22.0),
    "broches": Version(diametre=104, contenu=16.0, electronique=True, usb_prise=12.4),
    "plat": Version(diametre=104, contenu=5.5, electronique=True, usb_prise=3.4),
}

MARGE_HAUT = 0.8        # air entre le contenu et le couvercle

# --- Baïonnette extérieure --------------------------------------------------------------------
JEU = 0.25              # jeu radial entre le col et la jupe (impression FDM)
JUPE_EP = 3.2           # épaisseur de la jupe du couvercle
PAROI = 1.8             # épaisseur du col
ERGOT_SAILLIE = 1.4     # l'ergot dépasse du col de 1,4 mm
ERGOT_LARG = 11.0       # degrés
GORGE_SAILLIE = ERGOT_SAILLIE + JEU + 0.35   # la gorge creuse la jupe un peu plus que l'ergot
ENCOCHE_LARG = 16.0     # degrés
COURSE = 40.0           # longueur angulaire de la gorge depuis l'encoche
ROTATION = 25.0         # rotation pour fermer
ANGLES = (30.0, 150.0, 270.0)  # 3 encoches à 120°

# --- Électronique (mesures typiques, avec 0,5 mm de jeu) --------------------------------------
ESP32 = (56.5, 29.5)    # DevKit ESP32 USB-C 38 broches
PN532 = (43.5, 41.5)    # module PN532 rouge
ECART = 3.0             # entre les deux cartes
GUIDE_EP, GUIDE_L, GUIDE_H = 1.2, 5.0, 3.0
USB_LARG, USB_H = 13.0, 8.0   # fenêtre USB-C

# --- Couvercle --------------------------------------------------------------------------------
TAG_D, TAG_PROF = 30.0, 0.8     # logement du tag (autocollants ~25 mm) sous le couvercle
LED_D = 3.2                     # trou de LED à 11 % du bord, comme sur la maquette
GRAVURE = 0.5                   # profondeur du texte et de l'anneau gravés


def r_col(v):
    return v.r - JUPE_EP - JEU


def hauteur_base(v):
    return v.fond + v.contenu + MARGE_HAUT


def anneau(r_int, r_ext, z0, h):
    return cq.Workplane("XY").workplane(offset=z0).circle(r_ext).circle(r_int).extrude(h)


def secteur(r_int, r_ext, z0, h, a0, a1):
    pts = [(0, 0)] + [
        (90 * math.cos(math.radians(a0 + (a1 - a0) * i / 32)), 90 * math.sin(math.radians(a0 + (a1 - a0) * i / 32)))
        for i in range(33)
    ]
    coin = cq.Workplane("XY").workplane(offset=z0).polyline(pts).close().extrude(h)
    return anneau(r_int, r_ext, z0, h).intersect(coin)


def boite(cx, cy, sx, sy, z0, h):
    return cq.Workplane("XY").workplane(offset=z0).center(cx, cy).rect(sx, sy).extrude(h)


def disposition():
    """Centres Y de l'ESP32 et du PN532, empilés et centrés dans le cercle."""
    total = ESP32[1] + ECART + PN532[1]
    bas = -total / 2 + 2.5
    return bas + ESP32[1] / 2, bas + ESP32[1] + ECART + PN532[1] / 2


def guides(v, cx, cy, sx, sy):
    """Quatre équerres basses qui calent une carte sans vis."""
    g = None
    for dx in (-1, 1):
        for dy in (-1, 1):
            x = cx + dx * (sx / 2 + GUIDE_EP / 2)
            y = cy + dy * (sy / 2 + GUIDE_EP / 2)
            a = boite(x, y - dy * (GUIDE_L / 2 - GUIDE_EP / 2), GUIDE_EP, GUIDE_L, v.fond, GUIDE_H)
            b = boite(x - dx * (GUIDE_L / 2 - GUIDE_EP / 2), y, GUIDE_L, GUIDE_EP, v.fond, GUIDE_H)
            piece = a.union(b)
            g = piece if g is None else g.union(piece)
    return g


def fenetre_usb(v):
    h = hauteur_base(v)
    ey, _ = disposition()
    zc = v.fond + v.usb_prise
    z0 = max(v.fond + 0.4, zc - USB_H / 2)
    z1 = min(h - 0.6, zc + USB_H / 2)
    return boite(-v.r, ey, 2 * JUPE_EP + 16, USB_LARG, z0, z1 - z0)


def base(v):
    h = hauteur_base(v)
    rc = r_col(v)
    bas_col = h - v.col_h
    b = cq.Workplane("XY").circle(v.r).extrude(bas_col).edges("<Z").fillet(min(1.2, bas_col * 0.6))
    b = b.union(cq.Workplane("XY").workplane(offset=bas_col).circle(rc).extrude(v.col_h))
    b = b.cut(cq.Workplane("XY").workplane(offset=v.fond).circle(rc - PAROI).extrude(h))

    # Ergots sur le col, à l'angle des encoches du couvercle une fois fermé.
    for a in ANGLES:
        centre = a + ENCOCHE_LARG / 2 + ROTATION
        b = b.union(
            secteur(rc - 0.5, rc + ERGOT_SAILLIE, h - v.ergot_z - v.ergot_h, v.ergot_h,
                    centre - ERGOT_LARG / 2, centre + ERGOT_LARG / 2)
        )

    if v.electronique:
        ey, py = disposition()
        b = b.union(guides(v, 0, ey, *ESP32)).union(guides(v, 0, py, *PN532))
        b = b.cut(fenetre_usb(v))
    return b


def couvercle(v):
    z = hauteur_base(v)
    rc = r_col(v)
    c = cq.Workplane("XY").workplane(offset=z).circle(v.r).extrude(v.ep_couvercle)
    c = c.faces(">Z").edges().fillet(1.8)
    c = c.union(anneau(rc + JEU, v.r, z - v.col_h + 0.3, v.col_h - 0.3))   # 0,3 mm d'air au-dessus de l'épaulement

    # Baïonnette : encoche verticale depuis le bas de la jupe, puis gorge horizontale.
    gorge_haut, gorge_bas = v.ergot_z - 0.3, v.ergot_z + v.ergot_h + 0.3
    r0, r1 = rc - 0.5, rc + GORGE_SAILLIE
    for a in ANGLES:
        c = c.cut(secteur(r0, r1, z - v.col_h - 1, v.col_h + 1 - gorge_haut, a, a + ENCOCHE_LARG))
        c = c.cut(secteur(r0, r1, z - gorge_bas, gorge_bas - gorge_haut, a, a + COURSE))

    # Logement du tag sous le plateau, au centre : le téléphone lit à travers le plastique.
    c = c.cut(cq.Workplane("XY").workplane(offset=z).circle(TAG_D / 2).extrude(TAG_PROF))

    if v.electronique:
        led_y = v.r - 11.0
        c = c.cut(cq.Workplane("XY").workplane(offset=z - 1).center(0, led_y).circle(LED_D / 2).extrude(v.ep_couvercle + 2))
        # La jupe passe devant la prise USB : même fenêtre, à la position fermée.
        c = c.cut(fenetre_usb(v))

    # Dessus : anneau creusé et « SOCLE » gravé.
    top = z + v.ep_couvercle
    c = c.cut(anneau(v.anneau_r - 0.4, v.anneau_r + 0.4, top - GRAVURE, GRAVURE + 1))
    texte = (
        cq.Workplane("XY").workplane(offset=top - GRAVURE)
        .text("S O C L E", 6.5 * v.anneau_r / 28, GRAVURE + 1, kind="bold", halign="center", valign="center")
    )
    return c.cut(texte)


def exporter(nom_version):
    v = VERSIONS[nom_version]
    b, c = base(v), couvercle(v)
    nom = f"socle_{nom_version}"
    cq.exporters.export(b, str(OUT / f"{nom}_base.step"))
    cq.exporters.export(c, str(OUT / f"{nom}_couvercle.step"))
    assemblage = cq.Assembly(name=nom).add(b, name="base", color=cq.Color(0.1, 0.1, 0.11)).add(
        c, name="couvercle", color=cq.Color(0.16, 0.16, 0.17)
    )
    assemblage.export(str(OUT / f"{nom}_assemblage.step"))

    # STL prêts à imprimer : base telle quelle, couvercle retourné (plateau sur le plateau d'impression).
    cq.exporters.export(b, str(OUT / f"{nom}_base.stl"), tolerance=0.05, angularTolerance=0.1)
    top = hauteur_base(v) + v.ep_couvercle
    retourne = c.rotate((0, 0, 0), (1, 0, 0), 180).translate((0, 0, top))
    cq.exporters.export(retourne, str(OUT / f"{nom}_couvercle.stl"), tolerance=0.05, angularTolerance=0.1)
    print(f"{nom_version}: diametre {v.diametre:g} mm, {top:.1f} mm de haut au total")


if __name__ == "__main__":
    for nom_version in sys.argv[1:] or list(VERSIONS):
        exporter(nom_version)
