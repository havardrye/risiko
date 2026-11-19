# 006 – Område på tema: Teknisk plan

Status: GJENNOMFØRT (2026-11-19), men tatt bort igjen av [008-fjern-omrade-pa-tema](../008-fjern-omrade-pa-tema/plan.md). Beskriver *hvordan* kravene K63–K70 i `spec.md` løses. Bygger på [004-egne-id-er/plan.md](../004-egne-id-er/plan.md) og [005-id-koblinger/plan.md](../005-id-koblinger/plan.md).

Ingen nye avhengigheter.

## Datamodell

```ts
interface Theme { id: Id; code?: string; name: string; description?: string; areaId?: Id }

interface AppData { schemaVersion: 4; /* … */ }
```

- **Lagring av koblingen (K67):** Temaet lagrer områdets *interne* id (`areaId`), på samme måte som en risiko gjør. Koblingen holder derfor selv om områdets ID eller navn endres.
- **Gamle temaer (K64):** I lagrede data er `areaId` valgfri, siden temaer fra før endringen mangler område.
- **Nye og endrede temaer (K63):** I `themeInputSchema` er `areaId` påkrevd, med meldingen «Område er påkrevd».
- **Skjemaversjon 4:** Migreringen fra versjon 3 til 4 endrer ingen data. Begrunnelsen er den samme som for versjon 3 i spec 004. En eldre versjon av appen som er åpen i en annen fane, ville fjernet `areaId` uten å si fra. Med versjon 4 avviser den dataene i stedet.

## Regler og DataStore

- **`findIntegrityErrors`:** melder et tema som viser til et område som ikke finnes. Det gjelder JSON-import og lesing fra lagring.
- **`themesReferencing(themes, areaId)`:** gir temaene som bruker et område. Den er laget på samme måte som `risksReferencing`.
- **`validateReference('theme')`:** kontrollerer at `areaId` peker på et område som finnes. Gjør det ikke det, kommer feltfeilen «Området finnes ikke lenger.»
- **`deleteReference('area')` (K68):** sperrer også når temaer bruker området.
  - `DataError` får `blockingThemes` ved siden av `blockingRisks`.
  - Meldingen nevner begge, for eksempel «IT kan ikke slettes fordi 2 risikoer og 1 tema bruker det.»

## Felles hjelper for ID-koblinger

Logikken i `RiskForm` for å vise, gjenkjenne og gjøre om ID-er skal brukes både der og i temaskjemaet. Den flyttes derfor til en egen modul, `ui/codeReference.ts`:

- `initialReferenceText(items, linkedId)`: gir ID-en, «Navn (mangler ID)» eller tom tekst.
- `resolveReferenceText(items, value, linkedId, { label, noun })`: gir intern id eller en feilmelding.

`RiskForm` tar i bruk hjelperen uten å endre oppførsel. De eksisterende testene viser at ingenting har endret seg.

## Temaregisteret (`ReferenceRegister`)

- **Ny felttype:** `ExtraField` får `input: 'reference'` med `{ references: 'areas', label: 'Område', noun: 'område' }`.
- **Skjemaet:** Feltet tegnes som `CodeCombobox` med `selectOnFocus` for «(mangler ID)», som i T50.
  - Ved lagring gjøres teksten om til `areaId` med den felles hjelperen.
  - Feilene vises ved feltet, og fokus går til første feil.
- **Tabellen (K66):** Et referansefelt gir to kolonner, «Område-ID» og «Område».
  - Mangler området ID, viser Område-ID-kolonnen `CodeText` med «Mangler ID».
  - Mangler temaet område, står «Mangler område» i dempet tekst i begge kolonnene.
- **Sperredialogen (K68):** Den lister både risikoer og temaer som hindrer slettingen, under hver sin overskrift.
- **`ThemesPage`:** får område-feltet først i `fields`, før Beskrivelse.

## Excel (K69, K70)

- **Formatet (`excelFormat.ts`):** `THEME_SHEET` får kolonnen `{ key: 'area', header: 'Område-ID', required: true, width: 12 }` etter Navn. Kolonnene med informasjon gjøres generelle per fane, slik at Temaer får informasjonskolonnen «Område» (`areaName`).
- **Import (`parseWorkbook`):**
  - Temarader leses med et radskjema som har `area` (tekst) i stedet for `areaId`.
  - Områdene bygges *før* temaene, slik at temaene kan slå opp `area` med `findByCode`.
  - Feilmeldingen er «Ingen område har ID «O-9» i fanen «Områder»» i kolonnen «Område-ID».
  - Følgefeil unngås med `rejected.areas.codes`, som for risikoer.
- **Eksport (`toWorkbookRows`):** skriver områdets ID, eller tom celle hvis området mangler, og «Område» med navnet.
- **Veiledningen:** får en linje om Område-ID i Temaer.
- **Eksempelfilen** lages på nytt med et område på hvert tema.

## Teststrategi

- **domain og data:**
  - skjema: `areaId` påkrevd i inndata, valgfri i lagret data
  - migrering fra versjon 3 til 4, og at versjon 5 avvises
  - integritetsfeil for et område som ikke finnes
  - `themesReferencing`
- **state:**
  - tema med område som ikke finnes, avvises
  - sletting av område sperres av temaer, og av temaer og risikoer sammen
- **ui:**
  - `RiskForm` uendret etter flyttingen til den felles hjelperen
  - temaskjemaet: «o-01» viser «IT», feltet er påkrevd, ukjent ID gir feil, og et gammelt tema uten område må få område
  - koblingen til et område uten ID beholdes
  - kolonnene i listen, også «Mangler område»
  - ny område-ID vises i listen
  - sperredialogen med temaer
  - axe
- **Excel:**
  - Område-ID ved import: ukjent ID, manglende kolonne og ingen følgefeil
  - eksporten med informasjonskolonnen
  - rundturen
  - malen
  - eksempelfilen åpnet i Excel
- **Eksisterende tester:** Hjelperne som oppretter temaer, fyller inn område. Testdata trenger ikke `areaId`, fordi feltet er valgfritt i lagret data. Excel-testene får kolonnen Område-ID i Temaer.

## Rekkefølge

1. Skjema og migrering til versjon 4, regler og DataStore (validering og slettesperre).
2. Den felles hjelperen for ID-koblinger, flyttet fra `RiskForm` uten endret oppførsel.
3. Temaregisteret: feltet, kolonnene og sperredialogen.
4. Excel: format, import og eksport.
5. Ny eksempelfil.
6. Gjennomgang.

## Risiko ved planen

- **Rekkefølgen i Excel-importen:** Områdene må bygges før temaene. Det endrer en del av `parseWorkbook` som har mange tester. Testene skal fange feil.
- **Generelle informasjonskolonner:** De berører både `writeXlsx` og `toWorkbookRows`. Endringen dekkes av testene for eksport og rundtur.
- **Uten varsel (beslutning 4):** En Excel-eksport med temaer uten område kan ikke importeres igjen. Det er en kjent begrensning i spec-en.
