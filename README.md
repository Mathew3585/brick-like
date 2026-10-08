# Socle

Tu poses ton téléphone sur une puce NFC, les apps qui te distraient se mettent en pause. Pour les récupérer, il faut revenir à la puce.

- `app/` : l'app Android (Expo SDK 57, React Native 0.86, Reanimated 4, expo-router)
- `app/modules/socle-blocker/` : le module natif Kotlin (service d'accessibilité, écran de blocage, lecture NFC)
- `design/socle.html` : la maquette validée

## Comment ça bloque

| Pièce | Rôle |
|---|---|
| `SocleAccessibilityService` | Voit quelle app passe au premier plan. Pendant une session, une app du mode est renvoyée à l'accueil et couverte par l'écran de blocage. |
| `ShieldActivity` | L'écran noir « Instagram est en pause », natif pour s'afficher instantanément même si le JS dort. |
| `SessionStore` | La session en cours, dans les SharedPreferences : le blocage continue si l'app est tuée. |
| `scanTag()` | Lit l'identifiant de n'importe quelle puce NFC (mode lecteur). Seules les puces associées débloquent. |

Tout reste sur le téléphone : pas de serveur, pas de compte.

## Tester

```bash
cd app
npm install
npx expo prebuild -p android
cd android && ./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
```

Au premier lancement :
1. **Accessibilité → Socle → activer.** Si l'interrupteur est grisé (APK installé hors Play Store) : Infos de l'app → ⋮ → « Autoriser les paramètres restreints ».
2. **Associer une puce** : autocollant NTAG213, carte de transport, badge d'immeuble. Pas de puce : « Socle virtuel ».

Dans Expo Go (`npx expo start`), le module natif est absent : l'app tourne en simulation (rien n'est bloqué, les icônes d'apps du mode verrouillé ouvrent un faux écran de blocage).

## Vérifier

```bash
cd app
npx tsc --noEmit
npx expo lint
```
