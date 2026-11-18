# 002 – Import og eksport med Excel

Status: GODKJENT 2026-11-18 av produkteier. Alle krav K26–K35 og akseptkriterier er oppfylt (se sjekklisten nederst i `tasks.md`). Endringer skjer som nye krav eller en ny spec.
Bygger på: [001-mvp](../001-mvp/spec.md). Kravnumrene fortsetter derfra (K26–).

## Formål
Teamet har risikoer, eiere, temaer og områder i Excel og vil fortsette å bruke Excel. Det skal være mulig å lese disse tabellene inn i appen uten å skrive JSON eller legge dem inn for hånd.

## Foreslått metode
Én Excel-arbeidsbok (`.xlsx`) med fire faner, én for hvert register. Hver fane har én tabell med faste kolonneoverskrifter på første rad. Bruker velger filen under «Data» i appen. Appen leser filen lokalt i nettleseren, kontrollerer alt og viser et sammendrag. Først når bruker bekrefter, tas dataene i bruk.

Risikoer peker på eier, tema og område **med navn**, ikke med id. Navnene er allerede unike (K12, K15, K17), så det er entydig, og det er slik man naturlig skriver det i Excel.

Appen tilbyr en nedlastbar **mal** med riktige faner og kolonner, nedtrekkslister der verdiene er faste, og en kort veiledning.

### Faner og kolonner

Fanenavn og overskrifter må være som under. Rekkefølgen på kolonnene er fri, og store/små bokstaver og mellomrom før og etter ignoreres. Kolonner appen ikke kjenner, ignoreres (de kan brukes til egne notater).

**Fane «Eiere»**
| Kolonne | Påkrevd | Innhold |
|---|---|---|
| Navn | ja | Unikt |
| E-post | nei | Gyldig e-postadresse |

**Fane «Temaer»**
| Kolonne | Påkrevd | Innhold |
|---|---|---|
| Navn | ja | Unikt |
| Beskrivelse | nei | |

**Fane «Områder»**
| Kolonne | Påkrevd | Innhold |
|---|---|---|
| Navn | ja | Unikt |
| Når? | ja | «0 - 3 år», «3 - 5 år» eller «5 år +» |
| Beskrivelse | nei | |

**Fane «Risikoer»**
| Kolonne | Påkrevd | Innhold |
|---|---|---|
| Tittel | ja | |
| Beskrivelse | nei | |
| Type | ja | «Trussel» eller «Mulighet» |
| Eier | ja | Navn som finnes i fanen «Eiere» |
| Tema | ja | Navn som finnes i fanen «Temaer» |
| Område | ja | Navn som finnes i fanen «Områder» |
| Sannsynlighet | ja | Tall 1–5 |
| Konsekvens | ja | Tall 1–5 |

Score, nivå og datoer står ikke i Excel. Appen beregner score og nivå (K3) og setter opprettet- og endret-dato til importtidspunktet.

## Krav

