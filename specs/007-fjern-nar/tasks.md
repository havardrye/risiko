# 007 – Fjern «Når?» fra områder: Oppgaver

Gjøres i rekkefølge, én om gangen. Hver oppgave er ferdig når «Ferdig når» er oppfylt og `npm test`, `npm run lint` og `npm run build` går gjennom. Kryss av når den er ferdig. Nummereringen fortsetter etter T59 i spec 006. T58 og T59 gjøres etter denne spec-en.

## Fase 1 – Data

- [x] **T60 Datamodell, migrering og domene.**
  - `horizon` fjernes fra skjemaene, og `horizonSchema` og typen `Horizon` fjernes.
  - `SCHEMA_VERSION` blir 5, med migreringen `from4to5`, som fjerner `horizon`.
  - Konstantene for «Når?» fjernes fra `scales.ts`.
  - `horizon` fjernes fra testdata.

  (K73)
  *Ferdig når:* tester viser:
  - at versjon 4 med «Når?» blir versjon 5 uten feltet
  - at versjon 1–3 leses uten feil og ender uten «Når?»
  - at versjon 6 avvises
  - at et område er gyldig uten «Når?»

  *Resultat (2026-11-18):*
  - **Skjema:** `horizon`, `horizonSchema` og `Horizon` er fjernet fra `schema.ts`.
  - **Migrering:** `SCHEMA_VERSION` er 5. `from4to5` sletter `horizon` fra områdene. Konstanten for 1 → 2 er flyttet inn i `migrations.ts`.
  - **Avvik: Excel-delen (T62) er gjort her.** Excel-koden bruker samme type for område som datamodellen og ville ikke kompilert uten endringen. Derfor er «Når?» fjernet fra `AREA_SHEET`, og `HORIZON_CHOICES`, `interpretHorizon` og `horizon` i `toWorkbookRows` er fjernet.
  - **Avvik: feltet er tatt ut av `AreasPage`.** Ellers ville listen vist en tom «Når?»-kolonne. Resten av T61 gjenstår (se der).
  - **Tester:**
    - `horizon` er fjernet fra testdata. Testdata er løftet til versjon 5, og tester for ukjent versjon bruker nå 6.
    - Testene for «Når?» (K25) er fjernet eller skrevet om.
    - Nye tester: 4 for migrering fra 4 til 5 (sletting, resten uendret, lagrede data og JSON-import). I tillegg er det 1 Excel-test for en eldre fil med «Når?», og nedtrekkstesten viser at Områder ikke har noen nedtrekksliste.

## Fase 2 – Brukergrensesnitt

- [x] **T61 Områder uten «Når?».**
  - ~~Feltet fjernes fra `AreasPage`.~~ *(Gjort i T60.)*
  - Konstantene `HORIZONS` og `HORIZON_LABELS`, som er merket MIDLERTIDIG, fjernes fra `scales.ts`.
  - Nedtrekksmenyen og nøkkelen `horizon` fjernes fra `ReferenceRegister`.
  - Testene for «Når?» (K25) erstattes av tester for at feltet er borte.

  (K72)
  *Ferdig når:* tester dekker akseptkriteriene «skjemaet har ID, Navn og Beskrivelse» og «listen har ikke Når?». Lagrede data med «Når?» skal vises uten feil, og områdesiden skal være sjekket i nettleseren.

  *Resultat (2026-11-18):*
  - **Fjernet kode:** `HORIZONS`, `HORIZON_LABELS` og den midlertidige typen er fjernet fra `scales.ts`. I `ReferenceRegister` er `input: 'select'`, `options`, `placeholder` og nøkkelen `horizon` fjernet, sammen med nedtrekkskoden i skjema og tabell.
  - **Tester:** 3 nye i `ThemesAndAreasPages.test`:
    - skjemaet har bare ID, Navn og Beskrivelse
    - listen har ikke «Når?»
    - lagrede data i versjon 4 med «Når?» vises uten feil, og neste lagring skriver versjon 5 uten feltet
  - **Sjekket i nettleseren** med data i versjon 4 som har «Når?»:
    - Listen viser ID, Navn, Beskrivelse og Risikoer.
    - Skjemaet har ID, Navn og Beskrivelse.
    - Ingen feil i konsollen.

## Fase 3 – Excel

