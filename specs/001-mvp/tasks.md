# 001 – MVP: Oppgaver

Gjøres i rekkefølge, én om gangen. Hver oppgave er ferdig når «Ferdig når» er oppfylt og `npm test`, `npm run lint` og `npm run build` går gjennom. Kryss av når den er ferdig.

## Fase 1 – Oppsett

- [x] **T01 Prosjektoppsett.** Vite + React + TypeScript (strict), React Router, Zod, Vitest + React Testing Library + jsdom, oxlint (standard linter i Vite-malen, erstatter ESLint). Git-repo med `.gitignore`.
  *Ferdig når:* `npm run dev` viser en tom side, og én eksempeltest går grønt.

## Fase 2 – Domene (rene funksjoner, test først)

- [x] **T02 Skjemaer og typer.** `domain/schema.ts`: Zod-skjemaer for Owner, Theme, Area, Risk, AppData; typer utledet fra skjemaene. (K2, K11, K15, K17)
  *Ferdig når:* tester dekker påkrevde felt, rating utenfor 1–5 og ukjent `schemaVersion`.
- [x] **T03 Score, nivå og skalaer.** `domain/scoring.ts`: `score()`, `level()`, `LEVEL_MATRIX` etter tabellen i K10. `domain/scales.ts`: skalatekster for sannsynlighet og konsekvens per type, nivånavn og farger per type. (K2, K3, K7, K10)
  *Ferdig når:* alle 25 kombinasjoner er testet mot tabellen i K10, inkludert at 1×4 er nivå 2 og 4×1 er nivå 1.
- [x] **T04 Filtrering og sortering.** `domain/filters.ts`: søk i tittel/beskrivelse, filter på type, eier, tema, område, nivå; sortering på score, tittel, sist endret. (K4, K9)
  *Ferdig når:* hvert filter, kombinasjoner og hver sortering er testet.
- [x] **T05 Matriseoppbygging.** `domain/matrix.ts`: `buildMatrix(risks)` gir 5 rader × 10 kolonner (mulighet 5→1, trussel 1→5) med risikoer og nivå per celle. (K6)
  *Ferdig når:* tester viser at trussel (4,5) havner lengst til høyre på rad 4, mulighet (4,5) lengst til venstre på rad 4, og at tomme celler har 0.
- [x] **T06 Regler.** `domain/rules.ts`: unikt navn (uavhengig av store/små bokstaver og mellomrom), slettesperre med liste over blokkerende risikoer, referansesjekk. (K12, K13, K15–K18)
  *Ferdig når:* tester dekker duplikat, sletting i bruk/ikke i bruk og ødelagt referanse.

## Fase 3 – Data

- [x] **T07 Repository.** `data/repository.ts` (grensesnitt) og `data/localStorageRepository.ts` med `load`, `save`, `subscribe` (inkl. `storage`-hendelsen). (K19)
  *Ferdig når:* tester dekker rundtur, manglende nøkkel (tomt datasett), ugyldig JSON og feil skjemaversjon (feil returneres, rådata røres ikke).
- [x] **T08 Eksport/import-logikk.** `data/exportImport.ts`: serialisering, filnavn med dato, validering med skjema og referansesjekk. (K20, K21)
  *Ferdig når:* tester dekker gyldig fil, ugyldig JSON, skjemafeil og ødelagte referanser, alle uten at eksisterende data endres.

## Fase 4 – Tilstand og skall

- [x] **T09 DataProvider.** `state/DataProvider.tsx`: context + hooks (`useRisks`, `useOwners`, `useThemes`, `useAreas`) med opprett/endre/slett som bruker reglene fra T06 og setter `createdAt`/`updatedAt`. (K1, K2)
  *Ferdig når:* tester med et minne-repository viser at endringer lagres og at regelbrudd gir feil uten lagring.
- [x] **T10 App-skall.** Hash-ruting til de fem sidene, toppmeny, grunnleggende CSS-variabler, feilside for ugyldige lagrede data med nedlasting av rådata. Felles komponenter: skjemafelt, dialog, bekreftelsesdialog.
  *Ferdig når:* alle ruter kan nås med tastatur, og feilsiden vises ved ugyldig lagret innhold.

## Fase 5 – Referanseregistre

- [x] **T11 Generisk registerkomponent + Eiere.** Liste med antall risikoer, opprett/endre i dialog, slett med bekreftelse, melding med blokkerende risikoer. Brukes for eiere (navn, e-post). (K11–K14)
  *Ferdig når:* komponenttester dekker opprettelse, duplikat-feil og sperret sletting.
- [x] **T12 Temaer og områder.** Samme komponent konfigurert for temaer og områder (navn, beskrivelse). (K15–K18)
  *Ferdig når:* begge sidene fungerer og har en røyktest hver.

## Fase 6 – Risikoregister

