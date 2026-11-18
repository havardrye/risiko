import { HORIZON_LABELS, HORIZONS } from '../../domain/scales.ts'
import { ReferenceRegister, type ReferenceRegisterConfig } from '../components/ReferenceRegister.tsx'
import { ROUTES } from '../routes.ts'

const CONFIG: ReferenceRegisterConfig = {
  kind: 'area',
  title: ROUTES.areas.label,
  intro:
    'Hvor i virksomheten risikoen hører hjemme, for eksempel en avdeling eller en prosess. Hver risiko har ett område.',
  singular: 'område',
  definite: 'området',
  createLabel: 'Nytt område',
  emptyText: 'Ingen risikoområder er registrert ennå. Opprett det første med «Nytt område».',
  fields: [
    {
      key: 'horizon',
      label: 'Når?',
      input: 'select',
      required: true,
      placeholder: 'Velg når',
      options: HORIZONS.map((value) => ({ value, label: HORIZON_LABELS[value] })),
    },
    { key: 'description', label: 'Beskrivelse', input: 'textarea' },
  ],
}

export function AreasPage() {
  return <ReferenceRegister config={CONFIG} />
}
