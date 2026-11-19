# 008 – Fjern område på tema: Oppgaver

Gjøres i rekkefølge, én om gangen. Hver oppgave er ferdig når «Ferdig når» er oppfylt og `npm test`, `npm run lint` og `npm run build` går gjennom. Kryss av når den er ferdig. Nummereringen fortsetter etter T63 i spec 007.

## Fase 1 – Data og regler

- [x] **T64 Datamodell, migrering, regler og DataStore.**
  - `areaId` og `themeAreaSchema` fjernes fra temaskjemaene.
  - `SCHEMA_VERSION` blir 6, med migreringen `from5to6`, som fjerner `areaId` fra temaer.
  - `themesReferencing` og integritetsfeilen for temaets område fjernes fra `rules.ts`.
  - DataStore slutter å kontrollere temaets område, sletting av et område sperres bare av risikoer, og `DataError.blockingThemes` fjernes.
  - `areaId` på temaer fjernes fra testdata, og testene fra 006 for dette laget fjernes eller skrives om.

  (K76, K77)
  *Ferdig når:* tester viser:
  - at versjon 5 med område på temaer blir versjon 6 uten feltet, med risikoenes område uendret
  - at versjon 1–4 leses uten feil og ender i versjon 6
  - at versjon 7 avvises
  - at lagrede data og en JSON-eksport i versjon 5 leses uten feil
  - at et tema er gyldig uten område
  - at et område bare temaer var koblet til, kan slettes, og at risikoer fortsatt sperrer sletting

  *Resultat (2026-11-19):*
  - **Skjema:** `areaId` og `themeAreaSchema` er fjernet. Et tema har ID, navn og beskrivelse, og et område som sendes med, forkastes.
  - **Migrering:** `SCHEMA_VERSION` er 6. `from5to6` sletter `areaId` fra temaene. Risikoenes `areaId` er uendret.
  - **Regler og DataStore:** `themesReferencing`, integritetsfeilen for temaets område, kontrollen «Området finnes ikke lenger.» og `DataError.blockingThemes` er fjernet. Sletting av et område sperres bare av risikoer, med meldingen fra før 006.
  - **Avvik: Excel-delen (T66) er gjort her.** Excel-koden bruker samme type for tema som datamodellen og ville ikke kompilert uten endringen. Derfor er dette gjort:
    - Område-ID er fjernet fra `THEME_SHEET`, og `THEME_INFO_COLUMNS` er fjernet.
    - `ThemeRow` og oppslaget av område er fjernet fra `parseWorkbook`.
    - `toWorkbookRows` skriver ikke lenger område for temaer.
    - Linjen om Område-ID i Temaer er fjernet fra veiledningen.
  - **Avvik: deler av T65 er gjort her.**
    - Sperredialogen viser bare risikoer igjen, fordi `blockingThemes` er borte.
    - Feltet Område er tatt ut av `ThemesPage`. Ellers ville skjemaet vist et felt som ikke lagres.
    - `LinkField`, «Kom i gang» og de nye UI-testene gjenstår til T65.
  - **Tester:**
    - Testdata er løftet til versjon 6, og `areaId` er fjernet fra temaene. Tester for ukjent versjon bruker nå 7.
    - Testene for område på tema (006) er fjernet eller skrevet om. Det gjelder `rules`, `schema`, `dataStore`, `parseWorkbook`, temasiden, førstegangsflyten og axe-testen av temaskjemaet.
    - Nye tester:
      - 5 for migrering fra 5 til 6: sletting, risikoene uendret, lagrede data, JSON-import og ukjent område
      - 2 for skjema og 3 for DataStore, blant annet at et område som ingen risikoer bruker, kan slettes
      - 4 for Excel: Temaer uten område, en eldre fil med Område-ID og Område, en ukjent Område-ID, og at veiledningen ikke nevner Område-ID i Temaer
    - Testen av utfylt mal fyller nå ut Temaer og Områder uten de gamle kolonnene.
    - Det er nå 615 tester, mot 622 før. Testene for 006 var flere enn de nye.

