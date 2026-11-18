# 004 – Egne ID-er: Oppgaver

Gjøres i rekkefølge, én om gangen. Hver oppgave er ferdig når «Ferdig når» er oppfylt og `npm test`, `npm run lint` og `npm run build` går gjennom. Kryss av når den er ferdig. Nummereringen fortsetter fra 002 (T25–T34).

## Fase 1 – Data og regler

- [x] **T35 Skjema og migrering.**
  - `code` legges til i alle fire typer. Feltet er påkrevd i `…InputSchema` («ID er påkrevd», høyst 20 tegn) og valgfritt i de lagrede skjemaene.
  - `SCHEMA_VERSION` blir 3, og `migrations.ts` får overgangen 2 → 3, som bare løfter versjonen.
  - Testdata i eksisterende tester oppdateres til versjon 3 der testene sjekker versjonen.

  (K47, K48)
  *Ferdig når:* tester viser at ID er påkrevd i inndata, valgfri i lagret data og avvises ved 21 tegn. Data i versjon 1 og 2 skal leses uten feil og få versjon 3 med uendrede data. En nyere versjon (4) skal avvises med «støtter bare versjon 1–3».

  *Resultat (2026-11-18):*
  - **Felt:** `codeSchema` i `domain/schema.ts` («ID er påkrevd», høyst 20 tegn, trimmet). `code` er lagt til i alle fire typer.
  - **Versjon:** `SCHEMA_VERSION` er 3, og `from2to3` løfter bare versjonen.
  - **Avvik:** `code` er foreløpig **valgfri også i inndata**. Ble den påkrevd nå, kunne ingen skjemaer lagre før ID-feltet finnes, og over 100 eksisterende tester ville feilet. Den blir påkrevd i inndataskjemaet for risiko i T38 og for eiere, temaer og områder i T39, sammen med skjemafeltet.
  - **Tester:** 11 nye (6 for ID, 4 for migrering 2 → 3, 1 for versjon 4). Testdata er løftet til versjon 3, og tester for ukjent versjon bruker nå 4.
- [x] **T36 Regler.**
  - `isCodeTaken` i `domain/rules.ts`.
  - `findIntegrityErrors` melder like ID-er innenfor en type.
  - `findMissingCodes` gir elementene uten ID, gruppert per type.

  (K48, K54)
  *Ferdig når:* tester dekker at «R-007» og «r-007 » regnes som samme ID, at samme ID godtas i ulike typer, at like ID-er i JSON-import avvises, og at gamle elementer uten ID blir funnet.

  *Resultat (2026-11-18):*
  - **I `domain/rules.ts`:**
    - `isCodeTaken`: elementer uten ID kolliderer aldri.
    - `findMissingCodes` og `countMissingCodes`.
    - `findIntegrityErrors` melder like ID-er med «ID-en «R-1» er brukt flere ganger (risiko).», én gang per ID.
  - **Endret tekst:** Meldingene om like *interne* id-er sier nå «intern id», så de ikke forveksles med brukerens ID.
  - **Tester:** 9 i `rules.test` og 2 for JSON-import i `exportImport.test`.
- [x] **T37 Unike ID-er i DataStore.** Opprett og endre avviser en ID som er i bruk, med feltfeilen «ID-en er allerede i bruk.» på `code`. Et gammelt element uten ID kan ikke lagres uten ID. (K47, K50)
  *Ferdig når:* tester i `dataStore.test` dekker opprett og endre for risiko og for ett referanseregister, at et element kan beholde sin egen ID når det endres, og at et gammelt element uten ID krever ID.

  *Resultat (2026-11-18):*
  - **Kontroll av ID:** `validateRisk` og `validateReference` sjekker `isCodeTaken` og gir feltfeilen «ID-en er allerede i bruk.» på `code`. Referanseregistrene melder nå feil i navn og ID samtidig, i stedet for å stoppe ved første.
  - **Endring av risiko:** `updateRisk` sender med sin egen id, så en risiko kan beholde ID-en sin når den endres.
  - **Utsatt:** «Et gammelt element uten ID krever ID» er flyttet til T38 og T39, der `code` blir påkrevd i inndata (se avviket i T35).
  - **Tester:** 9 nye. De dekker opprett og endre for risiko og eier, egen ID ved endring, samme ID i ulike typer, 21 tegn, og at koblingen beholdes når en eier får ny ID.

