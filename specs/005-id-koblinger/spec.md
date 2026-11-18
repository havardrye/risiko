# 005 – Koble risikoer til eier, tema og område med ID

Status: IMPLEMENTERT – alle krav K57–K62 og akseptkriterier er oppfylt (se sjekklisten nederst i `tasks.md`). Venter på godkjenning fra produkteier.
Bygger på: [001-mvp](../001-mvp/spec.md), [002-excel-import](../002-excel-import/spec.md) og [004-egne-id-er](../004-egne-id-er/spec.md). Kravnumrene fortsetter etter K56, altså fra K57.

## Formål
En risiko skal vise til sin eier, sitt tema og sitt område med **ID** i stedet for navn, både i skjemaet i appen og i Excel. Navnene hentes fra registrene, med ID som nøkkel. ID-ene er korte og entydige, og de endres sjeldnere enn navn.

## Hva endres
- **Spec 004, beslutning 2 og K52:** I Excel viste Risikoer til eier, tema og område med navn. Det erstattes av ID (K60).
- **Spec 002, fanen Risikoer:** Kolonnene «Eier», «Tema» og «Område» erstattes av «Eier-ID», «Tema-ID» og «Område-ID». Navnene står med som informasjonskolonner ved eksport (K61).
- **Risikoskjemaet (K2 i 001):** Nedtrekkslistene for risikoeier, tema og område erstattes av ID-felt med forslagsliste (K57–K59).

**Uendret:** Koblingen lagres fortsatt med den interne id-en, se spec 004. En risiko beholder derfor eieren sin selv om eierens ID endres. Registeret, matrisen og filtrene viser fortsatt navn.

## Krav

### M. Risikoskjemaet
- **K57** Risikoeier, tema og område angis med **ID** i hvert sitt tekstfelt. Feltene er påkrevd. Navnet til elementet med den ID-en vises rett ved feltet, for eksempel «Kari Nordmann», slik at man ser at det er riktig. ID sammenlignes uten hensyn til store og små bokstaver og mellomrom, som i K48. En ID som ikke finnes, gir feil ved feltet, for eksempel «Ingen risikoeier har ID «E-9».», og ingenting lagres.
- **K58** Mens man skriver, viser hvert felt en **forslagsliste** med elementer der ID eller navn passer, for eksempel «E-01 – Kari Nordmann». Når man velger et forslag, fylles ID-en inn. Man kan også skrive ID-en selv. Listen kan brukes med tastatur og skjermleser. *(Beslutning 3.)*
- **K59** Er risikoen koblet til en eier, et tema eller et område **uten ID** (fra før spec 004), viser feltet navnet med merknaden «(mangler ID)», for eksempel «Kari Nordmann (mangler ID)». Koblingen beholdes når risikoen lagres, så lenge feltet ikke endres. Endres feltet, må det fylles inn en ID som finnes. *(Beslutning 4.)*

### N. Excel
- **K60** I fanen Risikoer erstattes kolonnene «Eier», «Tema» og «Område» av **«Eier-ID»**, **«Tema-ID»** og **«Område-ID»**. Kolonnene er påkrevd. Verdien må være en ID som finnes i fanen Eiere, Temaer eller Områder. Ellers gir den en feil med fane, rad og kolonne, for eksempel «Risikoer, rad 7, Eier-ID: Ingen eier har ID «E-9» i fanen «Eiere»». En fil som har de gamle kolonnene og mangler de nye, avvises med for eksempel «Kolonnen «Eier-ID» mangler». *(Beslutning 1.)*
- **K61** Excel-eksporten skriver i tillegg kolonnene **«Eier»**, **«Tema»** og **«Område»** med navnene, bakerst i Risikoer sammen med Score og Nivå. De er bare til informasjon, og importen leser dem ikke. Veiledningsfanen forklarer dette. *(Beslutning 2.)*
- **K62** Malen, nedtrekkslistene og veiledningen følger det nye formatet. Eier-ID, Tema-ID og Område-ID får ingen nedtrekksliste.

**Akseptkriterier**
- Gitt eieren «E-01 Kari Nordmann», når bruker skriver «e-01» i Risikoeier, så vises «Kari Nordmann» ved feltet, og risikoen lagres med Kari som eier.
- Gitt ID-en «E-9», som ingen eier har, når bruker lagrer, så vises «Ingen risikoeier har ID «E-9».» ved feltet, og ingenting lagres.
- Gitt at bruker skriver «kari» i Risikoeier, så foreslås «E-01 – Kari Nordmann». Når forslaget velges med tastaturet, står «E-01» i feltet.
- Gitt en risiko med eier «Ola» uten ID, når skjemaet åpnes, så viser feltet «Ola (mangler ID)». Når risikoen lagres uten at feltet er endret, er Ola fortsatt eier.
- Gitt at eieren «E-01» får ny ID «E-1», så er eierens risikoer fortsatt koblet til eieren, og skjemaet viser «E-1».
- Gitt en Excel-fil der Risikoer har «E-9» i Eier-ID og ingen eier har den ID-en, når bruker importerer, så vises feilen med fane, rad og kolonne, og ingenting endres.
- Gitt en Excel-fil med kolonnene «Eier», «Tema» og «Område», men uten «Eier-ID» osv., når bruker importerer, så vises «Kolonnen «Eier-ID» mangler», og ingenting endres.
- Gitt en Excel-eksport, så har Risikoer kolonnene Eier-ID, Tema-ID og Område-ID, og bakerst Eier, Tema og Område med navnene. Når filen importeres uendret, er koblingene de samme.

## Avklarte beslutninger
1. **Overskrifter i Excel:** «Eier-ID», «Tema-ID» og «Område-ID». Eldre filer avvises. Bekreftet 2026-11-18.
2. **Navn i Excel-eksporten:** Ja, som informasjonskolonner bakerst. De leses ikke ved import. Bekreftet 2026-11-18.
3. **Forslagsliste i skjemaet:** Ja. Forslagene viser ID og navn, og man kan søke på begge. Bekreftet 2026-11-18.
4. **Elementer uten ID:** Koblingen beholdes til feltet endres. Bekreftet 2026-11-18.
5. **Hvor ID brukes:** Både i skjemaet i appen og i Excel. Bekreftet 2026-11-18.
6. **Hvor navnet hentes inn:** Navnet vises i skjemaet ved ID-feltet. Bekreftet 2026-11-18.

## Utenfor omfang (005)
- Filtrene i registeret og matrisen. De viser fortsatt navn i nedtrekkslistene.
- Formler i Excel som slår opp navn. Navnene skrives som vanlige verdier ved eksport.
- Å endre hvordan koblingen lagres. Den interne id-en brukes fortsatt.

## Åpne spørsmål
Ingen.
