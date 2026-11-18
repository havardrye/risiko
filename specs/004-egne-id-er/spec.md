# 004 – Egne ID-er

Status: GODKJENT 2026-11-18 av produkteier. Alle krav K47–K55 og akseptkriterier er oppfylt (se sjekklisten nederst i `tasks.md`). Endringer skjer som nye krav eller en ny spec.
Bygger på: [001-mvp](../001-mvp/spec.md) og [002-excel-import](../002-excel-import/spec.md). Kravnumrene fortsetter etter utkastet til 003 (K36–K46), altså fra K47.

## Formål
Teamet vil gi hver risiko, eier, tema og område sin egen ID, for eksempel «R-007» eller «IT-12». Da kan man vise til en risiko kort og entydig i møter, referater og e-post. ID-en vises i appen og står i Excel-filen.

## Begreper
- **ID:** Den brukeren selv skriver inn og ser, for eksempel «R-007». Den kan endres.
- **Intern id:** Appen har allerede en usynlig id som brukes til å koble risikoer til eier, tema og område. Den beholdes uendret. Dermed kan brukerens ID endres uten at koblingene brytes.

## Krav

### K. ID på alle elementer
- **K47** Hver risiko, eier, tema og område har en **ID**. Feltet er påkrevd når et element opprettes eller endres i appen, og ved import fra Excel. *(Avklart beslutning 3.)* Elementer som fantes før denne endringen, kan mangle ID til de endres neste gang. *(Avklart beslutning 5.)*
- **K48** ID er fritekst på høyst 20 tegn, for eksempel «R-007», «IT-12» eller «2026-3». *(Avklart beslutning 8.)* Den må være unik innenfor sin type. To risikoer kan ikke ha samme ID, men en risiko og en eier kan det. Store og små bokstaver og mellomrom før og etter regnes som like, som for navn (K12). *(Avklart beslutning 4.)*
- **K49** ID vises i appen *(avklart beslutning 1)*:
  - som første kolonne i risikoregisteret, og i listene over eiere, temaer og områder
  - foran tittelen i risikolisten når man klikker en celle i matrisen, for eksempel «R-007 Leverandør går konkurs»
  - foran titlene i verktøytipset i matrisen (K24) *(avklart beslutning 8)*
  - i skjemaet for å opprette og endre, som første felt

  Elementer uten ID viser «Mangler ID» i ID-kolonnen.
- **K50** Skjemaet viser feil ved feltet når ID mangler, er lengre enn 20 tegn eller allerede er i bruk, og lagrer ingenting. Dette gjelder på samme måte som for navn (K12).
- **K54** *(Følger av beslutning 5. Bekreftet 2026-11-18, beslutning 9.)* Så lenge noen elementer mangler ID, viser appen hvor mange og hvilke det gjelder, for eksempel «3 risikoer og 1 eier mangler ID». Hver av dem har en lenke til elementet. Excel-eksporten fungerer, men før filen lages, sier appen fra om at den ikke kan importeres igjen før alle har fått ID.
- **K55** Søket i risikoregisteret (K4) finner også ID. Registeret kan sorteres på ID, og sorteringen tar hensyn til tall, så R-2 kommer før R-10. Elementer uten ID sorteres sist. *(Avklart beslutning 8.)*

### L. Excel
- **K51** Hver fane i Excel-formatet (002) får kolonnen **«ID»** først. Kolonnen er påkrevd. Excel-eksporten og malen har den med. Elementer uten ID får tom celle i eksporten.
- **K52** I fanen Risikoer viser Eier, Tema og Område fortsatt til **navn**, som i dag. *(Avklart beslutning 2.)* *(Erstattet av K60 i spec 005.)*
- **K53** Importen kontrollerer ID som andre felt:
  - ID som mangler eller er lengre enn 20 tegn, gir feil med fane, rad og kolonne.
  - Like ID-er i samme fane gir feil på hver rad, med henvisning til den andre raden.
  - En fil uten kolonnen «ID» avvises med «Kolonnen «ID» mangler», også eldre eksporter. *(Avklart beslutning 6.)*

**Akseptkriterier**
- Gitt en ny risiko uten ID, når bruker lagrer, så vises feilen ved ID-feltet, og ingenting lagres.
- Gitt en risiko med ID «R-007», når bruker oppretter en ny risiko med ID «r-007 », så vises feilen om at ID-en er i bruk.
- Gitt en eier og en risiko som begge har ID «7», så godtas det.
- Gitt risikoen «R-007 Leverandør går konkurs», så vises «R-007» i første kolonne i registeret og foran tittelen i matrisedetaljene.
- Gitt at bruker endrer ID-en til en eier fra «E-1» til «E-01», så er eierens risikoer fortsatt koblet til eieren.
- Gitt en Excel-fil der to rader i Risikoer har ID «R-3», når bruker importerer, så vises en feil for begge radene, og ingenting endres.
- Gitt en Excel-eksport der alle elementer har ID, når den importeres uendret, så har alle elementer samme ID som før.
- Gitt data fra før endringen, når appen åpnes, så vises de uten ID («Mangler ID»), og ingenting avvises.
- Gitt en gammel risiko uten ID, når bruker endrer den, så må ID fylles ut før den kan lagres.
- Gitt en Excel-fil uten kolonnen «ID», når bruker importerer, så vises «Kolonnen «ID» mangler», og ingenting endres.
- Gitt risikoene R-10 og R-2, når registeret sorteres på ID, så kommer R-2 først.
- Gitt søket «R-007», så vises risikoen med den ID-en.

## Avklarte beslutninger
1. **Formål:** ID-ene skal vises i appen. Stabile lenker etter import og kobling til andre systemer er ikke mål i denne spec-en. Bekreftet 2026-11-18.
2. **Kobling i Excel:** Risikoer viser til eier, tema og område med navn, som i dag. Bekreftet 2026-11-18. *(Erstattet av [005-id-koblinger](../005-id-koblinger/spec.md), K60: Risikoer viser nå til ID.)*
3. **Påkrevd:** ID må alltid fylles ut, både i Excel og i appen. Appen lager aldri ID-er selv. Bekreftet 2026-11-18.
4. **Regler:** Fritekst, unik innenfor sin type, uten hensyn til store og små bokstaver. Bekreftet 2026-11-18.
5. **Eksisterende data:** Elementer som fantes før endringen, i nettleseren eller i eldre JSON-eksporter, får ingen ID automatisk. De vises uten ID og krever ID først når de endres. Bekreftet 2026-11-18.
6. **Eldre Excel-filer:** Filer uten kolonnen «ID» avvises med «Kolonnen «ID» mangler». Bekreftet 2026-11-18.
7. **Eksempelfilen** (`eksempler/risikoregister-eksempel.xlsx`) lages på nytt med ID-er når endringen er gjort.
8. **Forslag som er tatt med:** søk og sortering på ID (K55), høyst 20 tegn (K48) og ID i verktøytipset (K49). Bekreftet 2026-11-18.
9. **Elementer uten ID (K54):** Appen viser hvilke elementer som mangler ID, og advarer ved Excel-eksport. Bekreftet 2026-11-18.

## Utenfor omfang (004)
- Å bruke ID i lenker eller filtre i adressen. Lenker bruker fortsatt den interne id-en, så de slutter fortsatt å virke etter en Excel-import (se 002).
- Å vise til eier, tema og område med ID i Excel.
- Automatisk nummerering av nye elementer.

## Åpne spørsmål
Ingen.
