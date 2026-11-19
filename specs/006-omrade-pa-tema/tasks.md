# 006 – Område på tema: Oppgaver

Gjøres i rekkefølge, én om gangen. Hver oppgave er ferdig når «Ferdig når» er oppfylt og `npm test`, `npm run lint` og `npm run build` går gjennom. Kryss av når den er ferdig. Nummereringen fortsetter etter T53.

## Fase 1 – Data og regler

- [x] **T54 Skjema, migrering og regler.**
  - `areaId` legges til på tema. Det er påkrevd i `themeInputSchema` og valgfritt i lagrede data.
  - `SCHEMA_VERSION` blir 4, med migreringen `from3to4`.
  - `findIntegrityErrors` melder et tema som viser til et område som ikke finnes.
  - `themesReferencing` lages.
  - DataStore: tema med et område som ikke finnes, avvises. Sletting av et område sperres av temaer, og `DataError` får `blockingThemes`.
  - Hjelperne i testene som oppretter temaer, fyller inn område.

  (K63, K64, K67, K68)
  *Ferdig når:* tester dekker:
  - at område er påkrevd i inndata og valgfritt i lagret data
  - at versjon 3 leses uten feil og blir versjon 4, og at versjon 5 avvises
  - integritetsfeilen
  - sletting sperret av temaer, og av temaer og risikoer sammen, med riktig melding

  *Resultat (2026-11-18):*
  - **Skjema:** `areaId` er lagt til på tema. `SCHEMA_VERSION` er 4, og `from3to4` løfter bare versjonen.
  - **Regler:** `themesReferencing` er lagt til, og `findIntegrityErrors` melder «Temaet «X» viser til område som ikke finnes.»
  - **DataStore:**
    - Et tema med et ukjent område gir feltfeilen «Området finnes ikke lenger.» på `areaId`.
    - Sletting av et område sperres også av temaer. `DataError.blockingThemes` er lagt til, og meldingen er for eksempel ««IT» kan ikke slettes fordi 1 risiko og 1 tema bruker den.»
  - **Avvik, som i T35:** `areaId` er foreløpig **valgfritt også i inndata**. Ellers kunne ingen temaer lagres før feltet finnes i skjemaet. Det blir påkrevd i T56, sammen med feltet. Derfor trengte ikke hjelperne i testene å fylle inn område ennå.
  - **Mellomtilstand frem til T56:** Registeret sjekker bare risikoer før sletting. Sperres slettingen av temaer, viser det den generelle feilen. I praksis skjer det ikke, siden ingen temaer kan få område før T56.
  - **Tester:** 12 nye: 3 for migrering, 2 for skjema, 2 for regler og 5 for DataStore. Testdataene er løftet til versjon 4, og tester for ukjent versjon bruker nå 5.

## Fase 2 – Felles hjelper

- [x] **T55 Felles hjelper for ID-koblinger.**
  - Flytt `initialText` og `resolveReference` fra `RiskForm` til `ui/codeReference.ts`.
  - Gjør dem generelle, slik at de tar liste, ledetekst og substantiv.
  - Ta dem i bruk i `RiskForm`.

  (K57, K59, K63, K65)
  *Ferdig når:* alle eksisterende tester for `RiskForm` går gjennom uendret. Hjelperen skal også ha egne enhetstester for ID, «mangler ID», tom tekst og ukjent ID.

  *Resultat (2026-11-18):*
  - **Ny modul:** `ui/codeReference.ts` med `initialReferenceText(items, linkedId)`, `resolveReferenceText(items, value, linkedId, { label, noun })`, `showsMissingCode(value)` og `MISSING_CODE_SUFFIX`.
  - **Risikoskjemaet:** `RiskForm` bruker hjelperen, og den lokale logikken er fjernet.
  - **Ingen endret oppførsel:** De 40 testene for `RiskForm`, `RisksPage` og `FirstUse` gikk gjennom uendret.
  - **Tester:** 8 nye enhetstester i `codeReference.test`.

## Fase 3 – Temaregisteret