## Fase 2 – Brukergrensesnitt

- [x] **T65 Temaregisteret uten område.**
  - Feltet fjernes fra `ThemesPage`.
  - `LinkField`, kolonnene for koblinger og bruken av `CodeCombobox` og `codeReference` fjernes fra `ReferenceRegister`. `CodeCombobox`, `codeReference.ts` og `CodeText` beholdes for risikoskjemaet.
  - Sperredialogen viser bare risikoer igjen.
  - `setupSteps` og «Kom i gang» i `RisksPage` får rekkefølgen eier, tema, område.
  - Testene fra 006 for temaer, førstegangsflyten og axe skrives om.

  (K75, K76, K78)
  *Ferdig når:* tester dekker akseptkriteriene:
  - temaskjemaet har ID, Navn og Beskrivelse
  - temalisten har ikke Område-ID og Område
  - et område som bare et tema var koblet til, kan slettes
  - lagrede data med område på temaer vises uten feil, og neste lagring er uten koblingen
  - «Neste steg» går eier → tema → område

  I tillegg skal axe ikke finne brudd, og temasiden og områdesiden skal være sjekket i nettleseren.

  *Resultat (2026-11-19):*
  - **Registeret:** `LinkField`, `RegisterField`, kolonnene for koblinger og bruken av `CodeCombobox` og `codeReference` er fjernet fra `ReferenceRegister`. Felt utover ID og navn er igjen bare tekstfelt. `CodeCombobox`, `codeReference.ts` og `CodeText` er beholdt for risikoskjemaet.
  - **«Kom i gang»:** `setupSteps` og listen i `RisksPage` har rekkefølgen eier, tema, område. Kommentarene om spec 006 er fjernet.
  - **Gjort i T64:** feltet i `ThemesPage` og sperredialogen med bare risikoer.
  - **Tester:**
    - Førstegangsflyten går eier → tema → område, og listen i «Kom i gang» har samme rekkefølge.
    - 5 nye tester for temasiden: skjemaet har ID, Navn og Beskrivelse, listen har ikke Område-ID og Område, et nytt tema lagres uten område, et område som bare et tema var koblet til i lagrede data i versjon 5, kan slettes, og lagrede temaer med område vises og lagres i versjon 6 uten koblingen.
    - Axe-testen av temaskjemaet fra T64 dekker skjemaet uten område.
    - Det er nå 620 tester.
    - Testarbeiderne gikk tom for minne med standardinnstillingene på denne maskinen. Med `--maxWorkers=2` går alle gjennom.
  - **Nettleser:**
    - Med lagrede data i versjon 5 der temaene har område:
      - Temasiden viser ID, Navn, Beskrivelse og Risikoer uten feil.
      - Skjemaet har ID, Navn og Beskrivelse.
      - Et nytt tema lagres, og dataene skrives i versjon 6 uten område på temaene.
    - På områdesiden kan Økonomi, som bare et tema var koblet til, slettes. Sletting av IT stoppes med risikoen som bruker den.
    - Med tomme data har «Kom i gang» rekkefølgen eier, tema, område. Med bare en eier peker «Neste steg» til temaer.

## Fase 3 – Excel

- [x] **T66 Fanen Temaer uten område.** *(Gjort sammen med T64, se avviket der.)*
  - «Område-ID» fjernes fra `THEME_SHEET`, og `THEME_INFO_COLUMNS` fjernes.
  - `ThemeRow` og oppslaget av område for temaer fjernes fra `parseWorkbook`.
  - `toWorkbookRows` og veiledningen i `writeXlsx` tilpasses.
  - `withCodes` i `parseWorkbook.test` slutter å legge inn Område-ID, og Excel-testene tilpasses.

  (K79)
  *Ferdig når:* tester dekker akseptkriteriene:
  - eksporten har bare ID, Navn og Beskrivelse i Temaer
  - en eldre fil med Område-ID og Område i Temaer kan importeres, også med en ID som ikke finnes

  Veiledningen skal ikke nevne Område-ID i Temaer.
