# 002 – Import og eksport med Excel: Oppgaver

Gjøres i rekkefølge, én om gangen. Hver oppgave er ferdig når «Ferdig når» er oppfylt og `npm test`, `npm run lint` og `npm run build` går gjennom. Kryss av når den er ferdig. Nummereringen fortsetter fra 001 (T01–T24).

## Fase 1 – Bibliotek

- [x] **T25 Legg til ExcelJS og kontroller det.** Installer `exceljs` og sett opp lat lasting med `import()` i `data/excel/index.ts`. Lag og les en arbeidsbok med én celle i en test. Kjør `npm audit`. Bygg appen og sjekk at ExcelJS havner i en egen del. Last delen i nettleseren via utviklingsserveren. (K27)
  *Ferdig når:*
  - testen går grønt
  - hovedfilen i bygget er omtrent like stor som før
  - ExcelJS kan lastes i nettleseren uten feil i konsollen
  - ingen alvorlige sårbarheter rammer nettleserbruk; finnes det slike, stopper vi og går tilbake til planen

  *Resultat (2026-11-18):*
  - **Versjon:** `exceljs` 4.4.0 er installert.
  - **Bygget:** ExcelJS er en egen del, `exceljs.min-*.js`, på 929 kB (256 kB gzip). Den lastes ikke ved oppstart.
    - Med lastingen koblet inn vokser hovedfilen med 1 kB, fra 119,5 til 120,5 kB gzip. Grensen for varsel om store deler er satt til 1000 kB i `vite.config.ts`.
  - **Prøvd i nettleseren:** både utviklingsserveren og produksjonsbygget kunne lage og lese en arbeidsbok med nedtrekksliste, uten feil i konsollen. Teksten «=1+1» forble tekst og ble ikke en formel.
  - **`npm audit`:** ExcelJS tok med seg én ny melding: `uuid` < 11.1.1 (moderat, GHSA-w5hq-g745-h8pq). Den rammer bare v3/v5/v6 med `buf`-argument. ExcelJS bruker bare `v4()` uten `buf`. I nettleseren brukes dessuten ExcelJS sin ferdigbygde fil, ikke `uuid` fra `node_modules`. Meldingen rammer derfor ikke appen. Den kjente `picomatch`-meldingen gjelder bare utviklingsverktøyene, som før.
  - **Tester:**
    - Excel-testene kjører i Node (`@vitest-environment node`), fordi ExcelJS i jsdom tok kapasitet fra de andre testene. `test/setup.ts` tåler nå tester uten DOM.
    - Testgrensen er hevet til 15 s, fordi `FirstUse` alene bruker opptil 5 s når maskinen er travel.

## Fase 2 – Format og tolking (rene funksjoner, test først)

- [x] **T26 Formatbeskrivelse.** Lag `domain/excelFormat.ts` med fanene, kolonnene, de påkrevde feltene og visningstekstene for Type, «Når?» og skalaene, hentet fra `scales.ts`. Lag `data/excel/workbookRows.ts` med typene `WorkbookRows`, `SheetRows` og `CellError`. Lag en hjelpefunksjon som finner kolonner etter overskrift, uavhengig av store og små bokstaver og mellomrom før og etter. (K26)
  *Ferdig når:* tester viser at alle fire faner har kolonnene fra tabellene i spec-en, og at «e-post » finner kolonnen «E-post».

  *Resultat (2026-11-18):*
  - **`excelFormat.ts`:** fanene, kolonnene (med påkrevd, faste valg og bredde), informasjonskolonnene Score og Nivå, `findSheetName` og `findColumns`. Sammenligningen av fane- og kolonnenavn bruker `normalizeName`, samme regel som for navn på eiere, temaer og områder.
  - **Ekstra i `findColumns`:** Står en kolonne to ganger, meldes den som dublett i stedet for at én av dem velges stille. Det blir en feil i T27.
  - **`workbookRows.ts`:** typene, `formatCellError`, som gir formatet «Risikoer, rad 7, Eier: …», og `sortCellErrors`, som sorterer etter fane og rad.
  - **Tester:** 20 nye.
