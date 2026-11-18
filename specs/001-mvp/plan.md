# 001 – MVP: Teknisk plan

Status: UTKAST. Beskriver *hvordan* kravene i `spec.md` løses. K-numre viser til spec-en.

## Teknologivalg

| Område | Valg | Begrunnelse |
|---|---|---|
| Bygg | Vite + React 19 + TypeScript (strict) | Gitt av constitution. |
| Ruting | React Router (hash-ruting) | Fem sider. Hash-ruting gjør at appen kan hostes som statiske filer hvor som helst. |
| Validering | Zod | Ett skjema brukes til både skjemavalidering, lesing fra lagring og import (K20). Typene utledes fra skjemaene. |
| Tilstand | React context + `useSyncExternalStore` over repository | Lite datavolum; ikke behov for eget state-bibliotek. |
| Stil | Ren CSS med CSS-variabler (CSS Modules) | Ingen UI-bibliotek; lite grensesnitt, full kontroll på kontrast og utforming. |
| Test | Vitest + React Testing Library + jsdom | Gitt av constitution. |
| Lagring | `localStorage`, én nøkkel, versjonert JSON | Noen hundre risikoer er langt under grensen (~5 MB). Samme format som eksportfilen. |

Ingen andre kjøretidsavhengigheter enn `react`, `react-dom`, `react-router-dom` og `zod`.

## Datamodell

```ts
type Id = string;                      // crypto.randomUUID()

interface Owner { id: Id; name: string; email?: string }
interface Theme { id: Id; name: string; description?: string }
type Horizon = '0-3' | '3-5' | '5+'   // «Når?»: «0 - 3 år», «3 - 5 år», «5 år +» (K25)
interface Area  { id: Id; name: string; description?: string; horizon: Horizon }

type Rating = 1 | 2 | 3 | 4 | 5;
type RiskType = 'threat' | 'opportunity';
type Level = 1 | 2 | 3;

interface Risk {
  id: Id;
  title: string;
  description?: string;
  type: RiskType;
  ownerId: Id;
  themeId: Id;
  areaId: Id;
  likelihood: Rating;
  consequence: Rating;
  createdAt: string;                   // ISO 8601
  updatedAt: string;
}

interface AppData {
  schemaVersion: 2;                    // 2 fra K25; versjon 1 migreres ved lesing
  owners: Owner[]; themes: Theme[]; areas: Area[]; risks: Risk[];
}
```

Regler som håndheves i domenelaget, ikke i UI:
- Navn på eier/tema/område er unikt uten hensyn til store/små bokstaver og mellomrom i endene (K12, K15, K17).
- Eier/tema/område som er referert av en risiko kan ikke slettes; feilen inneholder de blokkerende risikoene (K13, K16, K18).
- `ownerId`, `themeId` og `areaId` må peke på eksisterende elementer, også ved import (K20).
- Score og nivå lagres ikke, de beregnes (K3).
- Nivå slås opp i én konstant, `LEVEL_MATRIX[likelihood][consequence]`, som gjengir tabellen i K10. Den brukes for begge typer. Skalatekster, nivånavn og farger per type ligger i `domain/scales.ts`, slik at de kan endres ett sted.

## Arkitektur

```
src/
  domain/          Rene funksjoner og typer. Ingen React, ingen lagring.
    schema.ts        Zod-skjemaer + utledede typer
    scoring.ts       score(), level(), LEVEL_MATRIX        (K3, K10)
    scales.ts        skalatekster, nivånavn og farger per type (K2, K7)
    filters.ts       filterRisks(), sortRisks()            (K4, K9)
    matrix.ts        buildMatrix(risks) -> 5×10 celler     (K6)
    rules.ts         unikhet, slettesperre                 (K12–K18)
  data/
    repository.ts    Repository-grensesnittet
    localStorageRepository.ts
    exportImport.ts  serialisering, validering             (K20, K21)
  state/
    DataProvider.tsx  context + hooks (useRisks, useOwners, …)
  ui/
    components/      Skjemafelt, tabell, dialog, filterlinje
    pages/           RisksPage, MatrixPage, OwnersPage, ThemesPage, AreasPage
  App.tsx, main.tsx
```

Avhengighetsretning: `ui → state → data → domain`. `domain` importerer ingenting fra de andre.

### Repository-grensesnitt

```ts
interface Repository {
  load(): Promise<AppData>;
  save(data: AppData): Promise<void>;
  subscribe(listener: () => void): () => void;
}
```

Grensesnittet er asynkront selv om `localStorage` er synkront, slik at en backend-implementasjon kan settes inn senere uten å endre `state` eller `ui`. `subscribe` lytter også på `storage`-hendelsen, slik at flere faner i samme nettleser holder seg synkrone.

Ugyldige eller manglende data ved `load()`: tomt datasett ved manglende nøkkel; ved ugyldig innhold beholdes rådataene urørt, og bruker får en feilside med mulighet til å laste ned rådataene eller starte tomt. Data skal aldri overskrives stille.

## Sider og ruter

| Rute | Side | Krav |
|---|---|---|
| `#/` | Risikoregister: tabell, søk, filtre, sortering, opprett/endre i dialog | K1–K5 |
| `#/matrise` | Matrise med mulighets- og trusselhalvdel, celleklikk viser liste | K6–K10 |
| `#/eiere` | Register over risikoeiere | K11–K14 |
| `#/temaer` | Register over risikotemaer | K15–K16 |
| `#/omrader` | Register over risikoområder | K17–K18 |

