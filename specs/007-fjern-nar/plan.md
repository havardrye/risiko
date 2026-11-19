# 007 – Fjern «Når?» fra områder: Teknisk plan

Status: GJENNOMFØRT (2026-11-18). Beskriver *hvordan* kravene K72–K74 i `spec.md` løses.

Ingen nye avhengigheter. Spec 006 er halvveis (T58 og T59 gjenstår). Denne endringen gjøres først, slik at eksempelfilen i T58 bare må lages én gang.

## Datamodell og migrering (K73)

```ts
interface Area { id: Id; code?: string; name: string; description?: string }   // uten horizon
interface AppData { schemaVersion: 5; /* … */ }
```

- **Skjema:** `horizon` fjernes fra `areaInputSchema`, og dermed også fra `areaSchema`. `horizonSchema` og typen `Horizon` fjernes.
- **Migrering:** `from4to5` fjerner `horizon` fra hvert område og løfter versjonen til 5. Zod ville uansett fjernet ukjente felt ved lesing. Migreringen gjør det likevel uttrykkelig, så det er tydelig og testbart at verdiene slettes (beslutning 1).
- **Eldre versjoner:** `from1to2` setter fortsatt «0 - 3 år» på versjon 1-data, men verdien fjernes igjen i 4 → 5. Konstanten den trenger, flyttes inn i `migrations.ts`, siden den ikke lenger hører hjemme i domenet.
- **Lagring:** Lagrede data skrives uten `horizon` neste gang noe lagres. En eldre app avviser versjon 5, slik den er bygget for.

## Domenet

- **`scales.ts`:** `HORIZONS`, `HORIZON_LABELS` og `DEFAULT_HORIZON` fjernes.
- **`excelFormat.ts`:** `HORIZON_CHOICES` og kolonnen «Når?» i `AREA_SHEET` fjernes.

## Brukergrensesnitt (K72)

- **`AreasPage`:** feltet «Når?» fjernes. Områder har da bare beskrivelse som ekstra felt.
- **`ReferenceRegister`:** nedtrekksmenyen (`input: 'select'`, `options`, `placeholder`) og nøkkelen `horizon` brukes ikke lenger av noe register. De fjernes, så det ikke ligger igjen kode som ikke brukes.

## Excel (K74)

- **Fanen Områder:** blir ID, Navn og Beskrivelse, uten nedtrekksliste. Veiledningen lages fra formatet og følger med automatisk.
- **Import:** `parseWorkbook` mister `interpretHorizon` og tolkningen av «Når?». En eldre fil med kolonnen «Når?» importeres uten feil, fordi ukjente kolonner ignoreres (K26).
- **Eksport:** `toWorkbookRows` skriver ikke lenger «Når?».

## Teststrategi

- **Migrering:**
  - Versjon 4 med «Når?» blir versjon 5 uten feltet.
  - Versjon 1, 2 og 3 leses fortsatt uten feil og ender uten «Når?».
  - Versjon 6 avvises.
- **Skjema:** Et område er gyldig uten «Når?». Et område med «Når?» i inndata mister feltet ved lagring.
- **UI:** Skjemaet og listen for områder har ikke «Når?» (akseptkriteriene).
- **Excel:**
  - Eksporten har ikke «Når?» og ingen nedtrekksliste i Områder.
  - En eldre fil med kolonnen «Når?» kan importeres.
- **Eksisterende tester:**
  - `horizon` fjernes fra testdata.
  - Testene som bare gjaldt «Når?» (K25), fjernes eller skrives om til å vise at feltet er borte.
  - Hjelperne i testene slutter å velge «Når?».

## Rekkefølge

1. Datamodell, migrering og domene.
2. UI.
3. Excel.
4. Gjennomgang. Deretter T58 og T59 i spec 006.

## Risiko ved planen

- **Mange tester berøres,** fordi `horizon` står i testdata mange steder. Endringen er mekanisk, og typesjekken finner det som er glemt.
- **Verdiene er borte for godt** når nye data lagres (beslutning 1). Teamet bør få beskjed om å ta en JSON-sikkerhetskopi før de åpner den nye versjonen, hvis de vil ta vare på «Når?».
