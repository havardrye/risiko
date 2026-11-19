# 006 – Område på tema

Status: IMPLEMENTERT – alle krav K63–K71 og akseptkriterier er oppfylt (se sjekklisten nederst i `tasks.md`). Venter på godkjenning fra produkteier.
Bygger på: [001-mvp](../001-mvp/spec.md) (K15–K18), [002-excel-import](../002-excel-import/spec.md), [004-egne-id-er](../004-egne-id-er/spec.md) og [005-id-koblinger](../005-id-koblinger/spec.md). Kravnumrene fortsetter etter K62, altså fra K63.

## Formål
Hvert risikotema skal høre til et risikoområde. Temaregisteret får derfor feltene **Område-ID** og **Område**. Man skriver område-ID-en, og områdets navn hentes fra områderegisteret, slik som for risikoer i spec 005.

## Krav

### O. Temaregisteret
- **K63** Et tema har et **område**, som angis med område-ID i et felt med forslagsliste. Feltet virker som ID-feltene i risikoskjemaet (K57, K58): navnet vises ved feltet, ukjent ID gir feil ved feltet, og forslagene søker på både ID og navn. Feltet er påkrevd når et tema opprettes eller endres. *(Beslutning 1.)*
- **K64** Temaer som fantes før denne endringen, har ikke noe område. De godtas uten område til de endres neste gang. Da må et område fylles inn. *(Beslutning 1.)*
- **K65** Er temaet koblet til et område **uten ID** (fra før spec 004), viser feltet for eksempel «IT (mangler ID)». Koblingen beholdes så lenge feltet ikke endres, som i K59.
- **K66** Temalisten viser to nye kolonner etter Navn:
  - **«Område-ID»:** områdets ID, eller «Mangler ID» når området ikke har ID.
  - **«Område»:** områdets navn.

  Temaer uten område viser «Mangler område» i dempet tekst i begge kolonnene. Det gis ikke noe eget varsel om temaer uten område. *(Beslutning 4.)*
- **K67** Koblingen lagres slik at temaet beholder området sitt selv om områdets ID eller navn endres. Dette er samme prinsipp som for risikoer i spec 004.

- **K71** Veiledningen for nye brukere (K22) ber om område **før** tema, fordi et tema må ha et område. Rekkefølgen blir eier, område, tema og så risiko, både i «Kom i gang» og i «Neste steg». *(Følger av K63. Lagt til 2026-11-18 under T56.)*

### P. Sletting
- **K68** Et område som ett eller flere temaer er koblet til, kan ikke slettes. Feilmeldingen viser hvilke temaer det gjelder, og hvilke risikoer det gjelder når risikoer også bruker området. Dette er samme mønster som K18. *(Beslutning 3.)*

### Q. Excel
- **K69** Fanen Temaer får kolonnen **«Område-ID»** etter Navn. Kolonnen er påkrevd. Verdien må være en ID som finnes i fanen Områder. Ellers gir den en feil med fane, rad og kolonne, for eksempel «Temaer, rad 4, Område-ID: Ingen område har ID «O-9» i fanen «Områder»». En fil uten kolonnen avvises med «Kolonnen «Område-ID» mangler». *(Beslutning 5.)*
- **K70** Eksporten skriver også kolonnen **«Område»** med områdets navn, bakerst i Temaer. Den er bare til informasjon og leses ikke ved import. Veiledningen forklarer dette. Malen følger det nye formatet. *(Beslutning 5.)*

**Akseptkriterier**
- Gitt området «O-01 IT», når bruker oppretter temaet «Leverandør» og skriver «o-01» i Område, så vises «IT» ved feltet, og temalisten viser «O-01» og «IT».
- Gitt et nytt tema uten område, når bruker lagrer, så vises «Område er påkrevd» ved feltet, og ingenting lagres.
- Gitt Område-ID «O-9», som ingen har, når bruker lagrer, så vises «Ingen område har ID «O-9».», og ingenting lagres.
- Gitt et tema fra før endringen uten område, så vises «Mangler område» i listen. Når temaet endres, må et område fylles inn.
- Gitt et tema koblet til «IT» uten ID, når temaet endres uten at Område-feltet røres, så beholdes koblingen.
- Gitt at området «O-01» får ny ID «O-1», så viser temalisten «O-1» for temaene i det området.
- Gitt at temaet «Leverandør» er koblet til området «IT», når bruker prøver å slette «IT», så sperres slettingen, og «Leverandør» står i listen over hva som hindrer den.
- Gitt en tom app, når bruker har opprettet en eier, så peker «Neste steg» til Risikoområder, og etter første område til Risikotemaer.
- Gitt en Excel-fil der Temaer har Område-ID «O-9» og ingen område har den ID-en, når bruker importerer, så vises feilen med fane, rad og kolonne, og ingenting endres.
- Gitt en Excel-fil uten kolonnen «Område-ID» i Temaer, når bruker importerer, så vises «Kolonnen «Område-ID» mangler», og ingenting endres.
- Gitt en Excel-eksport, så har Temaer kolonnene Område-ID og bakerst Område. Når filen importeres uendret, er temaene koblet til de samme områdene.

## Avklarte beslutninger
1. **Påkrevd:** Område er påkrevd på nye og endrede temaer. Temaer som fantes fra før, kan mangle område til de endres. Bekreftet 2026-11-18.
2. **Forholdet til risikoer:** Temaets område og risikoens område er **uavhengige**. Risikoen har fortsatt sitt eget område, og ingenting fylles inn eller kontrolleres mot temaet. Bekreftet 2026-11-18.
3. **Sletting:** Et område som temaer bruker, kan ikke slettes. Bekreftet 2026-11-18.
4. **Varsel:** Temaer uten område vises bare som «Mangler område» i temalisten. De nevnes ikke i varselet fra K54, og eksportdialogen advarer ikke om dem. Bekreftet 2026-11-18.
5. **Excel:** Kolonnen «Område-ID» leses ved import, og «Område» med navnet står bakerst til informasjon. Bekreftet 2026-11-18.

## Kjent begrensning
Følger av beslutning 1 og 4: Så lenge et tema mangler område, får det tom Område-ID-celle i Excel-eksporten, og filen kan ikke importeres igjen før cellen er fylt ut. Appen advarer ikke om dette ved eksport. Importen viser feilen med fane og rad.

## Utenfor omfang (006)
- Å fylle inn eller kontrollere risikoens område ut fra temaet (beslutning 2).
- Å filtrere risikoregisteret eller matrisen på temaets område.
- Antall temaer per område i områdelisten.

## Åpne spørsmål
Ingen.
