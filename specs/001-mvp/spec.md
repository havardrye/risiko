# 001 – MVP: Risikoregister og risikomatrise

Status: IMPLEMENTERT – alle krav K1–K25 og akseptkriterier er oppfylt (se sjekklisten nederst i `tasks.md`). Venter på godkjenning fra produkteier, inkludert svar på det åpne spørsmålet om nivånavn for muligheter.

## Formål
Gi et lite team (ca. 10 navngitte personer) ett sted å registrere, vurdere og få oversikt over risiko, både trusler og muligheter, gruppert etter eier, tema og område.

## Utenfor omfang (MVP)
Innlogging, roller/tilgangsstyring, tiltaksoppfølging, restrisiko, endringslogg, rapporter/eksport til PDF, varsler, status på risiko.

## Begreper
- **Risiko:** En usikker hendelse med sannsynlighet og konsekvens. En risiko er enten en **trussel** (negativ konsekvens) eller en **mulighet** (positiv konsekvens).
- **Risikoeier:** Person som er ansvarlig for en risiko.
- **Risikotema:** Tverrgående kategori (f.eks. «Informasjonssikkerhet», «Leverandør»).
- **Risikoområde:** Hvor i virksomheten risikoen hører hjemme (f.eks. avdeling eller prosess).
- **Risikoscore:** sannsynlighet × konsekvens. Brukes til sortering.
- **Nivå:** Bestemmes av cellen i risikomatrisen (se K10), ikke av scoren alene.

### Skalaer

| Verdi | Sannsynlighet | Konsekvens, trussel | Konsekvens, mulighet |
|---|---|---|---|
| 1 | Svært lav | Ubetydelig | Ubetydelig |
| 2 | Lav | Liten | Liten |
| 3 | Moderat | Moderat | Moderat |
| 4 | Høy | Alvorlig | Verdifull |
| 5 | Svært høy | Svært alvorlig | Svært verdifull |

## Brukerhistorier og krav

### A. Risikoregister
- **K1** Bruker kan opprette, vise, endre og slette en risiko.
- **K2** En risiko har: tittel (påkrevd), beskrivelse, type (trussel eller mulighet, påkrevd), risikoeier (påkrevd), tema (ett, påkrevd), område (ett, påkrevd), sannsynlighet (1–5, påkrevd), konsekvens (1–5, påkrevd), opprettet- og sist endret-dato (settes automatisk). Skjemaet viser skalaens tekst sammen med tallet, og konsekvenstekstene følger valgt type.
- **K3** Risikoscore og nivå beregnes automatisk. Nivå vises med tekst og farge.
- **K4** Registeret vises som tabell som kan søkes i (tittel/beskrivelse), filtreres på type, eier, tema, område og nivå, og sorteres på score, tittel og sist endret.
- **K5** Sletting krever bekreftelse.

**Akseptkriterier**
- Gitt at det ikke finnes noe tema, når bruker trykker «Ny risiko», så vises en forklaring med lenke til Risikotemaer, og skjemaet åpnes ikke.
- Gitt gyldig skjema, når bruker lagrer, så vises risikoen i tabellen med riktig score og nivå.
- Gitt manglende påkrevd felt, når bruker lagrer, så vises feilmelding ved feltet og ingenting lagres.
- Gitt filter på eier «X», så vises bare risikoer med eier X.
- Gitt type «mulighet», så viser konsekvensvalget «Verdifull» og «Svært verdifull» for 4 og 5.

### B. Risikomatrise
Referanse: [referanse/risikomatrise.png](referanse/risikomatrise.png).

- **K6** Matrisen har 5 rader (sannsynlighet, 5 øverst) og 10 kolonner (konsekvens). Muligheter ligger til venstre med konsekvens 5→1, trusler til høyre med konsekvens 1→5, slik at de mest betydningsfulle cellene ligger ytterst på hver side. Akser og halvdeler er merket («Mulighet», «Trussel», «Konsekvens», og skalatekstene).
- **K7** Hver celle viser antall risikoer og er fargekodet etter nivå. Nivå formidles også med tekst, ikke bare farge.
- **K8** Klikk på en celle viser risikoene i den cellen, med lenke til hver risiko.
- **K9** Matrisen respekterer de samme filtrene som registeret (type, eier, tema, område, nivå).
- **K10** Nivå bestemmes av denne tabellen, som er felles for matrise og register. Samme tabell gjelder for begge typer; bare navn og farge er ulike.

  | Sannsynlighet ↓ / Konsekvens → | 1 | 2 | 3 | 4 | 5 |
  |---|---|---|---|---|---|
  | **5** | 2 | 2 | 3 | 3 | 3 |
  | **4** | 1 | 2 | 2 | 3 | 3 |
  | **3** | 1 | 2 | 2 | 2 | 3 |
  | **2** | 1 | 1 | 2 | 2 | 2 |
  | **1** | 1 | 1 | 1 | 2 | 2 |

  | Nivå | Trussel | Mulighet |
  |---|---|---|
  | 1 | Lav (grønn) | Liten (lys blå) |
  | 2 | Middels (gul) | Middels (blå) |
  | 3 | Høy (rød) | Stor (mørk blå) |

  Tabellen er lest av referansebildet. Den følger score-grensene 1–4 / 5–12 / 15–25 med ett unntak: sannsynlighet 1 og konsekvens 4 (score 4) er nivå 2.
