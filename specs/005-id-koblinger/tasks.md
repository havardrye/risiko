# 005 – Koble risikoer med ID: Oppgaver

Gjøres i rekkefølge, én om gangen. Hver oppgave er ferdig når «Ferdig når» er oppfylt og `npm test`, `npm run lint` og `npm run build` går gjennom. Kryss av når den er ferdig. Nummereringen fortsetter etter T47 (K56 i 001).

## Fase 1 – Oppslag

- [x] **T48 Oppslag på ID.** `findByCode(items, code)` i `domain/rules.ts`. ID-er sammenlignes med `normalizeName`, og elementer uten ID blir aldri funnet. (K57, K60)
  *Ferdig når:* tester viser at «e-01 » finner «E-01», at en ukjent ID gir `undefined`, og at et element uten ID ikke finnes, heller ikke med tom tekst.

  *Resultat (2026-11-18):* `findByCode` i `domain/rules.ts`. Tom tekst eller tekst med bare mellomrom gir alltid `undefined`. Det finnes ikke delvis treff, så «E-1» finner ikke «E-10». 3 nye tester i `rules.test`.

## Fase 2 – Feltet med forslag

- [x] **T49 `CodeCombobox`.** Lag en ny komponent etter WAI-ARIA-mønsteret «Combobox with listbox popup»:
  - tekstfelt med forslagsliste
  - filtrering på ID og navn, med høyst 8 forslag sortert naturlig etter ID
  - tastatur: piler, Enter, Escape og Tab
  - klikk på forslag
  - navnet på elementet som passer, under feltet, koblet med `aria-describedby`
  - plass til feilmelding, slik som i `FormField`

  (K57, K58)
  *Ferdig når:* komponenttester dekker:
  - filtrering på ID og på navn
  - at elementer uten ID ikke foreslås
  - tastaturet og klikk
  - at `aria-expanded`, `aria-activedescendant` og `aria-selected` stemmer
  - at navnet står i beskrivelsen
  - axe med listen både lukket og åpen

  *Resultat (2026-11-18):*
  - **Komponenten:** `ui/components/CodeCombobox.tsx` med egen CSS. Forslagslogikken (`suggestionsFor`, `MAX_SUGGESTIONS`, `CodeOption`) ligger i `ui/codeSuggestions.ts`, fordi komponentfiler bare skal eksportere komponenter.
  - **Tastatur:**
    - Pil ned og pil opp markerer forslag og går rundt.
    - Enter velger det markerte forslaget og sender ikke skjemaet. Er ingenting markert, sendes skjemaet som vanlig.
    - Escape lukker listen uten å lukke dialogen, men bare mens listen er åpen.
    - Tab lukker listen uten å velge.
  - **Mus:** Klikk velger forslaget og beholder fokus i feltet.
  - **Navnet:** Navnet til ID-en som passer, står under feltet. Det legges til `aria-describedby`, etter eventuell feilmelding.
  - **Tester:** 14 nye, blant dem axe med listen lukket og åpen. Regelen «region» er slått av i denne testen, fordi komponenten vises uten sidens landemerker.
  - **Utseendet** sjekkes i nettleseren i T50, når feltet er tatt i bruk i skjemaet.

## Fase 3 – Risikoskjemaet