- [x] **T56 Område på tema i registeret.** `areaId` blir påkrevd i `themeInputSchema` (se avviket i T54).
  - `ReferenceRegister` får felttypen `reference`, med `CodeCombobox`, navnet ved feltet og `selectOnFocus`.
  - Tabellen får kolonnene «Område-ID» og «Område», med «Mangler område» og «Mangler ID».
  - Sperredialogen lister også temaer.
  - `ThemesPage` får feltet først.

  (K63–K68)
  *Ferdig når:* tester dekker akseptkriteriene:
  - «o-01» viser «IT» og lagres
  - et nytt tema uten område gir «Område er påkrevd»
  - «O-9» gir feil
  - et gammelt tema viser «Mangler område» og må få område når det endres
  - koblingen til «IT» uten ID beholdes
  - ny område-ID vises i listen
  - sletting av «IT» sperres og viser «Leverandør»

  I tillegg skal axe ikke finne brudd i skjemaet og listen, og det skal være sjekket i nettleseren.

  *Resultat (2026-11-18):*
  - **Skjema:** `areaId` er påkrevd i `themeInputSchema` og valgfritt i `themeSchema`, altså i lagrede data.
  - **Registeret:**
    - `ReferenceRegister` har felttypen `LinkField` (`input: 'reference'`), med `CodeCombobox`, `selectOnFocus` og den felles hjelperen fra T55.
    - Feltet gir to kolonner med `CodeText` og «Mangler område».
    - Sperredialogen viser risikoer og temaer under hver sin overskrift. Teksten er for eksempel ««IT» er i bruk av 1 risiko og 2 temaer.» eller ««Økonomi» er i bruk av dette temaet.»
  - **Tillegg (K71, lagt inn i spec 006 og ved K22 i 001):** Veiledningen for nye brukere ber nå om område før tema. Det er nødvendig, fordi et nytt tema må ha et område. Dette gjelder `setupSteps` og listen i «Kom i gang».
  - **Midlertidig avvik:** Excel-importen leser temaer uten område frem til T57. Unntaket er merket MIDLERTIDIG i `parseWorkbook`.
  - **Eksisterende tester:** Testene for temaer og områder, førstegangsflyten (ny rekkefølge), veiledningen og DataStore er tilpasset.
  - **Tester:** 9 nye. 8 i `ThemesAndAreasPages.test`, som dekker alle akseptkriteriene for T56, og 1 axe-test av temaskjemaet med feil.
  - **Sjekket i nettleseren** med data i versjon 3:
    - Med tastaturet ga «øko», pil ned og Enter Økonomi, og Enter lagret.
    - Listen viste «O-02 | Økonomi», og et tema uten område viste «Mangler område».
    - Dataene ble lagret som versjon 4.
    - Sletting av Økonomi ble sperret med temaet i listen.
    - Ingen feil i konsollen.

## Fase 4 – Excel

- [x] **T57 Område-ID i fanen Temaer.**
  - `THEME_SHEET` får «Område-ID», og informasjonskolonnene gjøres generelle per fane, med «Område» for Temaer.
  - `parseWorkbook` bygger områdene før temaene, slår opp med `findByCode` og unngår følgefeil.
  - `toWorkbookRows` skriver ID og navn.
  - Veiledningen oppdateres, og Excel-testene tilpasses.

  (K69, K70)
  *Ferdig når:* tester dekker akseptkriteriene «O-9 i Temaer gir feil», «fil uten Område-ID avvises» og «rundturen beholder koblingene». I tillegg skal informasjonskolonnen «Område» ignoreres ved import, og en utfylt mal skal kunne importeres.

  *Resultat (2026-11-18):*
  - **Formatet:** `THEME_SHEET` har «Område-ID» etter Navn. `THEME_INFO_COLUMNS` har «Område», og `INFO_COLUMNS` gir informasjonskolonnene per fane, slik at `writeXlsx` ikke trenger særregler.
  - **Import:**
    - Områdene bygges før temaene, og `findByCode` kobler temaet til området.
    - Feilmeldingen er «Ingen område har ID «O-9» i fanen «Områder»».
    - Følgefeil unngås med `rejected.areas`.
    - Et tema med ukjent område tas likevel med, så risikoer ikke får følgefeil. Importen feiler uansett.
    - Unntaket fra T56 er fjernet.
  - **Eksport:** `toWorkbookRows` skriver områdets ID i Område-ID og navnet bakerst. Cellen er tom når temaet mangler område, eller når området mangler ID.
  - **Veiledningen:** har fått en linje om Område-ID i Temaer, og linjen om informasjonskolonner nevner Område i Temaer.
  - **Tester:**
    - `withCodes` i `parseWorkbook.test` gir Temaer en Område-ID automatisk, eller bytter navn ut med ID.
    - Testdata i de andre Excel-testene har fått område på temaene.
    - Rundturtestene sammenligner temaets område på navn.
    - 6 nye tester: kobling, O-9, manglende kolonne, tom celle, informasjonskolonnen ignoreres og ingen følgefeil.