## Fase 2 – Skjemaer

- [x] **T38 ID i risikoskjemaet.** `code` blir påkrevd i `riskInputSchema` (se avviket i T35). «ID» blir første felt i `RiskForm` (`maxLength` 20). Feilen vises ved feltet, og fokus flyttes dit. Hjelperne i testene fyller inn ID. (K47, K49, K50)
  *Ferdig når:* tester dekker akseptkriteriene «ny risiko uten ID gir feil og lagres ikke», «r-007 er i bruk» og «gammel risiko uten ID må få ID ved endring».

  *Resultat (2026-11-18):*
  - **Skjema:** `code` er påkrevd i `riskInputSchema` og valgfri i `riskSchema`, altså i lagrede data.
  - **Feltet:** «ID» står først i `RiskForm`, på samme rad som Tittel. På smale skjermer legger de seg under hverandre. Feltet har `maxLength` 20 og `spellCheck` av.
  - **Feil:** Feilen vises ved feltet, og fokus går til ID når den mangler eller er i bruk.
  - **Eksisterende tester:** De fyller nå inn ID. En test som endrer en risiko fra før spec 004, fyller inn ID og viser dermed at det kreves.
  - **Nye tester:** 3 i `RiskForm.test` (ID først med maks 20 tegn, gammel risiko uten ID, ID i bruk), og 1 utvidet i `RisksPage.test` (ny risiko uten ID).
  - **Sjekket i nettleseren:** oppsettet, feilene ved ID og Tittel, og fokus til ID.
- [x] **T39 ID i referanseregistrene og `?rediger=`.**
  - `code` blir påkrevd i inndataskjemaene for eiere, temaer og områder (se avviket i T35).
  - ID blir et fast felt foran Navn i `ReferenceRegister`, og første kolonne i tabellen for eiere, temaer og områder.
  - Søkeparameteren `rediger=<id>` åpner skjemaet for elementet.
  - Hjelperne i testene fyller inn ID.

  (K47, K49, K50, K54)
  *Ferdig når:* tester dekker opprettelse med ID, at samme ID gir feil, at samme ID i en annen type godtas (eier «7» og risiko «7»), at `?rediger=` åpner riktig element, og at endret ID på en eier beholder koblingen til risikoene.

  *Resultat (2026-11-18):*
  - **Skjema:** `code` er påkrevd i inndataskjemaene for eiere, temaer og områder, og valgfri i lagrede data. Det gjelder nå alle fire typer.
  - **Registrene:** ID står som fast felt foran Navn (`maxLength` 20, smalt felt) og som første kolonne i tabellen. Navn er fortsatt radoverskrift. Elementer uten ID viser «–» til T40 innfører «Mangler ID».
  - **`?rediger=<id>`:** åpner elementet for endring. Parameteren fjernes fra adressen etterpå, og en ukjent id ignoreres. Mønsteret er det samme som for `?risiko=`.
  - **Avvik:** Excel-importen leser eiere, temaer og områder **uten** ID frem til T44. Der kommer ID-kolonnen, og unntaket i `parseWorkbook` (merket MIDLERTIDIG) fjernes.
  - **Eksisterende tester:** Testene for eiere, temaer, områder, FirstUse, DataStore og skjema fyller nå inn ID. Testdataene har fått ID der testen endrer elementer.
  - **Nye tester:** 9. Fire av dem er akseptkriterier: ID i bruk, «7» i to typer, ny ID beholder koblingen, og `?rediger=` for alle tre registrene. I tillegg er det tester for at ID er første felt og kolonne, at en gammel eier uten ID krever ID, og at ukjent `?rediger=` ignoreres.
  - **Sjekket i nettleseren:** `#/eiere?rediger=o2` åpnet riktig eier og ryddet adressen. ID-kolonnen og skjemaet ser riktige ut.

## Fase 3 – Visning, søk og sortering