- [x] **T50 ID-felt i `RiskForm`.**
  - Nedtrekkslistene for risikoeier, tema og område erstattes av `CodeCombobox`.
  - ID-en gjøres om til intern id ved lagring, med feltfeilene «… er påkrevd» og «Ingen risikoeier har ID «X».» (og tilsvarende for tema og område).
  - Elementer uten ID vises som «Navn (mangler ID)», og koblingen beholdes så lenge feltet ikke endres.
  - De eksisterende testene får en hjelper som skriver ID i stedet for `selectOptions`. Testdata som brukes til å opprette risikoer, får ID-er.

  (K57, K59)
  *Ferdig når:* tester dekker akseptkriteriene:
  - «e-01» viser Kari og lagres
  - «E-9» gir feil
  - «kari» foreslår «E-01 – Kari Nordmann», som kan velges med tastaturet
  - «Ola (mangler ID)» beholdes
  - ny eier-ID vises i skjemaet

  Fokus skal gå til første felt med feil.

  *Resultat (2026-11-18):*
  - **Feltene:** Risikoeier, Tema og Område bruker `CodeCombobox`, med navnet under feltet.
  - **Ved lagring:** `resolveReference` gjør ID om til intern id og gir feilene «… er påkrevd» og «Ingen … har ID «X».».
  - **Alle feil samtidig:** Feil i koblingene vises sammen med de andre feilene i skjemaet. Skjemaet sender til lagring med tomme koblinger, og lagringen avviser uten å lagre.
  - **Elementer uten ID (K59):** Feltet viser «Navn (mangler ID)», og koblingen beholdes så lenge feltet ikke endres.
  - **Tillegg:** Den gamle teksten markeres når feltet får fokus (`selectOnFocus`), så det man skriver, erstatter den. Ellers ble det for eksempel «Per uten ID (mangler ID)x».
  - **Eksisterende tester:** De skriver nå ID i stedet for å velge fra en liste. Testdataene har fått ID-er. Testen «lister eierne alfabetisk» er erstattet av en test av forslagene, som er sortert etter ID.
  - **Tester:** 7 nye i `RiskForm.test`.
  - **Sjekket i nettleseren med ekte tastatur:**
    - «ola», pil ned og Enter ga «E-02» med «Ola Åsen» under feltet. Tab gikk til Tema.
    - Første Escape lukket listen, og andre Escape lukket dialogen.
    - «Per uten ID (mangler ID)» ble vist og markert ved fokus.
    - Ingen feil i konsollen.

## Fase 4 – Excel

- [x] **T51 Nye kolonner i Excel.**
  - `excelFormat.ts`: «Eier-ID», «Tema-ID» og «Område-ID», og informasjonskolonnene Eier, Tema og Område bakerst.
  - `parseWorkbook`: oppslag med `findByCode`, feilen «Ingen eier har ID «E-9» i fanen «Eiere»», og `rejected.codes` for å unngå følgefeil.
  - `toWorkbookRows`: ID-er i ID-kolonnene og navn i informasjonskolonnene.
  - Veiledningen oppdateres.
  - Excel-testene tilpasses.

  (K60, K61, K62)
  *Ferdig når:* tester dekker akseptkriteriene:
  - «E-9» i Eier-ID gir feil med fane, rad og kolonne
  - en gammel fil gir «Kolonnen «Eier-ID» mangler»
  - eksporten har ID-kolonnene og navnene bakerst, og rundturen beholder koblingene

  I tillegg skal en utfylt mal kunne importeres, og ID-kolonnene skal ikke ha nedtrekksliste.

  *Resultat (2026-11-18):*
  - **Formatet:** I Risikoer heter kolonnene nå «Eier-ID», «Tema-ID» og «Område-ID», med bredde 12. `RISK_INFO_COLUMNS` er Score, Nivå, Eier, Tema og Område.
  - **Import:**
    - `parseWorkbook` slår opp med `findByCode`.
    - Feilmeldingen er «Ingen eier har ID «E-9» i fanen «Eiere»» i kolonnen «Eier-ID».
    - En tom celle gir «Eier-ID er påkrevd».
    - `rejected.names` er blitt `rejected.codes`.
  - **Eksport:** `toWorkbookRows` skriver ID-ene, eller tom celle hvis den mangler, og navnene i informasjonskolonnene.
  - **Veiledningen:** De to reglene er oppdatert.
  - **Tester:**
    - I `parseWorkbook.test` bytter hjelperen `withCodes` nå også navn i Eier-ID, Tema-ID og Område-ID ut med ID-ene fra de andre fanene. Testradene kan da skrives med navn. Ukjente verdier blir stående.
    - De andre Excel-testene har fått nye overskrifter og ID-er.
    - 5 nye tester: gammel fil gir tre «Kolonnen … mangler», navn godtas ikke som ID, informasjonskolonnene ignoreres, ID-kolonnene har ingen nedtrekksliste, og veiledningen er riktig.
