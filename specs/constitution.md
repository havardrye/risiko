# Prosjektprinsipper (constitution)

Gjelder for alle endringer i dette prosjektet. Endres bare bevisst og med begrunnelse.

## Arbeidsmåte
1. **Spesifikasjon først.** Ingen funksjon implementeres uten en spesifikasjon i `specs/<nr>-<navn>/spec.md` med akseptkriterier. Endrede krav oppdateres i spesifikasjonen før koden.
2. **Spec beskriver hva og hvorfor, plan beskriver hvordan.** Teknologivalg hører hjemme i `plan.md`, ikke i `spec.md`.
3. **Små oppgaver.** Implementering skjer fra `tasks.md`, én oppgave om gangen, hver sporbar til et krav (K-nummer).
4. **Uavklarte punkter merkes `[AVKLARES]`** og må løses før planen låses.

## Teknisk
- React + TypeScript (strict), Vite.
- Test med Vitest og React Testing Library. Domenelogikk (f.eks. risikoscore) er rene funksjoner med enhetstester.
- All data valideres ved lesing fra lagring og ved import.
- Lagring er skjult bak et grensesnitt (`Repository`), slik at lokal lagring kan byttes mot backend senere uten å røre UI.
- Ingen innlogging eller tilgangsstyring i omfang.

## Kvalitet
- Norsk (bokmål) i brukergrensesnittet. Kode og identifikatorer på engelsk.
- Universell utforming: tastaturnavigasjon, kontrast, og matrisen skal ikke kun bruke farge for å formidle nivå (vis også tall/tekst).
- Ingen data forlater nettleseren.
