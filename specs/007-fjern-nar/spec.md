# 007 – Fjern «Når?» fra områder

Status: IMPLEMENTERT – alle krav K72–K74 og akseptkriterier er oppfylt (se sjekklisten nederst i `tasks.md`). Venter på godkjenning fra produkteier.
Bygger på: [001-mvp](../001-mvp/spec.md) (K17, K25), [002-excel-import](../002-excel-import/spec.md) og [006-omrade-pa-tema](../006-omrade-pa-tema/spec.md). Kravnumrene fortsetter etter K71, altså fra K72.

## Formål
Feltet «Når?» på risikoområder (K25) brukes ikke lenger og skal fjernes helt: fra appen, fra dataene og fra Excel.

## Hva endres
- **001, K25 og avklart beslutning 7:** Kravet om «Når?» oppheves.
- **001, K17:** «Når?» er ikke lenger påkrevd på områder.
- **002, fanen Områder:** Kolonnen «Når?» og nedtrekkslisten for den fjernes.

## Krav

### R. Områder uten «Når?»
- **K72** Skjemaet for områder og områdelisten har ikke lenger «Når?». Et område har ID, navn og beskrivelse, som før K25. *(Opphever K25.)*
- **K73** Verdiene som allerede er lagret i «Når?», **slettes** ved overgangen. Data i eldre versjoner leses uten feil, både fra nettleseren og fra JSON-eksporter, og «Når?» forkastes. Verdiene finnes da bare i sikkerhetskopier som er tatt før endringen. *(Beslutning 1.)*
- **K74** Excel-fanen Områder har ikke lenger kolonnen «Når?» eller nedtrekkslisten for den, og veiledningen nevner den ikke. Eldre Excel-filer som har kolonnen, kan likevel importeres. Kolonnen ignoreres der, som andre ukjente kolonner (K26).

**Akseptkriterier**
- Gitt skjemaet for nytt område, så har det feltene ID, Navn og Beskrivelse, og ikke «Når?».
- Gitt områdelisten, så har den ikke kolonnen «Når?».
- Gitt lagrede data der områdene har «Når?», når appen åpnes, så vises områdene uten «Når?», og ingenting avvises. Når data lagres neste gang, er «Når?» borte.
- Gitt en JSON-eksport fra før endringen, når den importeres, så går importen gjennom, og områdene har ikke «Når?».
- Gitt en Excel-eksport, så har fanen Områder kolonnene ID, Navn og Beskrivelse, og ingen nedtrekksliste.
- Gitt en eldre Excel-fil med kolonnen «Når?» i Områder, når den importeres, så går importen gjennom, og «Når?» ignoreres.

## Avklarte beslutninger
1. **Gamle verdier:** Lagrede «Når?»-verdier slettes. De beholdes ikke skjult i dataene. Bekreftet 2026-11-18.

## Utenfor omfang (007)
- Andre felt på områder.

## Åpne spørsmål
Ingen.
