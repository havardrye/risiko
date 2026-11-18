# 002 – Import og eksport med Excel: Teknisk plan

Status: GJENNOMFØRT (2026-11-18). Beskriver *hvordan* kravene K26–K35 i `spec.md` løses. Bygger på arkitekturen i [001-mvp/plan.md](../001-mvp/plan.md).

## Teknologivalg

| Område | Valg | Begrunnelse |
|---|---|---|
| Lese og skrive `.xlsx` | **ExcelJS** (`exceljs`), lastet først når den trengs (`import()`) | Kan både lese og skrive, og kan skrive Excel-tabeller, nedtrekkslister (datavalidering), kolonnebredder og en fryst overskriftsrad. Det trengs for malen og eksporten (K33, K35). Kjører i nettleseren, så ingen data sendes ut (K27). |

Vurderte alternativer:
- **SheetJS (`xlsx`)**: Versjonen på npm (0.18.5) er gammel og har kjente sårbarheter. Nyere versjoner distribueres bare fra SheetJS sin egen server. Gratisversjonen skriver ikke nedtrekkslister.
- **`read-excel-file` + `write-excel-file`**: Små og aktivt vedlikeholdt, men to biblioteker, og de har ikke nedtrekkslister.
- **Skrive formatet selv** (zip + XML): Ingen avhengighet, men mye kode å eie for et filformat med mange varianter.

ExcelJS er stor (rundt 250 kB gzip). Den lastes derfor som en egen del først når bruker importerer eller eksporterer Excel, så oppstarten av appen blir ikke tregere. Bare to filer bruker ExcelJS (se Arkitektur), slik at biblioteket kan byttes uten å røre resten.

Dette er den første kjøretidsavhengigheten utover de fire i 001. Før den tas i bruk (T01 under) kontrolleres `npm audit` og størrelsen på bygget. Viser det alvorlige sårbarheter som rammer nettleserbruk, går vi tilbake hit før vi fortsetter.

## Arkitektur

```
src/
  domain/
    excelFormat.ts       Faner, kolonner og verditekster. Felles for import, eksport og mal.
  data/excel/
    workbookRows.ts      Typen WorkbookRows: rene rader fra filen, uten ExcelJS-typer
    parseWorkbook.ts     WorkbookRows → AppData eller feilliste   (K26, K28–K30)
    toWorkbookRows.ts    AppData → WorkbookRows                    (K35)
    readXlsx.ts          ArrayBuffer → WorkbookRows   (ExcelJS)    (K26, K27)
    writeXlsx.ts         AppData → Blob via toWorkbookRows (ExcelJS) (K33, K35)
    loadExcelJs.ts       lat lasting av ExcelJS (egen fil, så readXlsx/writeXlsx ikke importerer index.ts i ring)
    index.ts             importExcel(), exportExcel(), excelTemplate()
  ui/
    components/DataMenu.tsx   utvides: Excel i import og eksport
```

Avhengighetsretningen er som før: `ui → state → data → domain`. Kjernen i oppgaven, `parseWorkbook`, er en ren funksjon og testes uten ExcelJS og uten filer. Bare `readXlsx` og `writeXlsx` vet om ExcelJS.

```ts
interface SheetRows {
  /** Overskriftene på rad 1, slik de står i filen. */
  headers: string[]
  /** Datarader med Excel-radnummeret (2, 3, …) og cellene som tekst eller tall. */
  rows: { rowNumber: number; cells: (string | number | null)[] }[]
}
type WorkbookRows = Record<string, SheetRows>   // nøkkel: fanenavnet i filen

type ExcelImportResult =
  | { ok: true; data: AppData }
  | { ok: false; errors: CellError[] }

interface CellError { sheet: string; row?: number; column?: string; message: string }
```

## Formatet: `domain/excelFormat.ts`

Én tabell beskriver alle fire faner: fanenavn, kolonneoverskrift, feltet i `AppData`, om kolonnen er påkrevd, og hvordan verdien tolkes og skrives. Import, eksport, mal og veiledningsfanen leser fra den samme tabellen, så de kan ikke komme i utakt.

- Visningstekstene for Type og «Når?» hentes fra `domain/scales.ts` («Trussel»/«Mulighet», `HORIZON_LABELS`).
- Fane- og kolonnenavn sammenlignes etter at teksten er trimmet og gjort om til små bokstaver (K26). «e-post » blir da «E-post».

## Import: les → tolk → kontroller → bekreft (K26–K32)