- [x] **T27 Tolk faner og rader.** Lag `data/excel/parseWorkbook.ts` med første del:
  - finn fanene og kolonnene
  - hopp over tomme rader
  - valider hver rad med Zod-skjemaene for inndata
  - knytt feilene til fane, rad og kolonne
  - tolk verdiene for Type, «Når?» (uten hensyn til mellomrom) og tall 1–5 (tall eller tekst)

  (K26, K28, K30)
  *Ferdig når:* tester dekker:
  - manglende fane («Fanen «Risikoer» mangler»)
  - manglende påkrevd kolonne
  - ukjente faner og kolonner som ignoreres
  - tomme rader
  - ugyldig type, «Når?», tall og e-post, med riktig radnummer og kolonne
  - at feilen for «Når?» = «2 år» lister de lovlige verdiene

  *Resultat (2026-11-18):*
  - **`parseSheets()`** i `data/excel/parseWorkbook.ts` gir tolkede rader per fane, med radnummer, og en feilliste.
  - **Faner og kolonner:**
    - Mangler en fane, eller mangler en kolonne eller står den to ganger, gir det én feil per fane eller kolonne. Radene i en slik fane leses ikke, for ellers ville hver rad gitt samme feil om igjen.
  - **Verdier:**
    - Et tomt påkrevd felt gir alltid meldingen «‹Kolonne› er påkrevd».
    - Type, «Når?» og tall som er ugyldige, gir en melding som lister de lovlige verdiene.
    - Øvrige feil (tittel med bare mellomrom, e-post) kommer fra appens egne Zod-skjemaer.
    - Hvert felt gir høyst én feil.
  - **Celleproblemer:** `CellValue` har fått varianten `{ problem }`. `readXlsx` (T29) bruker den for formelfeil og datoer, og tolkingen gjør den til en feil på riktig celle.
  - **Til T28:** Rader med feil er ikke med i listene. Risikoer som viser til en eier, et tema eller et område på en slik rad, må ikke få en ekstra «finnes ikke»-feil i tillegg.
  - **Tester:** 23 nye.
- [x] **T28 Kontroller helheten og bygg datasettet.** Utvid `parseWorkbook` med:
  - like navn i samme fane, med én feil per rad og henvisning til den andre
  - oppslag av eier, tema og område på navn, der ukjent navn gir feil
  - nye id-er, og datoer satt til importtidspunktet
  - kontroll til slutt med `appDataSchema` og `findIntegrityErrors`
  - sortering av feilene etter fane og rad

  (K28, K29, avklart beslutning 4)
  *Ferdig når:* tester dekker akseptkriteriene «Ola Nordman finnes ikke», «to like temanavn gir feil på begge radene» og «gyldig fil med 3/2/2/10 gir riktig AppData med riktige koblinger», og at én feil gir `ok: false`.

  *Resultat (2026-11-18):*
  - **`parseWorkbook(workbook, { now, newId })`** gir `{ ok: true, data }` eller `{ ok: false, errors }`. `now` og `newId` kan settes i tester og er ellers nåtid og `crypto.randomUUID()`.
  - **Like navn:** gir feil som «Temaer, rad 4, Navn: «leverandør» står også på rad 2. Navn må være unike.» Står et navn tre ganger, nevnes begge de andre radene.
  - **Følgefeil:** Appen melder ikke «finnes ikke» når eier, tema eller område står på en rad som selv har feil, eller når fanen ikke kunne leses. `parseSheets` har fått `rejected` til dette, som avtalt i T27.
  - **Sikkerhetsnett:** Til slutt kjøres `appDataSchema` og `findIntegrityErrors`. Slår de ut, er det en feil i appen og ikke i filen, og feilen merkes «Filen».
  - **Tester:** 13 nye.

## Fase 3 – Lesing og skriving av filer

- [x] **T29 Les .xlsx.** Lag `data/excel/readXlsx.ts`, som gjør `ArrayBuffer` om til `WorkbookRows`:
  - avvis filer over 5 MB
  - gjør om rik tekst, lenker (lenketeksten), formelresultater, datoer og formelfeil
  - les både Excel-tabeller og vanlige celleområder

  (K26, K27, K30)
  *Ferdig når:* integrasjonstester med arbeidsbøker laget i testen dekker hver celletype, en fil med Excel-tabell og en uten, og en for stor fil.

  *Resultat (2026-11-18):*
  - **`readXlsx(buffer)`** gir `{ ok: true, rows }`, eller `{ ok: false, message }` når filen er for stor eller ikke er en Excel-fil.
  - **Hva som leses:** Bare kolonner med overskrift på rad 1 leses.
  - **Celler som blir et problem på riktig celle:**
    - Formelfeil, også som resultat av en formel, for eksempel `#DIV/0!`.
    - Datoer og sannhetsverdier (SANN/USANN).
    - Formler uten lagret resultat.
  - **Endring i oppsettet:** Lasteren er flyttet fra `index.ts` til `loadExcelJs.ts`. Ellers ville `index.ts` (T32) og `readXlsx` importert hverandre i ring. Planen er oppdatert.
  - **Tester:** 11 nye. Én av dem kjører en ekte fil gjennom `readXlsx` og deretter `parseWorkbook`. Lesing i nettleseren sjekkes i T32.