- [x] **T40 ID i registeret og matrisen.**
  - «ID» blir første kolonne i `RiskTable`.
  - ID står foran tittelen i matrisedetaljene og i verktøytipset.
  - Elementer uten ID viser «Mangler ID» i dempet tekst, også i registrene. Kolonnen har `nowrap`.

  (K49)
  *Ferdig når:* tester dekker akseptkriteriet «R-007 vises i første kolonne og foran tittelen i matrisedetaljene», verktøytipset med ID, og «Mangler ID» for gamle elementer. Kontrasten på den dempede teksten sjekkes i nettleseren.

  *Resultat (2026-11-18):*
  - **Felles visning:** `CodeText` viser ID-en, eller «Mangler ID» med klassen `muted`. Den brukes i `RiskTable` og i registrene for eiere, temaer og områder. `withCode()` i `ui/codeLabel.ts` gir «R-007 Tittel» i matrisedetaljene og verktøytipset, og bare tittelen når ID mangler.
  - **Tabellen:** ID står som første kolonne i `RiskTable`, med `nowrap`. Sortering på ID kommer i T41.
  - **Tester:** 3 nye (registeret, matrisedetaljene og verktøytipset). Eksisterende tester for tabellen er tilpasset den nye kolonnen.
  - **Kontrast:** «Mangler ID» (#595959 på hvitt) har kontrast 7,0:1, målt i nettleseren.
- [x] **T41 Søk og sortering på ID.**
  - `matchesSearch` søker i ID.
  - Sorteringsnøkkelen `code` bruker naturlig rekkefølge (`Intl.Collator`, numeric), og elementer uten ID havner sist i begge retninger.
  - Tabellhodet «ID» kan sorteres. ~~Sorteringen lagres i URL-en.~~ *(Se resultatet.)*

  (K55)
  *Ferdig når:* tester dekker akseptkriteriene «R-2 før R-10» og «søket R-007 finner risikoen», at elementer uten ID havner sist ved både stigende og synkende sortering, og at sorteringen overlever en ny innlasting av siden.

  *Resultat (2026-11-18):*
  - **Søk:** `matchesSearch` søker i ID, tittel og beskrivelse. Plassholderen i søkefeltet er «ID, tittel eller beskrivelse».
  - **Sortering:**
    - Sorteringsnøkkelen `code` bruker `Intl.Collator` med `numeric`, og det gjør nå også sorteringen på tittel.
    - Risikoer uten ID står sist i begge retninger og sorteres på tittel seg imellom.
  - **Tabellen:** «ID» er en sorterbar kolonne, og første klikk gir stigende rekkefølge. Den skjulte tabelltittelen sier «sortert etter ID».
  - **Avvik:** Sorteringen lagres **ikke** i URL-en. Det har den aldri gjort for score, tittel eller dato heller. Planen tok feil her, og spec-en (K55) krever det ikke. Planen er rettet, og kravet om at sorteringen overlever ny innlasting er tatt ut.
  - **Tester:** 4 i `filters.test` og 2 i `RiskTable.test`, blant dem de to akseptkriteriene.

## Fase 4 – Elementer uten ID

- [x] **T42 Varsel om manglende ID.**
  - `MissingCodesNotice` vises under lagringsvarselet når noe mangler ID, for eksempel «3 risikoer og 1 eier mangler ID», med knappen «Vis».
  - Knappen åpner en liste med lenker. Risikoer lenker til `?risiko=`, de andre til `?rediger=`.
  - Varselet forsvinner når alle har fått ID.

  (K54)
  *Ferdig når:* tester dekker teksten med riktig entall og flertall, lenkene, at varselet forsvinner etter at siste ID er lagt inn, og at axe ikke finner brudd.

  *Resultat (2026-11-18):*
  - **Komponenten:** `MissingCodesNotice` står i `Layout` rett under lagringsvarselet. Den bruker samme form, men er nøytralt blå fordi det er en oppgave og ikke en advarsel.
  - **Tekst:** for eksempel «2 risikoer, 1 eier, 1 tema og 1 område mangler ID.»
  - **Liste:** «Vis» og «Skjul» (`aria-expanded` og `aria-controls`) åpner og lukker en liste med «Risiko: ‹lenke›» osv.
  - **Tilgjengelighet:** Varselet er et `<section aria-label="Elementer uten ID">`, ikke `alert`, så det ikke avbryter skjermlesere. Det har ingen overskrift, for å ikke legge en h2 foran sidens h1.
  - **Tester:** 10 nye. De dekker fem tekstvarianter, lenkene og hvor de peker, åpning av risiko fra matrisesiden, at varselet forsvinner etter siste ID, og axe både lukket og utvidet.
  - **Sjekket i nettleseren** med data i versjon 2 uten ID: teksten og listen er riktige. Kontrasten mot den blå bakgrunnen er 6,3:1 for den grå teksten, 7,4:1 for lenkene og 15,7:1 for brødteksten.
- [x] **T43 Advarsel i eksportdialogen.** Når noe mangler ID, får valget «Excel (for redigering)» advarselen «N elementer mangler ID. Filen kan ikke importeres igjen før de har fått det.» Eksporten er ikke sperret. (K54)
  *Ferdig når:* tester viser at advarselen kommer når noe mangler ID og ikke ellers, at den er koblet til knappen (`aria-describedby`), og at eksporten fortsatt virker.

  *Resultat (2026-11-18):*
  - **Advarselen:** Under forklaringen til «Excel (for redigering)» står for eksempel «4 elementer mangler ID. Filen kan ikke importeres igjen før de har fått det.» Ved ett element står «1 element … før det har fått det.»
  - **Utseende:** Teksten er rød og halvfet (`--color-danger`, #b00020, kontrast 7,6:1 mot hvitt).
  - **Kobling til knappen:** Knappen har både forklaringen og advarselen i `aria-describedby`. De andre valgene har bare sin egen forklaring.
  - **Eksporten er ikke sperret.**
  - **Tester:** 4 nye i `DataMenu.test`, og 1 tilpasset (forklaringen sjekkes nå med et mønster, siden testdataene mangler ID).

## Fase 5 – Excel

- [x] **T44 ID-kolonnen i Excel.**
  - `excelFormat.ts` får ID først i alle faner.
  - `parseWorkbook` sjekker like ID-er per fane, med en felles `findDuplicates`, i tillegg til like navn.
  - `toWorkbookRows` skriver `code`, eller tom celle hvis den mangler.
  - Testene for Excel oppdateres med ID-kolonne.

  (K51, K52, K53)
  *Ferdig når:* tester dekker akseptkriteriene «to rader med R-3 gir feil på begge», «fil uten ID-kolonne gir «Kolonnen «ID» mangler»» og «rundtur beholder ID-ene», og at tom ID og ID på 21 tegn gir feil med fane, rad og kolonne.

  *Resultat (2026-11-18):*
  - **Formatet:** `excelFormat.ts` har kolonnen `{ key: 'code', header: 'ID', required: true, width: 12 }` først i alle fire faner. Mal, eksport, veiledning og nedtrekkslister fulgte med automatisk, og kolonnene med nedtrekksliste flyttet én plass til høyre.
  - **Import:**
    - Unntaket fra T39 er fjernet, så ID er påkrevd ved import.
    - `findDuplicates` er felles for navn og ID. Like ID-er gir ««R-3» står også på rad 4. ID må være unik.», i alle fire faner.
    - En ID som er et tall i Excel, leses som tekst.
  - **Eksport:** `toWorkbookRows` skriver ID, eller tom celle hvis den mangler.
  - **Eksisterende Excel-tester:**
    - Testdataene har fått ID-er, og forventningene har ID-kolonnen først.
    - I `parseWorkbook.test` legger hjelperen `withCodes` til en ID-kolonne automatisk. Testene av selve ID-kolonnen bruker `workbook()` direkte, uten hjelperen.
  - **Nye tester:** 7. De dekker akseptkriteriene, like ID-er i Eiere, tom ID og 21 tegn, ID som tall, og tom ID-celle i eksporten. Rundturen med ID-er dekkes av `writeXlsx.test`.
- [x] **T45 Ny eksempelfil.** `eksempler/risikoregister-eksempel.xlsx` lages på nytt med appens eksport og ID-er: R-001…, E-01…, T-01…, O-01…. (Beslutning 7)
  *Ferdig når:* filen importeres uten feil i appen og åpnes i Excel.

  *Resultat (2026-11-18):*
  - **Filen:** `eksempler/risikoregister-eksempel.xlsx` er laget på nytt med appens egen eksport. Den har de samme 5 eierne, 5 temaene, 5 områdene og 12 risikoene som før, nå med ID-er (R-001–R-012, E-01–E-05, T-01–T-05, O-01–O-05).
  - **Import:** Appens import leser filen uten feil, og ID-ene kommer med.
  - **Excel:** Microsoft Excel 16 åpner filen uten reparasjon. Alle fire datafanene har én tabell med «ID» i A1.

## Fase 6 – Kvalitetssikring

- [x] **T46 Gjennomgang.**
  - Gå gjennom hvert krav K47–K55 og hvert akseptkriterium mot tester og kjørende app, også med gamle data (versjon 2) i nettleseren.
  - Sjekk universell utforming: fokus ved ID-feil, «Mangler ID» for skjermleser, varselet og kontrasten.
  - Åpne eksempelfilen i Excel.
  - Oppdater statusen i spec og plan, og legg sjekklisten nederst i denne filen.

  (K47–K55)
  *Ferdig når:* alle krav og akseptkriterier er krysset av med henvisning til test eller manuell sjekk, og avvik er listet.

## Sporbarhet

| Krav | Oppgaver |
|---|---|
| K47 ID påkrevd ved opprettelse og endring; gamle kan mangle | T35, T37, T38, T39 |
| K48 Fritekst, høyst 20 tegn, unik per type | T35, T36 |
| K49 ID vises i registeret, listene, matrisen og skjemaet | T38, T39, T40 |
| K50 Feil ved feltet for manglende, for lang eller brukt ID | T37, T38, T39 |
| K51 ID-kolonne først i Excel | T44 |
| K52 Risikoer viser fortsatt til navn | T44 |
| K53 Import sjekker ID; fil uten ID-kolonne avvises | T44 |
| K54 Vise elementer uten ID; advarsel ved Excel-eksport | T36, T39, T42, T43 |
| K55 Søk og naturlig sortering på ID | T41 |

## Sjekkliste fra gjennomgangen (T46, 2026-11-18)

Hvert krav er sjekket mot automatiske tester og i kjørende app (utviklingsserveren), med data i versjon 2 uten ID-er. Eksempelfilen er åpnet i Microsoft Excel 16. Det er 555 tester i alt, og `npm test`, `npm run lint` og `npm run build` går gjennom.

### Krav

| Krav | Oppfylt | Dekket av |
|---|---|---|
| K47 ID påkrevd ved opprettelse og endring; gamle elementer kan mangle ID | [x] | `schema.test`, `dataStore.test`, `RiskForm.test`, `OwnersPage.test`, `migrations.test`; prøvd i nettleser |
| K48 Fritekst, høyst 20 tegn, unik per type uten hensyn til store og små bokstaver | [x] | `schema.test`, `rules.test`, `dataStore.test`, `OwnersPage.test` |
| K49 ID vises i registeret, listene, matrisedetaljene, verktøytipset og skjemaet, og «Mangler ID» der den mangler | [x] | `RiskTable.test`, `OwnersPage.test`, `ThemesAndAreasPages.test`, `MatrixInteraction.test`, `RiskMatrixTooltip.test`; prøvd i nettleser |
| K50 Feil ved feltet for manglende, for lang eller brukt ID; ingenting lagres | [x] | `RiskForm.test`, `RisksPage.test`, `OwnersPage.test`, `dataStore.test` |
| K51 ID-kolonne først i Excel; tom celle for elementer uten ID | [x] | `excelFormat.test`, `toWorkbookRows.test`, `writeXlsx.test`; åpnet i Excel |
| K52 Risikoer viser fortsatt til eier, tema og område med navn | [x] | `parseWorkbook.test`, `writeXlsx.test` (rundtur) |
| K53 Import sjekker ID, også like ID-er; fil uten ID-kolonne avvises | [x] | `parseWorkbook.test`, `index.test` |
| K54 Varsel med elementer uten ID og lenker; advarsel ved Excel-eksport | [x] | `MissingCodesNotice.test`, `DataMenu.test`, `OwnersPage.test` (`?rediger=`); prøvd i nettleser |
| K55 Søk på ID; naturlig sortering der elementer uten ID står sist | [x] | `filters.test`, `RiskTable.test`; prøvd i nettleser |

### Akseptkriterier

| Akseptkriterium | Oppfylt | Dekket av |
|---|---|---|
| Ny risiko uten ID → feil ved ID-feltet, ingenting lagres | [x] | `RisksPage.test` |
| «r-007 » når «R-007» finnes → «ID-en er allerede i bruk.» | [x] | `RiskForm.test`, `dataStore.test`; prøvd i nettleser |
| Eier og risiko med ID «7» godtas | [x] | `OwnersPage.test`, `dataStore.test`, `rules.test` |
| «R-007» i første kolonne og foran tittelen i matrisedetaljene | [x] | `RiskTable.test`, `MatrixInteraction.test`; prøvd i nettleser («R-009 …») |
| Eier fra «E-1» til «E-01» beholder koblingen til risikoene | [x] | `OwnersPage.test`, `dataStore.test` |
| To rader med «R-3» i Excel → feil på begge, ingenting endres | [x] | `parseWorkbook.test` |
| Excel-eksport med ID-er importert uendret → samme ID-er | [x] | `writeXlsx.test`; eksempelfilen importert i nettleser |
| Data fra før endringen vises med «Mangler ID», og ingenting avvises | [x] | `migrations.test`, `RiskTable.test`; versjon 2 lest i nettleser |
| Gammel risiko uten ID må få ID ved endring | [x] | `RiskForm.test`; prøvd i nettleser (fokus til ID, «ID er påkrevd») |
| Excel uten ID-kolonne → «Kolonnen «ID» mangler» | [x] | `parseWorkbook.test` |
| R-10 og R-2 sortert på ID → R-2 først | [x] | `filters.test`, `RiskTable.test`; prøvd i nettleser |
| Søket «R-007» finner risikoen | [x] | `filters.test`, `RiskTable.test`; prøvd i nettleser (søket «R-10») |

### Gjennomgang i nettleseren (versjon 2-data uten ID)

1. Appen leste dataene uten feil. Registeret viste «Mangler ID», og varselet sa «2 risikoer, 1 eier, 1 tema og 1 område mangler ID.»
2. Lagring av en gammel risiko uten ID ga «ID er påkrevd» med fokus på ID-feltet. Med «R-10» ble den lagret.
3. «r-10 » på en annen risiko ga «ID-en er allerede i bruk.» Med «R-2» ble den lagret, og varselet telte ned til 1 eier, 1 tema og 1 område.
4. Sortering på ID ga R-2 før R-10, og søket «R-10» fant bare den risikoen.
5. Verktøytipset i matrisen viste «• R-2 Leverandør går konkurs • R-10 Datainnbrudd».
6. Eksportdialogen viste under Excel-valget: «3 elementer mangler ID. Filen kan ikke importeres igjen før de har fått det.»
7. Den nye eksempelfilen ble importert: 12 risikoer, 5 eiere, 5 temaer og 5 områder. Varselet forsvant, registeret viste ID-er, og matrisedetaljene viste «R-009 Automatisering av fakturabehandling».
8. Det var ingen feil i konsollen. Testdataene er fjernet etterpå.

### Universell utforming

- **Fokus:** Ved feil i ID går fokus til ID-feltet. Det er testet og prøvd i nettleseren.
- **Skjermleser:** «Mangler ID» er vanlig tekst og leses opp. Varselet er en navngitt `section`, ikke `alert`. «Vis» har `aria-expanded` og `aria-controls`. Advarselen i eksportdialogen er koblet til knappen med `aria-describedby`.
- **axe:** Ingen brudd i varselet, verken lukket eller utvidet, og heller ikke i de eksisterende sidene og dialogene. Testdataene der mangler ofte ID, så varselet var med i de kjøringene også.
- **Kontrast:**
  - «Mangler ID»: 7,0:1.
  - Varselet: 6,3:1 for grå tekst, 7,4:1 for lenker og 15,7:1 for brødtekst.
  - Advarselen i eksportdialogen (#b00020 på hvitt): 7,6:1.

### Avvik og valg som bør bekreftes

- **Sortering lagres ikke i URL-en:** Sorteringen på ID lagres ikke i URL-en, akkurat som de andre sorteringene. Planen sa først URL, men det var feil i planen og ikke et krav (T41).
- **Midlertidig unntak er fjernet:** I T35–T43 var ID midlertidig valgfri i noen inndata, slik at hver oppgave kunne bli ferdig med alle tester grønne. Alle unntakene er fjernet (T38, T39, T44).
- **Eldre Excel-filer virker ikke lenger:** Det gjelder også den forrige eksempelfilen. De må eksporteres på nytt fra appen, eller få kolonnen «ID» lagt til (beslutning 6).
- **Den publiserte appen kjenner ikke ID-kolonnen ennå:** Den nye eksempelfilen kan derfor ikke importeres der før endringen er publisert.
- **Størrelse:** Hovedfilen har gått fra 125,2 til 126,4 kB gzip.