- [x] **T58 Ny eksempelfil.** Lag `eksempler/risikoregister-eksempel.xlsx` på nytt, med et område på hvert tema. (K69, K70)
  *Ferdig når:* filen kan importeres uten feil, temaene har riktige områder, og Excel åpner den uten reparasjon.

  *Resultat (2026-11-19):*
  - **Filen:** laget på nytt med appens egen eksport og de samme dataene som i T52. Spec 007 er tatt med, så Områder har bare ID, Navn og Beskrivelse.
  - **Områder på temaene:**
    - T-01 Informasjonssikkerhet → O-01 IT og digitalisering
    - T-02 Leverandør → O-02 Økonomi og innkjøp
    - T-03 Økonomi → O-02 Økonomi og innkjøp
    - T-04 Kompetanse og bemanning → O-03 HR
    - T-05 Omdømme → O-04 Kommunikasjon
  - **Fanen Temaer:** rad 1 er «ID | Navn | Område-ID | Beskrivelse | Område». Veiledningen sier at Område-ID må finnes i Områder, og at Område bakerst bare er til informasjon.
  - **Import:** Filen ble importert gjennom menyen Importer i nettleseren uten feil. Alle temaene fikk riktig område, og R-007 er fortsatt koblet til E-04, T-02 og O-01.
  - **Excel:** Excel 16 åpner filen uten reparasjon, og alle fire datafanene er tabeller. I en kopi ble T-04 flyttet til O-05 i Excel. Kopien ble lagret og importert på nytt med appens import, og T-04 fikk O-05.
  - **Slik ble filen laget:** Eksportkoden ble kjørt i Node, siden en nedlasting fra nettleservinduet ikke kan lagres rett i prosjektet. Den ga samme filstørrelse som eksporten i nettleseren. To eksporter skiller seg bare i tidspunktet i filens metadata.

## Fase 5 – Kvalitetssikring

- [x] **T59 Gjennomgang.**
  - Sjekk hvert krav K63–K70 og hvert akseptkriterium mot tester og kjørende app, også med data i versjon 3 uten område på temaene.
  - Prøv temaskjemaet bare med tastatur.
  - Åpne eksempelfilen i Excel.
  - Oppdater statusen i spec og plan, og legg sjekklisten nederst i denne filen.

  (K63–K70)
  *Ferdig når:* alle krav og akseptkriterier er krysset av med henvisning, og avvik er listet.

  *Resultat (2026-11-19):* Se sjekklisten nederst. K71, som kom til under T56, er også sjekket.

## Sporbarhet

| Krav | Oppgaver |
|---|---|
| K63 Område på tema, angitt med ID, med navnet ved feltet; påkrevd | T54, T55, T56 |
| K64 Gamle temaer godtas uten område til de endres | T54, T56 |
| K65 Kobling til område uten ID beholdes | T55, T56 |
| K66 Kolonnene Område-ID og Område i temalisten | T56 |
| K67 Koblingen tåler at områdets ID eller navn endres | T54, T56 |
| K68 Sletting av område sperres av temaer | T54, T56 |
| K69 Område-ID i Excel-fanen Temaer | T57, T58 |
| K70 Område som informasjonskolonne; mal og veiledning | T57, T58 |
| K71 Område før tema i veiledningen for nye brukere | T56 |

## Sjekkliste fra gjennomgangen (T59, 2026-11-19)

Hvert krav er sjekket mot automatiske tester og i kjørende app. Appen ble åpnet med data i versjon 3, der temaene ikke har område og ett område mangler ID. Temaskjemaet er prøvd bare med tastatur. Eksempelfilen er åpnet i Excel 16 (T58). Det er 622 tester i alt, og `npm test`, `npm run lint` og `npm run build` går gjennom.

### Krav

| Krav | Oppfylt | Dekket av |
|---|---|---|
| K63 Område på tema med ID-felt og forslagsliste; påkrevd | [x] | `schema.test`, `dataStore.test`, `ThemesAndAreasPages.test`, `accessibility.test`; prøvd med tastatur |
| K64 Gamle temaer godtas uten område til de endres | [x] | `migrations.test` (versjon 3 → 4), `schema.test`, `ThemesAndAreasPages.test`; prøvd med data i versjon 3 |
| K65 Kobling til område uten ID beholdes | [x] | `codeReference.test`, `ThemesAndAreasPages.test`; prøvd i nettleser |
| K66 Kolonnene Område-ID og Område, med «Mangler område» og «Mangler ID» | [x] | `ThemesAndAreasPages.test`; sett i nettleser |
| K67 Koblingen tåler ny ID eller nytt navn på området | [x] | `ThemesAndAreasPages.test`, `dataStore.test`; prøvd i nettleser (O-01 → O-1) |
| K68 Sletting av område sperres av temaer | [x] | `rules.test` (`themesReferencing`), `dataStore.test`, `ThemesAndAreasPages.test`; prøvd i nettleser |
| K69 Område-ID i Excel-fanen Temaer, slått opp på ID | [x] | `excelFormat.test`, `parseWorkbook.test`; eksempelfilen importert i nettleser |
| K70 Område som informasjonskolonne; mal og veiledning | [x] | `toWorkbookRows.test`, `writeXlsx.test`, `parseWorkbook.test`; sett i Excel |
| K71 Område før tema i «Kom i gang» og «Neste steg» | [x] | `FirstUse.test`; sett i nettleser |