- [x] **T30 Fra datasett til rader.** Lag `data/excel/toWorkbookRows.ts`, som gjør `AppData` om til `WorkbookRows`:
  - navn i stedet for id-er
  - visningstekster for Type og «Når?»
  - informasjonskolonnene «Score» og «Nivå»

  (K35)
  *Ferdig når:* tester viser riktige kolonner og verdier, og at `parseWorkbook(toWorkbookRows(data))` gir de samme dataene, unntatt id-er og datoer.

  *Resultat (2026-11-18):*
  - **`toWorkbookRows(data)`** gir fanene i rekkefølgen Risikoer, Eiere, Temaer, Områder.
  - **Innholdet:**
    - Eier, tema og område skrives som navn.
    - Type og «Når?» skrives med visningstekstene, og tomme valgfrie felt blir tomme celler.
    - Score og Nivå står til slutt i Risikoer. Nivå bruker navnet for typen, for eksempel «Middels» for en mulighet 1 × 4.
  - **Tomt datasett:** gir faner med bare overskrifter. Malen i T31 bygger på dette.
  - **Rundturen:** `parseWorkbook(toWorkbookRows(data))` er testet og gir de samme dataene, unntatt id-er og datoer. Testen har med en tittel som begynner med `=`. At den forblir tekst i selve filen, testes i T31.
  - **Tester:** 5 nye.
- [x] **T31 Skriv .xlsx og mal.** Lag `data/excel/writeXlsx.ts` med:
  - fanen «Veiledning» med regler, skalaer og varselet om at importen erstatter alt
  - datafanene som Excel-tabeller med fryst overskriftsrad og kolonnebredder
  - nedtrekkslister med norsk feilmelding på radene 2–1000 for Type, «Når?», Sannsynlighet og Konsekvens
  - tekst som begynner med `=`, skrevet som tekst

  Tom data gir malen. Lag også `downloadBlob()` i `ui/download.ts` og filnavnene `risikoregister-ÅÅÅÅ-MM-DD.xlsx` og `risikoregister-mal.xlsx`. (K33, K35)
  *Ferdig når:* rundturtesten `writeXlsx` → `readXlsx` → `parseWorkbook` gir de samme dataene (akseptkriteriet til K35). Tester viser også at en utfylt mal importeres uten feil (akseptkriteriet til K33), at nedtrekkslistene finnes på riktige kolonner, og at en tittel som begynner med `=` forblir tekst.

  *Resultat (2026-11-18):*
  - **API:** `writeXlsx(data)` og `writeTemplate()` i `data/excel/writeXlsx.ts` gir en `Blob`. Rekkefølgen på fanene er Veiledning, Risikoer, Eiere, Temaer, Områder.
  - **Datafanene:** Hver datafane er én Excel-tabell med fryst overskrift og kolonnebreddene fra `excelFormat.ts`.
  - **Nedtrekkslister:**
    - Én regel per område (rad 2–1000) med norsk feilmelding.
    - Typedefinisjonene til ExcelJS mangler `worksheet.dataValidations`, så den har fått en smal egen type. Funksjonen finnes og er prøvd både i nettleseren og i Node.
  - **Malen:** En Excel-tabell uten rader gir en fil Excel klager på. Malen har derfor én tom rad i hver tabell. Importen hopper over den (K30).
  - **Score og Nivå:** Overskriftene har en merknad i cellen om at kolonnene ikke leses inn.
  - **Veiledningen** lages fra formatet og skalaene: regler, kolonner med påkrevd og lovlige verdier, og alle skalatekster.
  - **Tekst som ser ut som formel:** Tekst som begynner med `=` skrives som tekst. Det er testet med `=HYPERLINK(...)`, som blir lest tilbake som tekst uten formel.
  - **Nedlasting:** `downloadBlob()` er lagt til i `ui/download.ts`, og `downloadTextFile()` bruker den. `exportFileName()` tar nå filtypen (`'xlsx'`), og `TEMPLATE_FILE_NAME` er `risikoregister-mal.xlsx`.
  - **Prøvd i nettleseren** (utviklingsserveren, ExcelJS sin nettleserfil): eksport → lesing → tolking ga de samme dataene, og malen kunne importeres. Det var ingen feil i konsollen.
  - **Tester:** 10 nye, og 1 utvidet test av filnavn.
  - **Gjenstår:** Det er ikke sjekket at filene åpnes uten advarsel i selve Excel. Det gjøres i T34.