- [x] **T62 Excel uten «Når?».** *(Gjort sammen med T60, se avviket der.)*
  - Kolonnen fjernes fra `AREA_SHEET`, og `HORIZON_CHOICES` og `interpretHorizon` fjernes.
  - `toWorkbookRows` tilpasses.
  - Excel-testene tilpasses.

  (K74)
  *Ferdig når:* tester dekker akseptkriteriene:
  - eksporten har ID, Navn og Beskrivelse uten nedtrekksliste i Områder
  - en eldre Excel-fil med «Når?» kan importeres

## Fase 4 – Kvalitetssikring

- [x] **T63 Gjennomgang.**
  - Sjekk K72–K74 og akseptkriteriene mot tester og kjørende app, med lagrede data i versjon 4 som har «Når?».
  - Prøv å importere en JSON-eksport fra før endringen.
  - Oppdater statusen i spec og plan, og legg sjekklisten nederst i denne filen.

  (K72–K74)
  *Ferdig når:* alle krav og akseptkriterier er krysset av med henvisning, og avvik er listet.

  *Resultat (2026-11-18):* Se sjekklisten nederst. To små ryddinger er gjort underveis:
  - En test i `DataMenu.test` brukte en feilmelding om «Når?» som ikke lenger kan oppstå. Den er byttet med en melding om et ukjent område på et tema.
  - En overflødig tom linje i `schema.ts` er fjernet.

## Sporbarhet

| Krav | Oppgaver |
|---|---|
| K72 Skjema og liste uten «Når?» | T61 |
| K73 Lagrede verdier slettes; eldre data og JSON leses uten feil | T60 |
| K74 Excel uten «Når?»; eldre filer med kolonnen godtas | T62 |

## Sjekkliste fra gjennomgangen (T63, 2026-11-18)

Hvert krav er sjekket mot automatiske tester og i kjørende app. Appen er åpnet med lagrede data i versjon 4 der områdene har «Når?», og en JSON-eksport i versjon 4 er importert gjennom menyen Importer. Det er 622 tester i alt, og `npm test`, `npm run lint` og `npm run build` går gjennom. Utenfor testene finnes «Når?» nå bare i migreringen (`migrations.ts`) og i kommentaren om versjoner i `schema.ts`.

### Krav

| Krav | Oppfylt | Dekket av |
|---|---|---|
| K72 Skjema og liste for områder uten «Når?» | [x] | `ThemesAndAreasPages.test` (spec 007-blokken); prøvd i nettleser |
| K73 Lagrede verdier slettes; eldre data og JSON leses uten feil | [x] | `migrations.test` (versjon 4 → 5, versjon 1–3, versjon 6 avvises), `ThemesAndAreasPages.test`; prøvd i nettleser med lagrede data og JSON-import |
| K74 Excel uten «Når?»; eldre filer med kolonnen godtas | [x] | `excelFormat.test`, `toWorkbookRows.test`, `writeXlsx.test`, `parseWorkbook.test` (spec 007-blokken) |

### Akseptkriterier

- [x] Skjemaet for nytt område har ID, Navn og Beskrivelse, og ikke «Når?». *(`ThemesAndAreasPages.test`; nettleser.)*
- [x] Områdelisten har ikke kolonnen «Når?». *(`ThemesAndAreasPages.test`; nettleser: ID, Navn, Beskrivelse, Risikoer.)*
- [x] Lagrede data med «Når?» vises uten feil, og neste lagring skriver dem uten feltet. *(`ThemesAndAreasPages.test`, `migrations.test`; nettleser: etter én endring var dataene lagret i versjon 5 uten «Når?», med temaer og risikoer uendret.)*
- [x] En JSON-eksport fra før endringen kan importeres, og områdene har ikke «Når?». *(`migrations.test`; nettleser: «eksport-for-007.json» i versjon 4 ble importert, og området ble lagret uten «Når?».)*
- [x] En Excel-eksport har ID, Navn og Beskrivelse i Områder, uten nedtrekksliste. *(`toWorkbookRows.test`, `writeXlsx.test`.)*
- [x] En eldre Excel-fil med kolonnen «Når?» kan importeres, og kolonnen ignoreres. *(`parseWorkbook.test`.)*

### Avvik og merknader

- **T62 ble gjort sammen med T60,** fordi Excel-koden bruker samme type for område som datamodellen (se T60).
- **Ikke åpnet i ekte Excel ennå.** Eksporten er bare sjekket med tester. Den åpnes i Excel når eksempelfilen lages på nytt i T58 (spec 006).
- **Før publisering:** Teamet bør ta en JSON-sikkerhetskopi før de åpner den nye versjonen, hvis de vil ta vare på «Når?» (plan, risiko ved planen). Eldre Excel-filer kan fortsatt importeres, men ny eksport har ikke kolonnen.