- [x] **T52 Ny eksempelfil.** Lag `eksempler/risikoregister-eksempel.xlsx` på nytt med appens egen eksport. (K60, K61)
  *Ferdig når:* filen kan importeres uten feil i appen, og Excel åpner den uten reparasjon.

  *Resultat (2026-11-18):*
  - **Filen:** laget på nytt med de samme dataene som i T45. Risikoer har nå ID-ene i Eier-ID, Tema-ID og Område-ID, og navnene bakerst.
  - **Import:** Appens import leser filen uten feil. Koblingene er kontrollert, for eksempel er R-007 koblet til E-04, T-02 og O-01.
  - **Excel:** Excel 16 åpner filen uten reparasjon. Rad 1 i Risikoer er «ID | Tittel | Beskrivelse | Type | Eier-ID | Tema-ID | Område-ID | Sannsynlighet | Konsekvens | Score | Nivå | Eier | Tema | Område».

## Fase 5 – Kvalitetssikring

- [x] **T53 Gjennomgang.**
  - Sjekk hvert krav K57–K62 og hvert akseptkriterium mot tester og kjørende app, også med data i versjon 2 uten ID.
  - Prøv skjemaet bare med tastatur.
  - Prøv det med en skjermleser hvis det er mulig.
  - Åpne eksempelfilen i Excel.
  - Oppdater statusen i spec og plan, og legg sjekklisten nederst i denne filen.

  (K57–K62)
  *Ferdig når:* alle krav og akseptkriterier er krysset av med henvisning, og avvik er listet. Det skal også stå om testen med skjermleser ble gjort.

## Sporbarhet

| Krav | Oppgaver |
|---|---|
| K57 ID-felt i skjemaet med navnet ved feltet | T48, T49, T50 |
| K58 Forslagsliste, med tastatur og skjermleser | T49, T50 |
| K59 Elementer uten ID beholder koblingen | T50 |
| K60 Eier-ID, Tema-ID og Område-ID i Excel | T48, T51, T52 |
| K61 Navn som informasjonskolonner i eksporten | T51, T52 |
| K62 Mal, nedtrekkslister og veiledning følger formatet | T51 |

## Sjekkliste fra gjennomgangen (T53, 2026-11-18)

Hvert krav er sjekket mot automatiske tester og i kjørende app. Det er brukt data i versjon 2 uten ID-er, og skjemaet er prøvd med ekte tastatur. Eksempelfilen er åpnet i Excel 16. Det er 586 tester i alt, og `npm test`, `npm run lint` og `npm run build` går gjennom.

### Krav

| Krav | Oppfylt | Dekket av |
|---|---|---|
| K57 ID-felt for eier, tema og område, med navnet ved feltet og feil for ukjent eller manglende ID | [x] | `rules.test` (`findByCode`), `CodeCombobox.test`, `RiskForm.test`, `RisksPage.test`; prøvd i nettleser |
| K58 Forslagsliste på ID og navn, med tastatur og skjermleser | [x] | `CodeCombobox.test` (tastatur, ARIA, axe), `RiskForm.test`; prøvd med ekte tastatur |
| K59 Elementer uten ID beholder koblingen til feltet endres | [x] | `RiskForm.test`; prøvd i nettleser med data i versjon 2 |
| K60 Eier-ID, Tema-ID og Område-ID i Excel, slått opp på ID; gamle filer avvises | [x] | `parseWorkbook.test`, `index.test`, `readXlsx.test`; eksempelfilen importert i nettleser |
| K61 Navnene som informasjonskolonner bakerst i eksporten | [x] | `excelFormat.test`, `toWorkbookRows.test`, `writeXlsx.test`; sett i Excel |
| K62 Mal, nedtrekkslister og veiledning følger formatet | [x] | `writeXlsx.test` (ingen nedtrekksliste på ID-kolonnene, veiledningen) |

### Akseptkriterier