- [x] **T13 Risikoskjema.** Opprett/endre i dialog med validering ved feltene, valg av type (trussel/mulighet), eier/tema/område, sannsynlighet og konsekvens 1–5 med skalatekst (konsekvenstekst følger type), score og nivå vist fortløpende. Sperret med veiledning hvis eier, tema eller område mangler. (K1–K3, K22)
  *Ferdig når:* tester dekker akseptkriteriene «gyldig skjema lagres med riktig score» og «manglende felt gir feil og lagrer ikke» og «mulighet viser Verdifull/Svært verdifull».
- [x] **T14 Risikotabell.** Tabell med score og nivå (farge + tekst), sortering, sletting med bekreftelse. (K3–K5)
  *Ferdig når:* tester dekker sortering og bekreftet/avbrutt sletting.
- [x] **T15 Filterlinje i URL.** Søk og filtre på type, eier, tema, område, nivå, lagret i URL-ens søkeparametre; «nullstill»-knapp. (K4)
  *Ferdig når:* test dekker akseptkriteriet «filter på eier X viser bare X», og filter overlever sideoppdatering.

## Fase 7 – Matrise

- [x] **T16 Matrisevisning.** HTML-tabell med 5 rader × 10 kolonner etter `referanse/risikomatrise.png`: mulighet til venstre, trussel til høyre, skalatekster på aksene, celler som knapper med antall, farge per nivå og type, tilgjengelig navn per celle, horisontal rulling i egen beholder på smale skjermer. (K6, K7)
  *Ferdig når:* tester dekker akseptkriteriene for trussel (4,5), mulighet (4,5) og trussel (1,4), og visningen er sammenlignet med referansebildet i nettleser.
- [x] **T17 Celledetaljer og filtre.** Celleklikk viser risikoene i cellen med lenke til registeret; matrisen bruker samme filterlinje som registeret. (K8, K9)
  *Ferdig når:* test dekker akseptkriteriet «tema-filter endrer antallene», og filter følger med mellom register og matrise.

## Fase 8 – Eksport, import og varsler

- [x] **T18 Eksport/import i UI.** Knapper i toppmenyen; import viser bekreftelse med antall elementer som erstattes, og feilmelding ved ugyldig fil. (K20, K21)
  *Ferdig når:* tester dekker vellykket import og avvist fil uten endring i data.
- [x] **T19 Varsel og tomtilstander.** Varsel om lokal lagring med snarvei til eksport; tomtilstand med veiledning på alle sider. (K22, K23)
  *Ferdig når:* ny bruker ledes fra tom app til første registrerte risiko uten blindveier.

## Fase 9 – Kvalitetssikring

- [x] **T20 Gjennomgang.** Gå gjennom K1–K23 og alle akseptkriterier mot kjørende app. Sjekk tastaturnavigasjon, fokus i dialoger, kontrast og skjermlesernavn i matrisen. Oppdater spec-status til GODKJENT eller noter avvik.
  *Ferdig når:* hvert krav er krysset av i en sjekkliste nederst i denne filen.

## Sporbarhet

| Krav | Oppgaver |
|---|---|
| K1–K2 | T02, T09, T13 |
| K3 | T03, T13, T14 |
| K4 | T04, T14, T15 |
| K5 | T14 |
| K6–K7 | T05, T16 |
| K8–K9 | T04, T17 |
| K10 | T03 |
| K11–K14 | T02, T06, T11 |
| K15–K18 | T02, T06, T12 |
| K19 | T07 |
| K20–K21 | T08, T18 |
| K22 | T13, T19 |
| K23 | T19 |

## Sjekkliste fra gjennomgangen (T20, 2026-11-17)

Hvert krav er sjekket mot automatiske tester og i kjørende app (Chrome, utviklingsserver). Totalt 350 tester; `npm test`, `npm run lint` og `npm run build` går gjennom.

### Krav

