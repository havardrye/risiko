# 004 – Egne ID-er: Teknisk plan

Status: GJENNOMFØRT (2026-11-18). Beskriver *hvordan* kravene K47–K55 i `spec.md` løses. Bygger på arkitekturen i [001-mvp/plan.md](../001-mvp/plan.md) og [002-excel-import/plan.md](../002-excel-import/plan.md).

Ingen nye avhengigheter.

## Datamodell

Brukerens ID lagres i et nytt felt **`code`**. Den interne `id` beholdes uendret og brukes fortsatt til koblinger, lenker (`?risiko=<id>`) og React-nøkler. I grensesnittet heter feltet «ID».

```ts
interface Owner { id: Id; code?: string; name: string; email?: string }
interface Theme { id: Id; code?: string; name: string; description?: string }
interface Area  { id: Id; code?: string; name: string; description?: string; horizon: Horizon }
interface Risk  { id: Id; code?: string; title: string; /* … som før */ }

interface AppData { schemaVersion: 3; /* … */ }
```

- **I lagret data er `code` valgfri.** Elementer fra før endringen kan mangle den (beslutning 5).
- **I inndataskjemaene er `code` påkrevd.** Det gjelder `…InputSchema`, som brukes av skjemaene i appen og av Excel-importen: `requiredText('ID er påkrevd').max(20, 'ID kan være høyst 20 tegn')` (K47, K48, K50).
- Konsekvensen er at alt som opprettes eller endres, får ID, mens gamle elementer kan ligge uten.

### Skjemaversjon 3

- Migreringen fra versjon 2 til 3 endrer ingen data. Den løfter bare `schemaVersion`.
- **Hvorfor versjonen likevel økes:**
  - Zod fjerner ukjente felt. En eldre versjon av appen ville derfor lese data med ID og fjerne ID-ene uten å si fra når den lagret, for eksempel i en fane som ble åpnet før oppdateringen.
  - Med versjon 3 avviser den eldre appen dataene i stedet («støtter bare versjon 1–2»), slik det er bygget for. Brukeren får beskjed om å laste siden på nytt.
- Eldre JSON-eksporter i versjon 1 og 2 kan importeres som før og får ingen ID-er.

### Regler (domain/rules.ts)

- **`isCodeTaken(items, code, excludeId)`:** fungerer som `isNameTaken`, med samme normalisering (`normalizeName`). Den gjelder innenfor én type (K48).
- **`findIntegrityErrors`:** melder også like ID-er innenfor en type. Det gjelder JSON-import og lesing fra lagring.
- **`findMissingCodes(data)`:** gir elementene uten ID, gruppert per type (K54).

### DataStore

`validateReference` og `validateRisk` sjekker `isCodeTaken` på samme måte som navn. Ved treff kaster de en feltfeil på `code`: «ID-en er allerede i bruk.» (K50).

## Brukergrensesnitt

| Hvor | Endring | Krav |
|---|---|---|
| `RiskForm` | Nytt første felt «ID» (`maxLength` 20). Feil ved feltet, og fokus flyttes dit som for andre felt. | K47, K49, K50 |
| `ReferenceRegister` | ID blir et fast felt foran Navn i skjemaet og første kolonne i tabellen, for alle tre registrene. Konfigurasjonen for registrene endres ikke. | K49, K50 |
| `RiskTable` | Første kolonne «ID», som kan sorteres. | K49, K55 |
| `RiskMatrix` (detaljer og verktøytips) | «R-007 Leverandør går konkurs». Uten ID vises bare tittelen. | K49 |
| Celler uten ID | Teksten «Mangler ID» i dempet farge, også i skjermleserteksten. | K49 |

### Søk og sortering (domain/filters.ts, K55)

- **Søk:** `matchesSearch` søker i ID i tillegg til tittel og beskrivelse.
- **Ny sorteringsnøkkel `'code'`:**
  - Sammenligningen bruker `Intl.Collator('nb', { numeric: true, sensitivity: 'base' })`, så R-2 kommer før R-10.
  - Elementer uten ID havner sist uansett sorteringsretning.
  - Sorteringen holdes i siden, som de andre sorteringene. Den ligger ikke i URL-en. *(Rettet i T41: planen sa først URL, men det har aldri vært slik for sortering.)*

### Elementer uten ID (K54)