- **K24** Når pekeren holdes over en celle, eller cellen har tastaturfokus, vises et verktøytips med type, nivå, sannsynlighet og konsekvens (tall og tekst), og titlene på inntil tre risikoer i cellen («og N til» for resten, «Ingen risikoer» for tomme celler). Tipset skal kunne holdes pekeren over uten å forsvinne, skjules med Escape, og holde seg innenfor matrisen (WCAG 1.4.13). *(Lagt til 2026-11-17.)*

**Akseptkriterier**
- Gitt en trussel med sannsynlighet 4 og konsekvens 5, så telles den i trusselhalvdelen i celle (4,5), og cellen er rød.
- Gitt en mulighet med sannsynlighet 4 og konsekvens 5, så telles den i mulighetshalvdelen i cellen lengst til venstre på rad 4, og cellen er mørk blå.
- Gitt en trussel med sannsynlighet 1 og konsekvens 4, så er nivået Middels.
- Gitt valgt tema-filter, så endres antallene i matrisen tilsvarende.
- Gitt to trusler i celle (4,5), når pekeren holdes over cellen, så viser tipset «Trussel · nivå Høy», skalatekstene og begge titlene.
- Gitt et synlig verktøytips, når bruker trykker Escape, så skjules det til pekeren eller fokus flyttes til en celle.

### C. Register over risikoeiere
- **K11** Bruker kan opprette, endre og slette risikoeiere (navn påkrevd, e-post valgfritt).
- **K12** Navn må være unikt.
- **K13** En eier som har risikoer kan ikke slettes; systemet viser hvilke risikoer som hindrer det.
- **K14** Listen viser antall risikoer per eier.

### D. Register over risikotemaer
- **K15** Opprette, endre og slette temaer (navn påkrevd, unikt, beskrivelse valgfritt).
- **K16** Et tema i bruk kan ikke slettes, tilsvarende K13. Listen viser antall risikoer per tema.

### E. Register over risikoområder
- **K17** Opprette, endre og slette områder (navn påkrevd, unikt, beskrivelse valgfritt, «Når?» påkrevd).
- **K25** Hvert område har feltet **«Når?»**, som velges fra en nedtrekksmeny med verdiene «0 - 3 år», «3 - 5 år» og «5 år +». Feltet er påkrevd ved opprettelse og endring, og vises som egen kolonne i områdelisten. Områder som finnes fra før, og områder i eldre eksportfiler, får «0 - 3 år» automatisk (se avklart beslutning 7). *(Lagt til 2026-11-18.)*

**Akseptkriterier (K25)**
- Gitt et nytt område uten valgt «Når?», når bruker lagrer, så vises feilmelding ved feltet og ingenting lagres.
- Gitt et område med «Når?» = «3 - 5 år», så vises «3 - 5 år» i områdelisten.
- Gitt lagrede data eller en eksportfil fra før feltet fantes, når appen leser dem, så får alle områder «0 - 3 år», og ingenting avvises.
- **K18** Et område i bruk kan ikke slettes, tilsvarende K13. Listen viser antall risikoer per område.

### F. Lagring og deling
- **K19** Data lagres lokalt i nettleseren og overlever omstart.
- **K20** Bruker kan eksportere alle data til én JSON-fil og importere den igjen. Import validerer filen og viser feil uten å overskrive eksisterende data.
- **K21** Ved import velger bruker å erstatte alle data (fletting er utenfor MVP).
- **K22** Første gang appen åpnes er den tom, med et tomt register og en veiledning om å opprette eiere, temaer og områder først. Knappen «Ny risiko» vises alltid. Mangler eier, tema eller område, åpner den en forklaring av hva som mangler, med lenker dit, i stedet for skjemaet. *(Endret 2026-11-17: knappen var tidligere skjult til alt fantes, og brukere trodde de ikke kunne legge inn risikoer.)*
- **K23** Appen viser et synlig, men diskret varsel om at data lagres kun i denne nettleseren, med snarvei til eksport.

Import og eksport med Excel er beskrevet i [002-excel-import](../002-excel-import/spec.md) (K26–K35).

## Avklarte beslutninger
1. **Deling:** MVP bruker lokal lagring per nettleser. Delt backend er en senere spec. Derfor skal lagring ligge bak `Repository`-grensesnittet (se constitution). Eksport/import (K20) er eneste måte å dele på i MVP.
2. **Skala og matrise:** 5 sannsynlighetsnivåer, 5 konsekvensnivåer for trussel og 5 for mulighet, med nivåtabellen i K10. Hentet fra referansebildet.
3. **Kobling:** Hver risiko har nøyaktig ett tema og ett område.
4. **Eiere:** Eierlisten er en egen liste, uavhengig av hvem som bruker appen. *(Antatt standard, ikke eksplisitt bekreftet.)*
5. **Status:** Ikke i MVP.
6. **Unntaket i nivåtabellen:** Sannsynlighet 1 med konsekvens 4 er nivå 2, slik referansebildet viser. Bekreftet tilsiktet.
7. **Eksisterende områder og «Når?» (K25):** Områder som mangler feltet, i nettleseren eller i eksportfiler fra før endringen, settes til «0 - 3 år». Bekreftet 2026-11-18. Verdien er en standard, ikke en vurdering, så brukerne bør gå gjennom områdene etterpå.

## Åpne spørsmål
1. **[AVKLARES]** Nivånavnene for muligheter («Liten», «Middels», «Stor») er mitt forslag; referansebildet har bare farger. Har dere egne navn?