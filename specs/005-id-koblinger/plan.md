# 005 – Koble risikoer med ID: Teknisk plan

Status: GJENNOMFØRT (2026-11-18). Beskriver *hvordan* kravene K57–K62 i `spec.md` løses. Bygger på [004-egne-id-er/plan.md](../004-egne-id-er/plan.md).

Ingen nye avhengigheter. Datamodellen og dataformatet (versjon 3) endres ikke. Risikoen lagrer fortsatt `ownerId`, `themeId` og `areaId`, altså den interne id-en. Det som endres, er hvordan brukeren angir koblingen og hvordan den står i Excel.

## Oppslag på ID (domain/rules.ts)

- **`findByCode(items, code)`:** gir elementet med ID-en, eller `undefined`. ID-ene sammenlignes med `normalizeName`, som i K48. Elementer uten ID blir aldri funnet.
- **Én felles oppslagsfunksjon:** Den samme funksjonen brukes av skjemaet (K57) og av Excel-importen (K60), så reglene er like begge steder.

## Risikoskjemaet (K57–K59)

### Ny komponent: `CodeCombobox`

Et tekstfelt med forslagsliste, bygget etter mønsteret «Combobox with listbox popup» i WAI-ARIA Authoring Practices. Det lages selv, uten bibliotek.

- **Hvorfor ikke `<datalist>`:** Nettlesere filtrerer forslagene ulikt. Noen søker bare i verdien, ikke i navnet, og det bryter med K58. Forslagene kan heller ikke stiles eller testes i jsdom.
- **Roller og egenskaper:** `<input role="combobox" aria-autocomplete="list" aria-expanded aria-controls aria-activedescendant>` og `<ul role="listbox">` med `role="option"`.
- **Tastatur:**
  - Pil ned og pil opp åpner listen og flytter markeringen.
  - Enter velger forslaget.
  - Escape lukker listen.
  - Tab går videre uten å velge.
- **Mus:** Klikk på et forslag velger det.
- **Filtrering:** Et forslag vises når ID eller navn inneholder det som er skrevet, uten hensyn til store og små bokstaver. Forslagene er sortert etter ID med tall i riktig rekkefølge, og det vises høyst 8. Elementer uten ID vises ikke, siden de ikke kan velges med ID.
- **Navnet ved feltet:**
  - Under feltet står navnet på elementet som passer, i en egen linje koblet med `aria-describedby`. For eksempel «Kari Nordmann».
  - Passer ingenting, står det ingenting der før man lagrer. Da kommer feilen.
  - Linjen er ikke en `aria-live`-region, så skjermlesere ikke snakker ved hvert tastetrykk. Navnet leses opp sammen med feltet.

### Tilstand i `RiskForm`

Hvert av de tre feltene har tilstanden `{ text: string; edited: boolean }`.

- **Når skjemaet åpnes:**
  - Har elementet ID, står ID-en i feltet.
  - Mangler elementet ID (K59), står for eksempel «Ola (mangler ID)» i feltet med `edited: false`.
  - For en ny risiko er feltet tomt.
- **Ved lagring** gjøres hvert felt om til intern id før `store.createRisk` eller `store.updateRisk` kalles:
  - Feltet er ikke endret og elementet mangler ID: den eksisterende id-en beholdes.
  - Feltet er tomt: feltfeil «Risikoeier er påkrevd», «Tema er påkrevd» eller «Område er påkrevd».
  - ID-en finnes ikke: feltfeil «Ingen risikoeier har ID «E-9».», og tilsvarende for tema og område.
  - Ellers sendes id-en til elementet som ble funnet.
- **Feil:** Feltfeilene bruker de samme nøklene som i dag (`ownerId`, `themeId`, `areaId`). Dermed virker `useFormErrors`, inkludert fokus til første feil, uendret. `DataStore` kontrollerer fortsatt at id-en finnes.

### Elementer uten ID

En ny risiko kan bare kobles til eiere, temaer og områder som har ID. Har ingen eier ID ennå, for eksempel rett etter oppdateringen, kan man ikke opprette risikoer før minst én eier har fått ID. Varselet fra K54 viser hva som mangler. Veiledningen for nye brukere (K22) er uendret, siden nye elementer alltid får ID.

## Excel (K60–K62)

### Formatet (`excelFormat.ts`)