### Akseptkriterier

| Akseptkriterium | Oppfylt | Dekket av |
|---|---|---|
| «o-01» i Område viser «IT», og listen viser «O-01» og «IT» | [x] | `ThemesAndAreasPages.test`; nettleser |
| Nytt tema uten område gir «Område er påkrevd», og ingenting lagres | [x] | `ThemesAndAreasPages.test`; nettleser |
| «O-9» gir «Ingen område har ID «O-9».», og ingenting lagres | [x] | `ThemesAndAreasPages.test` |
| Tema fra før viser «Mangler område» og må få område når det endres | [x] | `ThemesAndAreasPages.test`; nettleser |
| Koblingen til «IT» uten ID beholdes når feltet ikke røres | [x] | `ThemesAndAreasPages.test`; nettleser |
| Ny område-ID «O-1» vises i temalisten | [x] | `ThemesAndAreasPages.test`; nettleser |
| Sletting av «IT» sperres, og «Leverandør» står i listen | [x] | `ThemesAndAreasPages.test`, `dataStore.test`; nettleser |
| «Neste steg» peker til Risikoområder etter første eier, og så til Risikotemaer | [x] | `FirstUse.test`; nettleser |
| Excel med Område-ID «O-9» gir feil med fane, rad og kolonne | [x] | `parseWorkbook.test` |
| Excel uten kolonnen «Område-ID» gir «Kolonnen «Område-ID» mangler» | [x] | `parseWorkbook.test` |
| Eksporten har Område-ID og Område bakerst, og rundturen beholder koblingene | [x] | `toWorkbookRows.test`, `writeXlsx.test`; eksempelfilen redigert i Excel og importert (T58) |

### Gjennomgang i nettleseren

Appen ble åpnet med data i versjon 3: to temaer uten område, og områdene «O-01 IT» og «Økonomi» uten ID.
- **Listen:** Begge temaene viste «Mangler område» i begge kolonnene.
- **Bare tastatur:**
  - Endre-knappen ble åpnet med Enter, og fokus havnet i ID.
  - Enter uten område ga «Område er påkrevd», og fokus flyttet seg til Område. Ingenting ble lagret.
  - «it» ga forslaget «O-01 – IT». Pil ned og Enter valgte det uten å lagre, og «IT» ble vist ved feltet.
  - Neste Enter lagret. Fokus gikk tilbake til Endre-knappen, og dataene ble lagret i versjon 5.
- **K65:** Et tema koblet til «Økonomi» uten ID viste «Mangler ID | Økonomi» i listen og «Økonomi (mangler ID)» i feltet. Etter at bare beskrivelsen ble endret og lagret, var koblingen beholdt.
- **Sletting:** Sletting av IT ble sperret med «IT» er i bruk av 1 risiko og 1 tema., med risikoen og temaet under hver sin overskrift.
- **Ny ID:** Etter at IT fikk ID O-1, viste temalisten «O-1 | IT».
- **K71:** En tom app viser «Kom i gang» i rekkefølgen eier, område, tema.
- Ingen feil i konsollen. Testdataene er fjernet etterpå.

### Avvik og merknader

- **Midlertidige avvik er ryddet:** `areaId` var valgfritt i inndata fra T54 til T56, og Excel-importen hadde et unntak fra T56 til T57. Begge er fjernet.
- **K71 er lagt til underveis** (T56). Krav om område på temaet gjør at område må opprettes før tema.
- **Kjent begrensning (spec):** Temaer uten område får tom Område-ID i Excel-eksporten, og filen kan ikke importeres før cellen er fylt ut. Eksporten advarer ikke om det (beslutning 4).
- **Spec 007 er gjort før T58,** så eksempelfilen er i det endelige formatet, uten «Når?».
- **Før publisering:** Gamle Excel-filer uten Område-ID i Temaer kan ikke importeres. Man må eksportere på nytt fra appen. Temaer fra før beholdes uten område til de endres.