- [x] **T67 Ny eksempelfil.** Lag `eksempler/risikoregister-eksempel.xlsx` på nytt med appens eksport og de samme dataene som i T58. (K79)
  *Ferdig når:* filen kan importeres uten feil i appen, og Excel åpner den uten reparasjon.

  *Resultat (2026-11-19):*
  - **Filen:** Laget med appens egen eksport (`exportExcel`), kjørt i Node. Dataene er de samme som i T58: 5 eiere, 5 temaer, 5 områder og 12 risikoer. De ble lest i versjon 5 og løftet til versjon 6 med appens migrering, så temaene ikke har område.
  - **Import:** Filen importeres uten feil og gir de samme dataene tilbake, sammenlignet uten interne id-er og datoer.
  - **Excel:** Filen åpner uten reparasjon. Den har fanene Veiledning, Risikoer, Eiere, Temaer og Områder, og datafanene er tabeller. Temaer og Områder har ID, Navn og Beskrivelse.
  - **Lagret i Excel:** En kopi der en beskrivelse i Temaer ble endret i Excel og så lagret, importeres uten feil med endringen.
  - **Eldre filer:** Eksporten fra T58, med Område-ID og Område i Temaer, og kopien av den som ble lagret i Excel, importeres fortsatt uten feil.

## Fase 4 – Dokumentasjon og kvalitetssikring

- [x] **T68 Spec-dokumentene.**
  - Spec 006 får statusen «OPPHEVET av 008».
  - Merknadene om 006 i 001 (K16, K18, K22) og 002 (fanen Temaer) oppdateres, så det går fram at 008 har opphevet dem.

  (K75–K79)
  *Ferdig når:* ingen spec beskriver område på tema som gjeldende.

  *Resultat (2026-11-19):*
  - **006:** `spec.md` har statusen «OPPHEVET av 008», med lenke. Den sier at den ble implementert, men aldri godkjent. `plan.md` sier at endringen er tatt bort igjen av 008.
  - **001:**
    - Merknadene ved K16, K18 og K22 sier nå at 006 er opphevet av 008, med kravnumrene K75, K76 og K78.
    - Rekkefølgen i K22 er eier, tema, område.
    - Henvisningen til 006 nederst sier at funksjonen er fjernet igjen av 008.
  - **002:** Merknaden om fanen Temaer sier at kolonnene er fjernet igjen (K79), og at eldre filer fortsatt kan importeres.
  - **Søk:** Ingen andre spec-er eller dokumenter beskriver område på tema som gjeldende. Treffene på «Område-ID» i 005 gjelder fanen Risikoer. 007 nevner 006 bare som historikk.
  - Statusen i spec og plan for 008 settes i T69.
- [x] **T69 Gjennomgang.**
  - Sjekk K75–K79 og akseptkriteriene mot tester og kjørende app, med lagrede data i versjon 5 der temaene har område.
  - Prøv å importere en JSON-eksport og en Excel-fil fra før endringen.
  - Oppdater statusen i spec og plan, og legg sjekklisten nederst i denne filen.

  (K75–K79)
  *Ferdig når:* alle krav og akseptkriterier er krysset av med henvisning, og avvik er listet.

## Sporbarhet

| Krav | Oppgaver |
|---|---|
| K75 Temaskjema og temaliste uten område | T65, T68 |
| K76 Sletting av område sperres bare av risikoer | T64, T65 |
| K77 Lagrede koblinger slettes; eldre data og JSON leses uten feil | T64 |
| K78 «Kom i gang» i rekkefølgen eier, tema, område | T65 |
| K79 Excel-fanen Temaer uten område; eldre filer godtas | T66, T67 |

## Sjekkliste fra gjennomgangen (T69, 2026-11-19)

Hvert krav er sjekket mot automatiske tester og i kjørende app. Appen er åpnet med lagrede data i versjon 5 der temaene har område. En JSON-eksport i versjon 5 og en Excel-fil i formatet fra 006 er importert gjennom menyen Importer. Det er 620 tester i alt, og `npm test`, `npm run lint` og `npm run build` går gjennom. Utenfor testene finnes område på tema nå bare i migreringen (`migrations.ts`) og i kommentaren om versjoner i `schema.ts`.