## Fase 4 – Brukergrensesnitt

- [x] **T32 Import av Excel i DataMenu.** «Importer» tar imot `.json` og `.xlsx`, og formatet avgjøres av zip-signaturen `PK`. Excel-filer går gjennom `importExcel()`. Bekreftelsesdialogen gjenbrukes og viser hva som erstattes. Feildialogen viser opptil 50 feil i formatet «Risikoer, rad 7, Eier: …», og resten som «… og N feil til». Statusfeltet viser «Leser Excel-fil …» mens filen leses, og knappene er sperret så lenge. Feiler lastingen av ExcelJS, vises en feil, og ingenting endres. (K26, K28, K31, K32)
  *Ferdig når:* komponenttester dekker gyldig fil med bekreft og avbryt, akseptkriteriet «5 i appen, 3 i filen», feildialogen med fane og rad, og at JSON-import virker som før.

  *Resultat (2026-11-18):*
  - **`data/excel/index.ts`:**
    - `isXlsx()` kjenner igjen en Excel-fil på signaturen `PK`.
    - `importExcel()` gir samme form som JSON-importen (`message` + `details`), slik at begge dialogene gjenbrukes uendret. Feilmeldingen er «Filen har N feil. Rett dem i Excel og importer på nytt.»
    - Feiler lastingen av ExcelJS, gir det en egen melding.
  - **DataMenu:** Filvelgeren tar imot `.json` og `.xlsx`. Filen leses som bytes, og JSON dekodes som før.
  - **Tester:** 13 nye.
    - `importExcel` er testet med ekte filer i Node: gyldig fil, én feil, 60 feil med oppsummering, og ødelagt zip.
    - Én test sjekker hva som skjer når ExcelJS ikke kan lastes.
    - Menyen har 6 komponenttester. Der er Excel-lesingen erstattet med en testversjon, siden den er testet for seg.
  - **Prøvd i nettleseren** (utviklingsserveren) med ekte filer gjennom filvelgeren:
    - En fil med ukjent eier og «Når?» = «2 år» ga to feil med fane, rad og kolonne, uten følgefeil for området.
    - En gyldig fil ga sammendraget, og etter bekreftelse ble dataene erstattet og lagret.
    - Ingen feil i konsollen. Testdataene er fjernet etterpå.
  - **Bygget:** Hovedfilen er 123,4 kB gzip, mot 119,5 før spec 002. ExcelJS er fortsatt en egen del.
- [x] **T33 Eksportdialog.** «Eksporter» åpner en dialog med valgene «Excel (for redigering)», «Sikkerhetskopi (JSON)» og «Tom Excel-mal». Snarveien i lagringsvarselet eksporterer fortsatt JSON direkte. Statusfeltet viser hvilken fil som ble laget. (K33, K34, K35)
  *Ferdig når:* komponenttester dekker de tre valgene med riktig filnavn og filtype, avbryt, og at snarveien i varselet fortsatt gir JSON.

  *Resultat (2026-11-18):*
  - **Dialogen «Eksporter»** har tre valg. Hvert valg er en knapp med en kort forklaring koblet til seg (`aria-describedby`).
  - **Statusmeldinger:**
    - Excel: «Lager Excel-fil …», deretter «Eksportert til risikoregister-ÅÅÅÅ-MM-DD.xlsx.»
    - Malen: «Malen er lastet ned: risikoregister-mal.xlsx.»
    - Feiler noe, får brukeren en egen melding.
  - **Knappen sperres ikke under eksport:** «Eksporter» får ikke `disabled` mens filen lages. Da kan fokus gå tilbake til den når dialogen lukkes. En intern sperre hindrer at et dobbeltklikk lager to filer.
  - **Tester:** 6 nye og 1 endret. JSON-eksporttesten går nå via dialogen.
  - **Prøvd i nettleseren** (nedlasting fanget, ingen ekte filer):
    - Alle tre valgene ga riktig filnavn og filtype.
    - Escape lukker dialogen.
    - Fokus går til første valg når dialogen åpnes, og tilbake til «Eksporter» etterpå.
    - Ingen feil i konsollen.
    - Knappeteksten er venstrejustert, så den står i flukt med forklaringene.

