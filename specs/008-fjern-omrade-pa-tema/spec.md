# 008 – Fjern område på tema

Status: IMPLEMENTERT – alle krav K75–K79 og akseptkriterier er oppfylt (se sjekklisten nederst i `tasks.md`). Venter på godkjenning fra produkteier.
Bygger på: [001-mvp](../001-mvp/spec.md) (K16, K18, K22), [002-excel-import](../002-excel-import/spec.md) og [006-omrade-pa-tema](../006-omrade-pa-tema/spec.md). Kravnumrene fortsetter etter K74, altså fra K75.

## Formål
Temaer skal ikke lenger høre til et område. Funksjonen fra spec 006 fjernes helt: fra appen, fra dataene og fra Excel. Temaer og områder blir to uavhengige registre igjen, slik de var før 006. Risikoen har fortsatt sitt eget område, og det endres ikke.

## Hva endres
- **006, alle krav K63–K71:** Kravene oppheves. Spec 006 blir stående som historikk, merket som opphevet av 008.
- **001, K16 og K18:** Temaregisteret har ID, navn og beskrivelse, som før 006. Sletting av et område sperres bare av risikoer.
- **001, K22:** «Kom i gang» og «Neste steg» går tilbake til rekkefølgen før 006.
- **002, fanen Temaer:** Kolonnene «Område-ID» og «Område» fjernes.

## Krav

### S. Temaer uten område
- **K75** Temaskjemaet har ikke lenger feltet Område, og temalisten har ikke lenger kolonnene «Område-ID» og «Område». Et tema har ID, navn og beskrivelse. *(Opphever K63, K65 og K66.)*
- **K76** Et område kan slettes når ingen risikoer bruker det, uansett hvilke temaer som finnes. Sperredialogen viser bare risikoer, som før 006. *(Opphever K68.)*
- **K77** Lagrede koblinger mellom tema og område **slettes** ved overgangen. Data i eldre versjoner leses uten feil, både fra nettleseren og fra JSON-eksporter, og koblingen forkastes. Den finnes da bare i sikkerhetskopier tatt før endringen. *(Beslutning 1. Opphever K64 og K67.)*
- **K78** «Kom i gang» og «Neste steg» ber om eier, tema og område i den rekkefølgen, slik de gjorde før 006. *(Beslutning 2. Opphever K71.)*

### T. Excel
- **K79** Fanen Temaer har bare kolonnene ID, Navn og Beskrivelse. Veiledningen nevner ikke Område-ID i Temaer. Eldre Excel-filer med «Område-ID» og «Område» i Temaer kan likevel importeres. Kolonnene ignoreres der, som andre ukjente kolonner (K26). *(Beslutning 3. Opphever K69 og K70.)*

**Akseptkriterier**
- Gitt skjemaet for nytt tema, så har det feltene ID, Navn og Beskrivelse, og ikke Område.
- Gitt temalisten, så har den ikke kolonnene «Område-ID» og «Område».
- Gitt at temaet «Leverandør» var koblet til området «IT», og ingen risikoer bruker «IT», når bruker sletter «IT», så slettes området.
- Gitt lagrede data der temaer har område, når appen åpnes, så vises temaene uten område, og ingenting avvises. Når data lagres neste gang, er koblingen borte.
- Gitt en JSON-eksport fra før endringen, når den importeres, så går importen gjennom, og temaene har ikke område.
- Gitt en tom app, når bruker har opprettet en eier, så peker «Neste steg» til Risikotemaer, og etter første tema til Risikoområder.
- Gitt en Excel-eksport, så har fanen Temaer kolonnene ID, Navn og Beskrivelse.
- Gitt en eldre Excel-fil med «Område-ID» og «Område» i Temaer, når den importeres, så går importen gjennom, og kolonnene ignoreres. Det gjelder også når Område-ID-en ikke finnes i Områder.

## Avklarte beslutninger
1. **Lagrede koblinger:** slettes. De beholdes ikke skjult i dataene. Bekreftet 2026-11-19.
2. **Rekkefølgen i «Kom i gang»:** tilbake til eier, tema, område. Bekreftet 2026-11-19.
3. **Eldre Excel-filer:** godtas, og kolonnene Område-ID og Område i Temaer ignoreres. Bekreftet 2026-11-19.

## Utenfor omfang (008)
- Risikoens område. Det beholdes som før.
- Andre felt på temaer.

## Åpne spørsmål
Ingen.