| Krav | Oppfylt | Dekket av |
|---|---|---|
| K1 Opprette, vise, endre, slette risiko | [x] | `RisksPage.test`, `RiskTable.test`, `RiskForm.test`; prøvd i nettleser |
| K2 Felt, påkrevde felt, automatiske datoer, skalatekster per type | [x] | `schema.test`, `dataStore.test`, `RisksPage.test`, `RiskForm.test` |
| K3 Score og nivå beregnes; nivå med tekst og farge | [x] | `scoring.test`, `RiskTable.test`; nivåmerke med tekst |
| K4 Søk, filtre (type, eier, tema, område, nivå), sortering | [x] | `filters.test`, `RiskFilter.test`, `RiskTable.test` |
| K5 Sletting krever bekreftelse | [x] | `RiskTable.test` |
| K6 5 × 10-matrise, mulighet venstre 5→1, trussel høyre 1→5, merkede akser | [x] | `matrix.test`, `MatrixPage.test`; sammenlignet med referansebildet |
| K7 Antall per celle, farge per nivå, nivå også som tekst | [x] | `MatrixPage.test` (fargene i alle 50 celler), skjermlesernavn per celle |
| K8 Klikk på celle viser risikoene med lenke | [x] | `MatrixInteraction.test`; lenke åpner risikoen i registeret |
| K9 Matrisen bruker samme filtre som registeret | [x] | `MatrixInteraction.test`; filtrene følger med i menyen |
| K10 Nivåtabell felles for matrise og register, inkl. unntaket 1 × 4 | [x] | `scoring.test` (alle 25), `matrix.test`, `RiskTable.test` |
| K11 Eiere: opprette, endre, slette; e-post valgfritt | [x] | `OwnersPage.test` |
| K12 Unike navn | [x] | `rules.test`, `dataStore.test`, `OwnersPage.test` |
| K13 Eier i bruk kan ikke slettes; blokkerende risikoer vises | [x] | `dataStore.test`, `OwnersPage.test` |
| K14 Antall risikoer per eier | [x] | `OwnersPage.test` |
| K15–K16 Temaer, inkl. unikhet, slettesperre og antall | [x] | `ThemesAndAreasPages.test` |
| K17–K18 Områder, inkl. unikhet, slettesperre og antall | [x] | `ThemesAndAreasPages.test` |
| K19 Lokal lagring som overlever omstart | [x] | `localStorageRepository.test`; sideoppdatering i nettleser |
| K20 Eksport og import med validering uten overskriving | [x] | `exportImport.test`, `DataMenu.test`; prøvd i nettleser |
| K21 Import erstatter alle data etter bekreftelse | [x] | `DataMenu.test` |
| K22 Tom app med veiledning til eier, tema og område | [x] | `FirstUse.test` (hele løpet til første risiko) |
| K23 Varsel om lokal lagring med snarvei til eksport | [x] | `FirstUse.test`; vises på alle sider |

### Akseptkriterier

- [x] Gyldig skjema lagres og vises i tabellen med riktig score og nivå.
- [x] Manglende påkrevd felt gir feil ved feltet, og ingenting lagres.
- [x] Filter på eier X viser bare risikoer med eier X.
- [x] Type «mulighet» gir «Verdifull» og «Svært verdifull» for 4 og 5.
- [x] Trussel (4,5) telles i trusselhalvdelen, og cellen er rød.
- [x] Mulighet (4,5) telles lengst til venstre på rad 4, og cellen er mørk blå.
- [x] Trussel (1,4) har nivå Middels.
- [x] Tema-filter endrer antallene i matrisen.

### Universell utforming

- [x] **Automatisk sjekk:** axe-core i nettleser fant ingen brudd på noen side, med tomme og fylte data, i skjema med feilmeldinger, i alle dialoger, med valgt matrisecelle og på feilsiden. Samme sjekk (uten fargekontrast) kjører nå i `accessibility.test`.
- [x] **Tekstkontrast:** axe målte 94 tekstelementer uten brudd. Nivåfargene er testet til minst 4,5:1 i `scales.test`.
- [x] **Kontrast på kanter og fokus (1.4.11):** fokusring, feltkanter og skillelinje er minst 4,5:1. *Rettet:* valgt matrisecelle hadde 2,6:1 mot mørk blå; fikk hvit indre kant og er nå minst 5,5:1 mot alle cellefarger.
- [x] **Tastatur:** hopp-lenke, meny, filtre, sortering, tabellknapper og matriseceller kan brukes med tastatur. Bare celler med risikoer er tabulatorstopp.
- [x] **Fokus i dialoger:** fokus går til første felt eller «Avbryt» ved åpning, holdes i dialogen, Escape lukker, og fokus går tilbake til knappen som åpnet. *Rettet:* etter sletting forsvant knappen og fokus havnet på `<body>`; nå flyttes fokus til sideoverskriften.
- [x] **Skjermlesernavn i matrisen:** hver celle har fullt navn med type, sannsynlighet, konsekvens, nivå og antall. Rad- og kolonneoverskrifter leses som «5 Svært høy».

### Avvik og valg som bør bekreftes

1. **Nivånavn for muligheter** («Liten», «Middels», «Stor») er fortsatt et forslag (åpent spørsmål i spec-en). Navnene ligger i `domain/scales.ts`.
2. **Type er forhåndsvalgt som «Trussel»** i nytt risikoskjema. Spec-en sier ikke om typen skal ha standardverdi.
3. **Rødfargen** er `#d50000` i stedet for ren rød fra referansebildet, for at hvit tekst skal få nok kontrast.
4. **Søk** krever at hele søketeksten finnes sammenhengende; ord matches ikke hver for seg.
5. **Linter** er oxlint (standard i Vite-malen) i stedet for ESLint som planen nevner.
6. **npm audit** melder en sårbarhet i `picomatch`, som bare brukes av utviklingsverktøyene (Vite, Vitest), ikke i appen som kjører i nettleseren.