## Fase 5 – Kvalitetssikring

- [x] **T34 Gjennomgang.** Gå gjennom hvert krav K26–K35 og hvert akseptkriterium mot tester og kjørende app. Sjekk universell utforming i dialogene: tastatur, fokus, skjermlesermeldinger og axe. Gjør en manuell sjekk i Excel:
  - åpne malen og en eksportfil
  - prøv nedtrekkslistene
  - legg til rader i tabellene
  - lagre, og importer filen igjen

  Oppdater statusen i spec og plan, og legg sjekklisten nederst i denne filen. (K26–K35)
  *Ferdig når:* alle krav og akseptkriterier er krysset av med henvisning til test eller manuell sjekk, og avvik er listet.

## Sporbarhet

| Krav | Oppgaver |
|---|---|
| K26 Import av fanene og kolonnene | T26, T27, T29, T32 |
| K27 Lokalt i nettleseren | T25, T29 |
| K28 Alt eller ingenting, feil med fane/rad/kolonne | T27, T28, T32 |
| K29 Verdier, unike navn, referanser | T28 |
| K30 Tomme rader, manglende fane/kolonne | T27, T29 |
| K31 Sammendrag før bekreftelse | T32 |
| K32 Erstatter alle data | T32 |
| K33 Mal | T31, T33 |
| K34 JSON-eksport og -import uendret | T32, T33 |
| K35 Eksport til Excel, rundtur | T30, T31, T33 |

## Sjekkliste fra gjennomgangen (T34, 2026-11-18)

Hvert krav er sjekket mot automatiske tester, i kjørende app (utviklingsserveren) og i Microsoft Excel 16 via automatisering. Totalt er det 481 tester, og `npm test`, `npm run lint` og `npm run build` går gjennom.

### Krav

| Krav | Oppfylt | Dekket av |
|---|---|---|
| K26 Import av fanene og kolonnene, kolonner i fri rekkefølge, ukjente ignoreres | [x] | `excelFormat.test`, `parseWorkbook.test`, `readXlsx.test`, `DataMenu.test`; prøvd i nettleser |
| K27 Lest i nettleseren, ingen data sendes ut | [x] | ExcelJS kjører lokalt og lastes fra appens egen server (T25). Ingen nettverkskall med data. |
| K28 Alt eller ingenting; feil med fane, rad og kolonne | [x] | `parseWorkbook.test`, `index.test` (importExcel), `DataMenu.test`; prøvd i nettleser |
| K29 Påkrevde felt, lovlige verdier, unike navn, eier/tema/område finnes | [x] | `parseWorkbook.test` (verdier, dubletter, oppslag, ingen følgefeil) |
| K30 Tomme rader hoppes over; manglende fane eller kolonne gir feil | [x] | `parseWorkbook.test`, `readXlsx.test` |
| K31 Sammendrag før bekreftelse; Avbryt endrer ingenting | [x] | `DataMenu.test`; prøvd i nettleser |
| K32 Erstatter alle data, sier hva som forsvinner, foreslår sikkerhetskopi | [x] | `DataMenu.test` («5 i appen, 3 i filen») |
| K33 Mal med faner, overskrifter, nedtrekkslister og veiledning | [x] | `writeXlsx.test`, `DataMenu.test`; åpnet, fylt ut og lagret i Excel, og importert igjen |
| K34 JSON-eksport og -import som før | [x] | eksisterende `DataMenu.test`, `FirstUse.test`; snarveien i varselet gir JSON |
| K35 Eksport til Excel og rundtur | [x] | `toWorkbookRows.test`, `writeXlsx.test`; eksportert, redigert og lagret i Excel, og importert igjen |

### Akseptkriterier

