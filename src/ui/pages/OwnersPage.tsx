import { ReferenceRegister, type ReferenceRegisterConfig } from '../components/ReferenceRegister.tsx'
import { ROUTES } from '../routes.ts'

const CONFIG: ReferenceRegisterConfig = {
  kind: 'owner',
  title: ROUTES.owners.label,
  intro: 'Personene som er ansvarlige for risikoer. Hver risiko har én eier.',
  singular: 'risikoeier',
  definite: 'risikoeieren',
  createLabel: 'Ny risikoeier',
  emptyText: 'Ingen risikoeiere er registrert ennå. Opprett den første med «Ny risikoeier».',
  extra: { key: 'email', label: 'E-post', input: 'email' },
}

export function OwnersPage() {
  return <ReferenceRegister config={CONFIG} />
}
