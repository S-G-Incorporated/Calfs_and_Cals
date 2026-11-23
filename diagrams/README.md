# Diagrammer – Calfs & Cals

PlantUML-kilder til hovedopgaven. Diagrammerne er lavet ud fra koden i `src/`.

| Fil | Diagram | Bygger på |
| --- | --- | --- |
| `01-use-case.puml` | Use case-diagram | Hele appen |
| `02-domaenemodel.puml` | Domænemodel (konceptuel, ingen metoder) | `lib/store.tsx` |
| `03-ssd-scan-stregkode.puml` | System-sekvensdiagram for UC2 | `app/scan.tsx` |
| `04-sekvens-scan-stregkode.puml` | Designsekvensdiagram for UC2 | `app/scan.tsx`, `lib/food-lookup.ts`, `lib/store.tsx` |
| `05-sekvens-gennemfoer-traening.puml` | Designsekvensdiagram for UC6 | `app/train/index.tsx`, `app/workout/[id].tsx`, `lib/active-workout.tsx` |
| `06-tilstand-aktiv-traening.puml` | Tilstandsdiagram for aktiv træning | `lib/active-workout.tsx` |
| `07-tilstand-scan.puml` | Tilstandsdiagram for scan-skærmen | `app/scan.tsx` |
| `08-designklassediagram.puml` | Designklassediagram (typer og stores) | `lib/` |
| `09-arkitektur-lag.puml` | Lag og afhængigheder | `src/app`, `src/components`, `src/lib` |
| `10-navigation.puml` | Navigation mellem skærme | `src/app/**/_layout.tsx`, `router.push`-kald |
| `11-deployment.puml` | Deployment | AsyncStorage, Open Food Facts, GitHub Actions |
| `12-aktivitet-ci.puml` | Aktivitetsdiagram for CI | `.github/workflows/` |

## Render

- VS Code: udvidelsen "PlantUML" (jebbs.plantuml), derefter `Alt+D` for preview.
- Kommandolinje (kræver Java): `java -jar plantuml.jar -tsvg diagrams/*.puml`

Opdatér diagrammerne, når datamodellen i `lib/store.tsx` eller ruterne i `src/app/` ændres.