| Akseptkriterium | Oppfylt | Dekket av |
|---|---|---|
| «e-01» viser «Kari Nordmann», og risikoen lagres med Kari | [x] | `RiskForm.test` («e-2 » → Ola); i nettleser «t-01» → «Leverandør» |
| «E-9» → «Ingen risikoeier har ID «E-9».», ingenting lagres | [x] | `RiskForm.test`; i nettleser «kari» → «Ingen risikoeier har ID «kari».» |
| «kari» foreslår «E-01 – Kari Nordmann», som kan velges med tastaturet | [x] | `CodeCombobox.test`, `RiskForm.test`; i nettleser «ola», pil ned og Enter → «E-02» |
| «Ola (mangler ID)» beholdes ved lagring uten endring | [x] | `RiskForm.test`; i nettleser beholdt «Gammel risiko» o1/t1/a1 |
| Ny eier-ID vises i skjemaet, og koblingen beholdes | [x] | `RiskForm.test`, `OwnersPage.test` |
| «E-9» i Eier-ID i Excel → feil med fane, rad og kolonne | [x] | `parseWorkbook.test` |
| Gammel Excel-fil → «Kolonnen «Eier-ID» mangler» | [x] | `parseWorkbook.test` (alle tre kolonnene meldes) |
| Eksporten har ID-kolonnene og navnene bakerst, og rundturen beholder koblingene | [x] | `toWorkbookRows.test`, `writeXlsx.test`; eksempelfilen (R-007 → E-04, T-02, O-01) |

### Gjennomgang i nettleseren

1. **Gamle data:** Data i versjon 2 uten ID ble lest. «Gammel risiko» viste «Kari Nordmann (mangler ID)», «Leverandør (mangler ID)» og «IT (mangler ID)». Den ble lagret med ny risiko-ID «R-1» og beholdt koblingene.
2. **Ny risiko før noen har ID:** «kari» ga ingen forslag, og lagring ga «Ingen risikoeier har ID «kari».»
3. **ID-er via lenker:** Eiere, tema og område fikk ID-er via lenkene `?rediger=`.
4. **Ny risiko bare med tastatur:**
   - Tastene: ID, Tab, Tittel, tre ganger Tab til Risikoeier, «ola», pil ned og Enter, Tab, «t-01», Tab, «O-01», piltaster i Sannsynlighet og Konsekvens, Tab til Lagre og Enter.
   - Resultat: Risikoen ble lagret med Ola, Leverandør og IT, og registeret viser «3x4=12».
5. **Eksempelfilen:** Den ble importert med 12 risikoer. Registeret viser R-007 med Per Johansen, Leverandør og IT og digitalisering.
6. **Konsollen:** Ingen feil. Testdataene er fjernet etterpå.

### Universell utforming

- **Tastatur:** Hele skjemaet kan fylles ut uten mus. Fokusrekkefølgen følger skjemaet. Første Escape lukker listen, og andre Escape lukker dialogen.
- **ARIA:** Feltet følger WAI-ARIA-mønsteret for combobox (`aria-expanded`, `aria-controls`, `aria-activedescendant` og `aria-selected`). Navnet og feilen er koblet til feltet med `aria-describedby`.
- **axe:** Ingen brudd, verken med listen lukket eller åpen (`CodeCombobox.test`). De eksisterende axe-testene for skjema og sider går også gjennom.
- **Skjermleser:** Ikke prøvd med en ekte skjermleser (NVDA eller Skjermleser i Windows), fordi det ikke lar seg gjøre i dette oppsettet. **Bør gjøres av en person før godkjenning.**

### Avvik og valg som bør bekreftes

- **Ny risiko etter oppdateringen:** Brukere med gamle data kan ikke opprette nye risikoer før minst én eier, ett tema og ett område har fått ID. Varselet fra spec 004 viser hva som mangler. Det bør sies til teamet ved publisering.
- **Tillegg i T50:** Teksten «Navn (mangler ID)» markeres når feltet får fokus, så det man skriver, erstatter den.
- **Eldre Excel-filer kan ikke importeres:** Det gjelder også eksempelfilen fra spec 004. Man må eksportere på nytt fra appen.
- **Størrelse:** Hovedfilen har gått fra 126,4 til 127,5 kB gzip.