1. **Les filen** (`readXlsx`).
   - Filer over 5 MB avvises før de leses.
   - Hver celle blir tekst, tall eller tom:
     - *Rik tekst:* tekstbitene settes sammen.
     - *Lenke:* lenketeksten brukes. E-postadresser blir ofte automatisk til lenker i Excel.
     - *Formel:* det beregnede resultatet brukes. Formler kjøres aldri.
     - *Dato:* gir feil i felt som ikke er dato.
     - *Formelfeil* (f.eks. `#REF!`): gir egen feil.
   - Alle rader blir med, både rader i Excel-tabeller og vanlige celleområder, slik at det fungerer uansett hvordan brukeren har laget arket.
2. **Finn fanene og kolonnene** (`parseWorkbook`).
   - Mangler en fane, gir det feilen «Fanen «Risikoer» mangler».
   - Mangler en påkrevd kolonne, gir det feil med fane og kolonne.
   - Ukjente faner og kolonner ignoreres (K30).
3. **Tolk hver rad.**
   - Rader der alle kjente kolonner er tomme, hoppes over (K30).
   - Hver rad gjøres om til et inndataobjekt og valideres med de samme Zod-skjemaene som skjemaene i appen bruker (`ownerInputSchema`, `areaInputSchema` osv.). Kravene blir dermed de samme som når man registrerer i appen.
   - Hver Zod-feil får fanen, radnummeret og kolonneoverskriften der verdien stod.
   - Verdiene tolkes slik:
     - *Type:* «Trussel» eller «Mulighet». Store og små bokstaver regnes som like.
     - *«Når?»:* sammenlignes uten mellomrom, så «0-3 år» godtas. Er verdien ugyldig, lister feilmeldingen de lovlige verdiene.
     - *Sannsynlighet og konsekvens:* heltall 1–5. Både tallet 3 og teksten «3» godtas.
4. **Kontroller helheten** (K29).
   - Like navn i samme fane gir én feil per rad, med henvisning til den andre raden. Navnene sammenlignes med `normalizeName` fra `domain/rules.ts`.
   - Eier, tema og område i hver risiko slås opp på navn. Treff gir id-en, og ukjent navn gir feil (avklart beslutning 4).
5. **Bygg datasettet.**
   - Alle elementer får nye id-er (`crypto.randomUUID()`).
   - `createdAt` og `updatedAt` settes til importtidspunktet.
   - Til slutt kjøres `appDataSchema` og `findIntegrityErrors` som sikkerhetsnett, de samme kontrollene som JSON-import bruker.
6. **Feil (K28).**
   - Én feil er nok til at ingenting endres.
   - Feilene sorteres etter fane og rad og vises som en liste i feildialogen. Der vises de første 50, og resten oppsummeres som «… og N feil til».
   - Formatet er «Risikoer, rad 7, Eier: «Ola Nordman» finnes ikke i fanen «Eiere»».
7. **Bekreftelse (K31, K32).**
   - Bekreftelsesdialogen fra JSON-importen gjenbrukes. Den viser hva som erstattes, hva som kommer fra filen, og oppfordringen om å eksportere først.
   - Når bruker bekrefter, kalles `store.replaceAll()`, som ved JSON-import.

Merk: Siden importen erstatter alt og gir nye id-er, slutter bokmerker til en bestemt risiko (`?risiko=<id>`) å virke etter en Excel-import. Filterbokmerker på eier, tema og område bruker også id-er og rammes på samme måte. Det følger av beslutning 1 og er akseptabelt for et team på ti.

## Eksport og mal (K33, K35)

`writeXlsx` lager arbeidsboken. Malen er samme fil uten data.