### Krav

| Krav | Oppfylt | Dekket av |
|---|---|---|
| K75 Temaskjema og temaliste uten område | [x] | `ThemesAndAreasPages.test` (spec 008-blokken), `schema.test`, `accessibility.test`; prøvd i nettleser |
| K76 Sletting av område sperres bare av risikoer | [x] | `dataStore.test`, `rules.test`, `ThemesAndAreasPages.test`; prøvd i nettleser |
| K77 Lagrede koblinger slettes; eldre data og JSON leses uten feil | [x] | `migrations.test` (versjon 5 → 6, versjon 1–4, versjon 7 avvises), `ThemesAndAreasPages.test`; prøvd i nettleser med lagrede data og JSON-import |
| K78 «Kom i gang» i rekkefølgen eier, tema, område | [x] | `FirstUse.test`, `RisksPage.test`; prøvd i nettleser (T65) |
| K79 Excel-fanen Temaer uten område; eldre filer godtas | [x] | `excelFormat.test`, `toWorkbookRows.test`, `writeXlsx.test`, `parseWorkbook.test` (spec 008-blokken); eksempelfilen åpnet i Excel (T67); eldre fil importert i nettleser |

### Akseptkriterier

- [x] Skjemaet for nytt tema har ID, Navn og Beskrivelse, og ikke Område. *(`ThemesAndAreasPages.test`; nettleser.)*
- [x] Temalisten har ikke kolonnene Område-ID og Område. *(`ThemesAndAreasPages.test`; nettleser: ID, Navn, Beskrivelse, Risikoer.)*
- [x] Et område som bare et tema var koblet til, og som ingen risikoer bruker, kan slettes. *(`ThemesAndAreasPages.test`, `dataStore.test`; nettleser: området «Kun tema», koblet til T-05 i lagrede data i versjon 5, ble slettet.)*
- [x] Lagrede data med område på temaer vises uten feil, og neste lagring er uten koblingen. *(`ThemesAndAreasPages.test`, `migrations.test`; nettleser: temasiden viste eksempeldataene uten feil og uten feilmeldinger i konsollen. Etter én sletting var dataene lagret i versjon 6, uten område på noe tema, med alle 12 risikoene.)*
- [x] En JSON-eksport fra før endringen kan importeres, og temaene har ikke område. *(`migrations.test`; nettleser: «eksport-for-008.json» i versjon 5, med område på alle temaene, ble importert med 12 risikoer, 5 eiere, 5 temaer og 5 områder, og ble lagret i versjon 6 uten område på temaene.)*
- [x] Med en tom app peker «Neste steg» til Risikotemaer etter første eier og til Risikoområder etter første tema. *(`FirstUse.test`; nettleser i T65.)*
- [x] En Excel-eksport har ID, Navn og Beskrivelse i Temaer. *(`toWorkbookRows.test`, `writeXlsx.test`; eksempelfilen åpnet i Excel i T67.)*
- [x] En eldre Excel-fil med Område-ID og Område i Temaer kan importeres, og kolonnene ignoreres, også med en Område-ID som ikke finnes. *(`parseWorkbook.test`; nettleser: eksporten fra T58 i formatet fra 006 ble importert uten feil, og temaene ble lagret uten område.)*

### Avvik og merknader

- **T66 og deler av T65 ble gjort i T64.** Excel-koden og registeret bruker samme type for tema som datamodellen og ville ikke kompilert ellers (se T64).
- **Testene kjøres med `--maxWorkers=2` på denne maskinen.** Med standardinnstillingene gikk testarbeiderne tom for minne, uten at noen test feilet.
- **Før publisering:**
  - Teamet bør ta en JSON-sikkerhetskopi før de åpner den nye versjonen, hvis de vil ta vare på hvilket område hvert tema hørte til. Koblingen slettes ved første lagring.
  - Excel-filer eksportert med 006 kan fortsatt importeres. Ny eksport har ikke kolonnene i Temaer.
