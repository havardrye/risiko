# Risikostyring

React-applikasjon for risikostyring, utviklet spec-drevet.

**Prøv appen:** https://havardrye.github.io/risiko/

Data lagres bare i nettleseren til den som bruker appen. Del data mellom brukere med «Eksporter» og «Importer».

- Prinsipper: [specs/constitution.md](specs/constitution.md)
- MVP: [spec](specs/001-mvp/spec.md), [plan](specs/001-mvp/plan.md), [oppgaver](specs/001-mvp/tasks.md)

## Kommandoer

| Kommando | Gjør |
|---|---|
| `npm run dev` | Starter utviklingsserver |
| `npm test` | Kjører testene én gang |
| `npm run test:watch` | Kjører testene fortløpende |
| `npm run lint` | Linter koden (oxlint) |
| `npm run build` | Typesjekker og bygger til `dist/` |

## Publisering

Hver push til `main` kjører test, lint og build, og publiserer `dist/` på GitHub Pages hvis alt går gjennom ([.github/workflows/pages.yml](.github/workflows/pages.yml)). Publiseringen kan også startes manuelt under *Actions* på GitHub.