- **Faner:** «Veiledning», «Risikoer», «Eiere», «Temaer», «Områder». Hver datafane er en Excel-tabell med fryst overskriftsrad og fornuftige kolonnebredder.
- **Nedtrekkslister:** gjelder radene 2–1000 for Type, «Når?», Sannsynlighet og Konsekvens, med verdiene fra `excelFormat.ts`. Ugyldige verdier stoppes av Excel med en norsk feilmelding.
- **Ekstra kolonner ved eksport:** «Score» og «Nivå» legges til til slutt i «Risikoer». Importen ignorerer dem fordi de er ukjente kolonner (K26). At de bare er til informasjon, står i fanen Veiledning. Det står ikke som merknad i cellen, fordi ExcelJS skriver tabell og merknad i samme fane slik at Excel ikke kan åpne filen (funnet i T34).
- **Veiledning:** Fanen forklarer reglene, skalaene med tekst (1 = Svært lav osv.) og at en import erstatter alle data i appen.
- **Tekst som ser ut som en formel:** En tittel som begynner med `=` skrives som tekst, ikke som formel, så den kan ikke kjøre kode når filen åpnes.
- **Filnavn:** `risikoregister-ÅÅÅÅ-MM-DD.xlsx` og `risikoregister-mal.xlsx`. Nedlastingen bruker en ny `downloadBlob()` ved siden av `downloadTextFile()` i `ui/download.ts`.
- **Rundtur:** eksport og import av samme fil gir de samme eierne, temaene, områdene og risikoene, unntatt id-er og datoer (akseptkriteriet til K35). Dette er hovedtesten for formatet.

## Brukergrensesnitt (DataMenu)

- **Importer:** Knappen tar imot både `.json` og `.xlsx`. Formatet avgjøres av innholdet: filer som starter med zip-signaturen `PK`, behandles som Excel. Brukeren slipper å velge format.
- **Eksporter:** Knappen åpner en liten dialog med tre valg:
  - «Excel (for redigering)»
  - «Sikkerhetskopi (JSON)»
  - «Tom Excel-mal»

  Snarveien i lagringsvarselet (K23) eksporterer fortsatt JSON direkte, siden det er sikkerhetskopien.
- **Mens filen leses eller lages:** Statusfeltet viser «Leser Excel-fil …» eller «Lager Excel-fil …». Feltet er `role="status"`, så skjermlesere får beskjed. Knappene er sperret til ExcelJS er lastet og arbeidet er ferdig.
- **Når lastingen av ExcelJS feiler** (for eksempel uten nett etter en ny versjon): appen viser en feil, og ingenting endres.

## Teststrategi

- **`parseWorkbook` (ren funksjon, flest tester):** ett eller flere tester per akseptkriterium i K26–K32. Dekker:
  - manglende fane og kolonne
  - store og små bokstaver og mellomrom i overskrifter
  - tomme rader
  - ugyldig type, «Når?», tall og e-post
  - like navn
  - ukjent eier, tema og område
  - riktig radnummer i feilene
  - at gyldige data gir riktig `AppData`
- **`toWorkbookRows`:** riktige kolonner og verditekster.
- **ExcelJS-adapterne (integrasjon):** lag en arbeidsbok i testen med `writeXlsx`, les den med `readXlsx`, og kontroller at rundturen gir like data. Testene dekker også:
  - celler med rik tekst, lenker og formelresultat
  - en mal som er fylt ut og så importert
  - at en tittel som begynner med `=` forblir tekst
- **DataMenu (komponent):** import av en Excel-fil, sammendrag, avbryt og bekreft, feildialog med fane og rad, og eksportdialogen med tre valg.
- **Bygget:** ExcelJS skal ligge i en egen del (chunk), ikke i hovedfilen. Det kontrolleres i oppgaven som innfører biblioteket.
- **Manuelt:** Malen og en eksportfil åpnes i Excel. Vi sjekker nedtrekkslistene og tabellene, redigerer, lagrer og importerer igjen.

## Rekkefølge

1. Legg til ExcelJS. Kontroller `npm audit`, at den kjører i nettleseren via Vite, og at den lastes som egen del.
2. `excelFormat.ts` og `WorkbookRows`-typene.
3. `parseWorkbook` med tester (kjernen).
4. `readXlsx` med integrasjonstester.
5. `toWorkbookRows` og `writeXlsx` (eksport og mal) med rundturtest.
6. DataMenu: import av begge formater, eksportdialog og statusmeldinger.
7. Gjennomgang mot akseptkriteriene, universell utforming og manuell sjekk i Excel.

## Risiko ved planen

- **ExcelJS er lite vedlikeholdt.** Siste versjon er fra 2024. Den er isolert bak `readXlsx` og `writeXlsx`, så den kan byttes uten å røre resten.
- **Excel-filer varierer.** Filer fra Google Sheets, LibreOffice og Numbers kan ha andre celletyper. Leseren håndterer de vanlige typene, og alt den ikke forstår, blir en tydelig feil i stedet for gale data.
- **Nedtrekkslister er bare hjelp.** De kan omgås ved å lime inn verdier. Importen kontrollerer derfor alt på nytt, uansett hva Excel har godtatt.