### G. Import fra Excel
- **K26** Bruker kan velge en `.xlsx`-fil og importere eiere, temaer, områder og risikoer fra fanene og kolonnene beskrevet over.
- **K27** Filen leses og kontrolleres i nettleseren. Ingen data sendes ut av nettleseren (constitution).
- **K28** Hele filen kontrolleres før noe tas i bruk. Er det feil, importeres ingenting, og appen viser en liste over feilene med fane, radnummer (slik Excel viser det), kolonne og hva som er galt. Eksempel: «Risikoer, rad 7, Eier: «Ola Nordman» finnes ikke i fanen Eiere».
- **K29** Kontrollen omfatter: påkrevde felt, gyldige verdier (type, «Når?», tall 1–5, e-post), unike navn innenfor hver fane, og at hver risiko peker på en eier, et tema og et område som finnes. Navn sammenlignes uten hensyn til store/små bokstaver og mellomrom før og etter.
- **K30** Tomme rader hoppes over. En fane som mangler, eller mangler en påkrevd kolonne, gir en tydelig feil.
- **K31** Uten feil viser appen et sammendrag (antall eiere, temaer, områder og risikoer i filen og hva som skjer med dataene som finnes) før bruker bekrefter. Bruker kan avbryte uten at noe endres.
- **K32** Importen erstatter alle data i appen, som JSON-import (K21). Sammendraget (K31) sier tydelig at alt som finnes i appen nå, blir erstattet, med antallet som forsvinner, og foreslår å eksportere en sikkerhetskopi først (se avklart beslutning 1).
- **K33** Bruker kan laste ned en tom mal med de fire fanene, riktige overskrifter, nedtrekkslister for Type, «Når?», Sannsynlighet og Konsekvens, og en fane med veiledning.
- **K34** JSON-eksport og -import (K20) fortsetter som før og er fortsatt måten å ta full sikkerhetskopi på.
- **K35** Bruker kan eksportere alle data til en `.xlsx`-fil i samme format som importen, med samme nedtrekkslister og veiledning som malen (K33). Filen kan redigeres i Excel og importeres igjen. Score og nivå kan tas med som ekstra kolonner til informasjon; de ignoreres ved import (K26).

**Akseptkriterier**
- Gitt en gyldig fil med 3 eiere, 2 temaer, 2 områder og 10 risikoer, når bruker importerer og bekrefter, så vises de 10 risikoene i registeret med riktig score og nivå, og de kan filtreres på eier, tema og område.
- Gitt en risiko med eier «Ola Nordman» som ikke finnes i fanen «Eiere», når bruker velger filen, så vises feilen med fane, rad og kolonne, og ingenting endres.
- Gitt to rader med samme navn i fanen «Temaer», så vises en feil for begge radene.
- Gitt «Når?» = «2 år» i fanen «Områder», så vises en feil som lister de lovlige verdiene.
- Gitt overskriften «e-post » med liten forbokstav og mellomrom, så leses kolonnen som «E-post».
- Gitt en fil uten fanen «Risikoer», så vises feilen «Fanen «Risikoer» mangler».
- Gitt et gyldig sammendrag, når bruker trykker «Avbryt», så er dataene uendret.
- Gitt 5 risikoer i appen og en fil med 3, når bruker importerer og bekrefter, så har appen nøyaktig de 3 risikoene fra filen, og sammendraget sa på forhånd at 5 risikoer ville bli erstattet.
- Gitt malen fra K33, når den fylles ut og importeres, så går importen gjennom uten feil.
- Gitt data i appen, når bruker eksporterer til Excel og importerer filen uendret, så er eiere, temaer, områder og risikoer de samme som før (unntatt opprettet- og endret-dato, som ikke er med i Excel).

## Utenfor omfang (002)
- Eldre Excel-format (`.xls`), CSV og Google Sheets direkte.
- Automatisk synkronisering med en Excel-fil på delt disk eller i SharePoint/OneDrive.
- Import av bare én fane alene, og fletting med data som finnes (beslutning 1).

## Avklarte beslutninger
1. **Erstatt alt (K32):** Excel-importen erstatter alle data i appen, som JSON-import. Excel er «fasiten»: man retter i Excel og importerer på nytt. Risikoer som bare finnes i appen, forsvinner. Bekreftet 2026-11-18.

2. **Eksport til Excel (K35):** Appen kan eksportere alle data til en Excel-fil i samme format, slik at Excel og appen kan holdes like (rundtur). Bekreftet 2026-11-18.
3. **Format:** Det finnes ingen eksisterende regneark som må støttes. Fanene og kolonnene over gjelder. Bekreftet 2026-11-18.
4. **Ukjent eier, tema eller område (K29):** gir feil, og ingenting importeres. Appen oppretter dem ikke automatisk, for å unngå dubletter fra skrivefeil. Bekreftet 2026-11-18.

## Åpne spørsmål
Ingen.