- **Varsel:** `MissingCodesNotice` vises under lagringsvarselet når `findMissingCodes` ikke er tom. Teksten er for eksempel «3 risikoer og 1 eier mangler ID», med knappen «Vis».
  - Knappen åpner en liste med lenker, én per element.
  - Risikoer lenker til `#/?risiko=<id>`, som allerede åpner skjemaet.
  - Eiere, temaer og områder lenker til `#/eiere?rediger=<id>` osv. Dette er en ny søkeparameter. `ReferenceRegister` leser den og åpner skjemaet, på samme måte som `RisksPage` gjør med `risiko`.
  - Varselet er en `role="region"` med overskrift og ingen `role="alert"`, så det ikke avbryter skjermlesere ved hver side.
- **Eksportdialogen:** Valget «Excel (for redigering)» får en advarsel under seg når noe mangler ID: «4 elementer mangler ID. Filen kan ikke importeres igjen før de har fått det.» Eksporten er ikke sperret.

## Excel (002)

- **Formatet:** `excelFormat.ts` får kolonnen `{ key: 'code', header: 'ID', required: true, width: 12 }` først i alle fire faner (K51). Import, eksport, mal og veiledning følger automatisk, siden alt leser fra formatbeskrivelsen.
- **Import (`parseWorkbook`):**
  - En fil uten ID-kolonne avvises med «Kolonnen «ID» mangler». Det skjer allerede for påkrevde kolonner (beslutning 6).
  - ID-er som mangler, eller som er for lange, fanges av inndataskjemaene.
  - Like ID-er i samme fane, også i Risikoer, gir feil per rad med henvisning til den andre raden (K53). Dette gjøres ved å gjøre dagens sjekk av like navn generell (`findDuplicates(rows, key, column)`).
- **Eksport (`toWorkbookRows`):** skriver `code`, eller tom celle hvis den mangler (K51).
- **Eksempelfilen:** `eksempler/risikoregister-eksempel.xlsx` lages på nytt med ID-er: R-001…, E-01…, T-01…, O-01… (beslutning 7).

## Teststrategi

- **domain:**
  - skjemaer: ID påkrevd i inndata og valgfri i lagret data, med grense på 20 tegn
  - `isCodeTaken`, like ID-er i `findIntegrityErrors` og `findMissingCodes`
  - søk på ID, og naturlig sortering der elementer uten ID havner sist
- **data:**
  - migrering fra versjon 2 til 3, der dataene er uendret og versjonen er 3
  - eldre versjoner avvises med riktig melding
  - Excel: manglende ID-kolonne, tom ID, for lang ID, like ID-er i hver fane, og rundtur med ID-er
- **state:** like ID-er avvises ved opprettelse og endring. Et gammelt element uten ID kan ikke lagres uten ID.
- **ui:** ett scenario per akseptkriterium i spec 004, axe på varselet og skjemaene, og fokus til ID-feltet ved feil.
- **Eksisterende tester:**
  - Hjelperne som fyller ut skjemaer (`FILL_REQUIRED` og lignende) må fylle inn ID.
  - Testdata trenger ikke ID, fordi den er valgfri i lagret data.
- **Manuelt:** Prøve i nettleseren, og åpne den nye eksempelfilen i Excel.

## Rekkefølge

1. Skjema, migrering til versjon 3 og regler i domenelaget.
2. DataStore: unike ID-er.
3. Skjemaene: ID-feltet i `RiskForm` og `ReferenceRegister`, og `?rediger=` i referanseregistrene.
4. Visning: ID-kolonner, matrisedetaljer og verktøytips, og «Mangler ID».
5. Søk og sortering på ID.
6. Varselet om elementer uten ID, og advarselen i eksportdialogen.
7. Excel: ID-kolonnen, like ID-er og eksempelfilen.
8. Gjennomgang mot akseptkriteriene.

## Risiko ved planen

- **Mange tester berøres,** fordi alle skjemaer får et nytt påkrevd felt. Endringen er mekanisk, men stor. Hjelperne for utfylling samler den.
- **En eldre versjon av appen kan være åpen i en fane:** Versjon 3 gjør at den gamle appen avviser dataene i stedet for å slette ID-ene. Brukeren må laste siden på nytt.
- **Bredde:** Med en ID-kolonne til blir registeret bredere. Den holdes smal (høyst 20 tegn og `nowrap`), og tabellen ruller allerede sidelengs på smale skjermer.