| Akseptkriterium | Oppfylt | Dekket av |
|---|---|---|
| Gyldig fil 3/2/2/10 gir 10 risikoer med riktig score, nivå og koblinger | [x] | `parseWorkbook.test`. Visning og filtre i registeret er de samme som for andre data (K3, K4). |
| «Ola Nordman» finnes ikke → feil med fane, rad og kolonne, ingenting endres | [x] | `parseWorkbook.test`, `DataMenu.test`; prøvd i nettleser |
| To like navn i Temaer → feil på begge radene | [x] | `parseWorkbook.test` |
| «Når?» = «2 år» → feil med de lovlige verdiene | [x] | `parseWorkbook.test`; prøvd i nettleser |
| Overskriften «e-post » leses som «E-post» | [x] | `excelFormat.test`, `parseWorkbook.test` |
| Fil uten fanen «Risikoer» → «Fanen «Risikoer» mangler» | [x] | `parseWorkbook.test` |
| Avbryt i sammendraget → uendret | [x] | `DataMenu.test` |
| 5 i appen, 3 i filen → nøyaktig 3 etterpå, og sammendraget sa 5 erstattes | [x] | `DataMenu.test` |
| Malen fylt ut og importert → ingen feil | [x] | `writeXlsx.test`; i Excel: `mal-utfylt-i-excel.xlsx` ble importert uten feil |
| Eksport → import uendret gir samme data (unntatt datoer) | [x] | `toWorkbookRows.test`, `writeXlsx.test`; i Excel: ny rad og endret «Når?» kom med |

### Sjekk i Excel (Microsoft Excel 16, via automatisering)

- **Åpning:** Malen og eksportfilen åpnes uten feil og uten reparasjon.
- **Faner:** Fanene står i rekkefølgen Veiledning, Risikoer, Eiere, Temaer, Områder.
- **Tabeller og overskrifter:** Hver datafane har én tabell og fryst overskriftsrad.
- **Nedtrekkslister:**
  - Type: Trussel;Mulighet
  - Sannsynlighet og Konsekvens: 1;2;3;4;5, helt ned til rad 1000
  - «Når?»: 0 - 3 år;3 - 5 år;5 år +
  - Eier har ingen nedtrekksliste.
- **Tekst som ser ut som formel:** Tittelen «=Ny støtteordning» er tekst og ikke formel, også etter at Excel har lagret filen.
- **Redigering og lagring i Excel:**
  - En ny rad lagt til i tabellen, «Strømbrudd» 2 × 3, ble importert.
  - Endret «Når?» for Økonomi ble importert som `3-5`.
  - E-post og æøå kom uendret gjennom.

### Universell utforming

- **axe:** Eksportdialogen og feildialogen etter Excel-import har ingen brudd. To tester er lagt til i `accessibility.test`.
- **Tastatur:**
  - Eksportdialogen lukkes med Escape.
  - Fokus går til første valg når dialogen åpnes, og tilbake til «Eksporter» etterpå (T33).
- **Skjermleser:** Hvert valg har en forklaring som leses opp (`aria-describedby`). Statusen «Leser Excel-fil …» og «Lager Excel-fil …» står i `role="status"`.

### Funnet og rettet i gjennomgangen

- **Excel kunne ikke åpne filene.** Excel 16 nektet å åpne både malen og eksportfilen, også med reparasjon. Varianter av filen viste at årsaken var en merknad i en celle (på Score og Nivå) i en fane med Excel-tabell. Det er en feil i ExcelJS. Merknaden er fjernet, og veiledningen forklarer kolonnene i stedet. En test sikrer at datafanene ikke får merknader.
  - Testene fra T31 gikk grønt fordi de leste filen med ExcelJS, ikke med Excel. Uten sjekken i ekte Excel ville feilen ha nådd brukerne.

### Avvik og valg som bør bekreftes

- **Sjekket med automatisering, ikke med øynene:** Ingen har sett på utseendet i Excel ennå (farger, bredder, lesbarheten i veiledningen). Anbefaling: åpne malen fra appen én gang.
- **Lenker slutter å virke etter import:** Bokmerker til en bestemt risiko, og filtre på eier, tema eller område, virker ikke lenger etter en Excel-import, fordi alle id-er lages på nytt. Det følger av «erstatt alt» (beslutning 1) og er beskrevet i planen.
- **Én tom rad i malen:** Hver tabell i malen har én tom rad å skrive i. En tabell helt uten rader er ikke prøvd i Excel. Importen hopper over den tomme raden.
- **Datoer og SANN/USANN** i en celle gir feil i stedet for å bli gjort om til tekst.
- **Eksport sperrer ikke knappen:** «Eksporter» sperres ikke mens Excel-filen lages, så fokus kan gå tilbake til knappen. Et dobbeltklikk hindres på annen måte.
- **Størrelse:** Appens hovedfil har gått fra 119,5 til 125,2 kB gzip. ExcelJS (256 kB gzip) lastes bare ved bruk.
