# 008 – Fjern område på tema: Teknisk plan

Status: GJENNOMFØRT (2026-11-19). Beskriver *hvordan* kravene K75–K79 i `spec.md` løses.

Ingen nye avhengigheter. Endringen tar bort det spec 006 la til, men den kan ikke gjøres som en ren tilbakeføring i git. Spec 007 er bygget oppå 006 og skal beholdes. Commit `34858c2` viser koden slik den var før 006, og den brukes som fasit der det passer.

## Datamodell og migrering (K77)

```ts
interface Theme { id: Id; code?: string; name: string; description?: string }   // uten areaId
interface AppData { schemaVersion: 6; /* … */ }
```

- **Skjema:** `areaId` og `themeAreaSchema` fjernes fra `themeInputSchema` og `themeSchema`. Risikoens `areaId` er uendret.
- **Migrering:** `from5to6` fjerner `areaId` fra hvert tema og løfter versjonen til 6. Zod ville uansett fjernet ukjente felt ved lesing. Migreringen gjør det likevel uttrykkelig, så det er tydelig og testbart at koblingene slettes (beslutning 1).
- **Ny versjon** er nødvendig, selv om feltet bare forsvinner. Ellers ville en app med versjon 5 lese dataene og godta temaene uten område, uten å vite at koblingene er slettet med vilje. En eldre app avviser versjon 6, slik den er bygget for.
- **Eldre versjoner:** `from3to4` løfter fortsatt bare versjonen. Versjon 1–5 ender i versjon 6 uten `areaId` på temaer.

## Domenet og DataStore (K76, K77)

- **`rules.ts`:**
  - `themesReferencing` fjernes.
  - `findIntegrityErrors` slutter å melde temaer som viser til et område som ikke finnes.
- **`dataStore.ts`:**
  - Kontrollen av temaets område («Området finnes ikke lenger.») fjernes.
  - Sletting av et område sperres bare av risikoer, med meldingen fra før 006.
  - `DataError.blockingThemes` fjernes.

## Brukergrensesnitt (K75, K76, K78)

- **`ThemesPage`:** feltet Område fjernes. Temaer har da bare beskrivelse som ekstra felt.
- **`ReferenceRegister`:**
  - `LinkField` (`input: 'reference'`) brukes ikke lenger av noe register og fjernes. Det samme gjelder koden for to kolonner per felt og bruken av `CodeCombobox` og `codeReference` i registeret.
  - Sperredialogen viser bare risikoer, uten overskriftene Risikoer og Temaer. `usageText` fjernes eller forenkles.
- **Beholdes:** `CodeCombobox`, `codeReference.ts` og `CodeText` brukes fortsatt av risikoskjemaet (spec 005) og blir stående.
- **`setupSteps.ts` og «Kom i gang» i `RisksPage`:** rekkefølgen blir eier, tema og område igjen. Kommentaren om spec 006 fjernes.

## Excel (K79)

- **`excelFormat.ts`:**
  - Kolonnen «Område-ID» fjernes fra `THEME_SHEET`.
  - `THEME_INFO_COLUMNS` fjernes. `INFO_COLUMNS` beholdes, men gjelder da bare Risikoer, så `writeXlsx` slipper særregler.
- **`parseWorkbook.ts`:**
  - `ThemeRow` og oppslaget av områder for temaer fjernes. Temaene leses med `themeInputSchema` direkte.
  - Rekkefølgen der områder bygges før temaer, er ikke lenger nødvendig, men kan beholdes. Unngåelsen av følgefeil (`rejected.areas`) beholdes der den brukes for risikoer.
  - En eldre fil med «Område-ID» og «Område» i Temaer importeres uten feil, fordi ukjente kolonner ignoreres (K26). Det gjelder også ugyldige verdier i kolonnene.
- **`toWorkbookRows.ts`:** skriver ikke lenger Område-ID og Område for temaer.
- **`writeXlsx.ts`:** linjen om Område-ID i Temaer fjernes fra veiledningen, og linjen om informasjonskolonner nevner bare Risikoer.
- **Eksempelfilen:** `eksempler/risikoregister-eksempel.xlsx` lages på nytt med appens eksport.

## Spec-dokumentene

- **006:** Statusen settes til «OPPHEVET av 008». Kravene blir stående som historikk.
- **001 og 002:** Merknadene om 006 ved K16, K18 og K22 og i fanen Temaer oppdateres, så det går fram at 008 har opphevet dem.

## Teststrategi

- **Migrering:**
  - Versjon 5 med `areaId` på temaer blir versjon 6 uten feltet. Risikoenes område er uendret.
  - Versjon 1–4 leses fortsatt og ender i versjon 6.
  - Versjon 7 avvises.
  - Lagrede data og en JSON-eksport i versjon 5 leses uten feil.
- **Skjema:** Et tema er gyldig uten område, og `areaId` i inndata forkastes.
- **DataStore:** Sletting av et område som bare temaer var koblet til, går gjennom. Sletting sperres fortsatt av risikoer.
- **UI:**
  - Temaskjemaet og temalisten har ikke Område.
  - Sperredialogen viser bare risikoer.
  - «Neste steg» går eier → tema → område.
  - axe finner ingen brudd.
- **Excel:**
  - Eksporten har bare ID, Navn og Beskrivelse i Temaer.
  - En eldre fil med Område-ID og Område i Temaer, også med en ukjent ID, kan importeres.
  - Veiledningen nevner ikke Område-ID i Temaer.
- **Eksisterende tester:** Testene fra 006 fjernes eller skrives om til å vise at funksjonen er borte. `withCodes` i `parseWorkbook.test` slutter å legge inn Område-ID. `areaId` på temaer fjernes fra testdata.

## Rekkefølge

1. Datamodell, migrering, domene og DataStore.
2. UI.
3. Excel og eksempelfil.
4. Spec-dokumentene og gjennomgang.

## Risiko ved planen

- **Mange tester berøres,** fordi testdataene fikk `areaId` på temaer i 006. Endringen er mekanisk, og typesjekken finner det som er glemt.
- **Koblingene er borte for godt** når nye data lagres (beslutning 1). Teamet bør få beskjed om å ta en JSON-sikkerhetskopi før de åpner den nye versjonen, hvis de vil ta vare på dem.
- **Excel-filer eksportert med 006** kan fortsatt importeres. Filer eksportert etter 008 kan derimot ikke leses av en app med versjon 5, fordi den krever Område-ID i Temaer. Det spiller ingen rolle så lenge alle bruker den publiserte appen.