Felles:
- Toppmeny med de fem sidene, eksport/import-knapper og varselet om lokal lagring (K20, K23).
- Filtrene (type, eier, tema, område, nivå, søk) ligger i URL-ens søkeparametre og deles av register og matrise, så et filter følger med når man bytter side (K9), og en filtrert visning kan bokmerkes.
- De tre referanseregistrene har samme oppførsel og bygges fra én generisk komponent.
- Tomtilstand med veiledning når det ikke finnes eiere/temaer/områder (K22). Risikoskjemaet er sperret til det finnes minst én av hver, men «Ny risiko» vises alltid og åpner da en forklaring med lenker i stedet for skjemaet.

## Matrisen (K6–K8, K24)

- Utforming følger `referanse/risikomatrise.png`: 5 rader (sannsynlighet, 5 øverst) og 10 kolonner. Mulighet til venstre med konsekvens 5→1, trussel til høyre med konsekvens 1→5. Radoverskrifter og kolonneoverskrifter viser tall og skalatekst; under kolonnene står «Mulighet», «Trussel» og «Konsekvens».
- Bygges som én HTML-tabell med rad- og kolonneoverskrifter og to kolonnegrupper (`colgroup`), slik at skjermlesere får riktig kontekst. En tydelig skillelinje markerer midten.
- Hver celle er en knapp med antall og tilgjengelig navn, f.eks. «Trussel, sannsynlighet 4 Høy, konsekvens 5 Svært alvorlig, nivå Høy, 3 risikoer». Tomme celler viser ikke tall, men har fortsatt tilgjengelig navn.
- Farger: trussel grønn/gul/rød, mulighet lys blå/blå/mørk blå, tatt fra referansen og justert slik at teksten i cellen har kontrast ≥ 4,5:1 (mørk tekst på lyse celler, hvit tekst på rød og mørk blå). Nivå står også som tekst i celledetaljene og i registeret.
- På smale skjermer ruller matrisen horisontalt i sin egen beholder; siden selv ruller ikke sidelengs.
- Celleklikk åpner et panel med risikoene i cellen, lenket til registeret.
- Verktøytips (K24) ligger i hver celle og vises med CSS ved `:hover` og `:focus-within`. Det er `aria-hidden`, fordi cellens tilgjengelige navn allerede har samme innhold. Plassering: under cellen i rad 5–4, ellers over; inntil kanten i de to ytterste kolonnene på hver side, så det ikke klippes av rullebeholderen. Escape fanges på dokumentnivå (ved hover har ikke matrisen fokus) og skjuler tipsene til pekeren eller fokus går til en celle.

## Eksport og import (K20, K21)

- Eksport: `AppData` som JSON, filnavn `risikoregister-ÅÅÅÅ-MM-DD.json`.
- Import: les fil → `JSON.parse` → Zod-validering → referansesjekk → bekreftelsesdialog som viser antall elementer som erstattes → lagre. Feiler ett steg, vises feilen og ingenting endres.

## Teststrategi

- **Enhetstester (domain):** score og nivå for alle 25 kombinasjoner mot tabellen i K10 (inkludert unntaket 1×4), plassering i riktig halvdel av matrisen, filtrering, sortering, matriseoppbygging, unikhet, slettesperre, importvalidering inkludert ødelagte referanser.
- **Repository:** lagre/lese-rundtur, manglende nøkkel, ugyldig JSON, feil skjemaversjon.
- **Komponenttester:** ett scenario per akseptkriterium i spec-en (opprette risiko, valideringsfeil, filter på eier, celle (4,5), filter påvirker matrise, sletting sperret).
- Ingen ende-til-ende-tester i MVP.

## Rekkefølge

1. Prosjektoppsett (Vite, TS strict, Vitest, lint).
2. `domain` med tester.
3. `data` (repository, eksport/import) med tester.
4. `state` + app-skall med ruting og meny.
5. Referanseregistrene (eiere, temaer, områder).
6. Risikoregisteret.
7. Matrisen.
8. Eksport/import i UI, varsel, tomtilstander.
9. Gjennomgang mot akseptkriterier og universell utforming.

## Risiko ved planen

- **Tap av data:** `localStorage` slettes hvis bruker tømmer nettleserdata. Avbøtes av K23 og eksport, men ikke løst før backend.
- **Skjemaendringer:** `schemaVersion` ligger i formatet fra start, slik at senere versjoner kan migrere gamle data og gamle eksportfiler.

## Migrering (K25)

- `data/migrations.ts` løfter rådata til gjeldende versjon før validering. Den brukes av `parseAppData`, altså både ved lesing fra lagring og ved import, slik at de har samme regler.
- Versjon 1 → 2: hvert område uten `horizon` får `'0-3'` (avklart beslutning 7). Ingenting annet endres.
- Migrerte data lagres som versjon 2 først ved neste endring; frem til da ligger versjon 1 urørt i lagringen. Eksport skriver alltid gjeldende versjon.
- Versjoner nyere enn appen kjenner avvises som før.

## Referanseregistrene og ekstra felt (K25)

- Registerkomponenten tar en liste med ekstra felt i stedet for ett. Hvert felt er e-post, fritekst eller nedtrekksmeny med faste valg. Områder har beskrivelse og «Når?»; eiere og temaer er uendret.
- Nedtrekksmenyen starter på «Velg …», slik at et nytt område ikke får en verdi uten at brukeren har valgt den.
