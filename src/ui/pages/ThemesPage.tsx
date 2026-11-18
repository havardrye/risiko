import { ReferenceRegister, type ReferenceRegisterConfig } from '../components/ReferenceRegister.tsx'
import { ROUTES } from '../routes.ts'

const CONFIG: ReferenceRegisterConfig = {
  kind: 'theme',
  title: ROUTES.themes.label,
  intro:
    'Tverrgående kategorier, for eksempel «Informasjonssikkerhet» eller «Leverandør». Hver risiko har ett tema.',
  singular: 'tema',
  definite: 'temaet',
  createLabel: 'Nytt tema',
  emptyText: 'Ingen risikotemaer er registrert ennå. Opprett det første med «Nytt tema».',
  fields: [{ key: 'description', label: 'Beskrivelse', input: 'textarea' }],
}

export function ThemesPage() {
  return <ReferenceRegister config={CONFIG} />
}