- **Kolonnene i Risikoer:** `owner`, `theme` og `area` får overskriftene «Eier-ID», «Tema-ID» og «Område-ID». Nøklene beholdes, men verdiene er nå ID-er.
- **`RISK_INFO_COLUMNS`:** blir Score, Nivå, Eier, Tema, Område. De tre siste har nøklene `ownerName`, `themeName` og `areaName`.
- **Eldre filer:** De har «Eier» og ikke «Eier-ID». De avvises derfor av sjekken for manglende påkrevd kolonne som allerede finnes, med «Kolonnen «Eier-ID» mangler». Kolonnen «Eier» i en slik fil er en ukjent kolonne for importen og blir ignorert, slik informasjonskolonnene skal.

### Import (`parseWorkbook.ts`)

- **Oppslag:** Eier, tema og område slås opp på **ID** med `findByCode`, ikke på navn.
- **Feilmelding:** «Ingen eier har ID «E-9» i fanen «Eiere»», med fane, rad og kolonne («Eier-ID»).
- **Følgefeil:** Logikken som hindrer følgefeil, bruker ID-ene til radene som ble avvist, i stedet for navnene. `rejected.names` blir `rejected.codes`.

### Eksport (`toWorkbookRows.ts`, `writeXlsx.ts`)

- **ID-kolonnene:** Eier-ID, Tema-ID og Område-ID får ID-en til elementet. Mangler elementet ID, blir cellen tom. Advarselen i eksportdialogen (K54) dekker allerede det tilfellet.
- **Informasjonskolonnene:** Eier, Tema og Område får navnene.
- **Veiledningen:** Regelen «Eier, Tema og Område i fanen Risikoer må være navn …» endres til ID. Den får også en linje om at kolonnene Eier, Tema og Område bakerst bare er til informasjon.
- **Eksempelfilen** lages på nytt.

## Teststrategi

- **domain:** `findByCode`. ID-er sammenlignes uten hensyn til store og små bokstaver og mellomrom. Elementer uten ID blir ikke funnet.
- **`CodeCombobox` (komponenttester):**
  - filtrering på ID og navn
  - tastatur: piler, Enter, Escape og Tab
  - klikk på forslag
  - ARIA-attributter: `aria-expanded`, `aria-activedescendant`, `aria-selected`
  - at navnet står i beskrivelsen
  - axe, med listen både lukket og åpen
- **`RiskForm`:** ett scenario per akseptkriterium i K57–K59. Det gjelder også «Ola (mangler ID)» som beholdes, og ny eier-ID som vises i skjemaet.
- **Excel:**
  - de nye kolonnene og informasjonskolonnene
  - ukjent ID gir feil
  - gammel fil gir «Kolonnen «Eier-ID» mangler»
  - rundtur med uendrede koblinger
  - en utfylt mal kan importeres
- **Eksisterende tester:** Mange tester velger eier, tema og område i nedtrekkslister med `selectOptions`. De får en hjelper som skriver ID. Testdata som brukes til å opprette risikoer, må ha ID på eiere, temaer og områder. Excel-testene får nye overskrifter og ID-er i Risikoer.
- **Manuelt:**
  - Skjemaet prøves med tastatur og i nettleseren.
  - Eksempelfilen åpnes i Excel.

## Rekkefølge

1. `findByCode` i domenelaget.
2. `CodeCombobox` med tester og tilgjengelighet.
3. `RiskForm` tar i bruk ID-feltene. Elementer uten ID beholder koblingen. De eksisterende testene tilpasses.
4. Excel-formatet, importen og eksporten med de nye kolonnene og veiledningen. Excel-testene tilpasses.
5. Ny eksempelfil.
6. Gjennomgang mot akseptkriteriene, tastatur, skjermleser og Excel.

## Risiko ved planen

- **Egen combobox:** Den er mer kode å eie enn en `<datalist>`. Den følger et kjent mønster og får egne tester for tastatur og ARIA. Den bør også prøves med en ekte skjermleser, NVDA eller Skjermleser i Windows.
- **Brukere med gamle data:** De kan ikke opprette risikoer før eierne, temaene og områdene har fått ID. Varselet fra K54 viser vei. Dette bør nevnes for teamet ved publisering.
- **Mange tester endres:** Det gjelder både skjemaet og Excel. Endringene er mekaniske og samles i hjelpere, som i spec 004.
