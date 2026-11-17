import { z } from 'zod'

/**
 * Skjemaer for alle data i appen. Typene utledes herfra, og de samme
 * skjemaene brukes for skjemavalidering, lesing fra lagring og import.
 *
 * `…InputSchema` er feltene brukeren fyller ut. De fullstendige skjemaene
 * legger til det systemet setter selv (id og datoer).
 */

export const SCHEMA_VERSION = 1

const idSchema = z.string().min(1)

// Samme melding enten feltet mangler helt eller bare inneholder mellomrom.
const requiredText = (message: string) => z.string(message).trim().min(1, message)

const optionalText = z.string().trim().optional()

// --- Referanseregistre ---

export const ownerInputSchema = z.object({
  name: requiredText('Navn er påkrevd'),
  email: z.email('Ugyldig e-postadresse').optional(),
})
export const ownerSchema = ownerInputSchema.extend({ id: idSchema })

export const themeInputSchema = z.object({
  name: requiredText('Navn er påkrevd'),
  description: optionalText,
})
export const themeSchema = themeInputSchema.extend({ id: idSchema })

export const areaInputSchema = z.object({
  name: requiredText('Navn er påkrevd'),
  description: optionalText,
})
export const areaSchema = areaInputSchema.extend({ id: idSchema })

// --- Risiko ---

export const ratingSchema = z.union(
  [z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)],
  'Velg en verdi fra 1 til 5',
)

export const riskTypeSchema = z.enum(['threat', 'opportunity'], 'Velg trussel eller mulighet')

export const riskInputSchema = z.object({
  title: requiredText('Tittel er påkrevd'),
  description: optionalText,
  type: riskTypeSchema,
  ownerId: z.string('Velg en risikoeier').min(1, 'Velg en risikoeier'),
  themeId: z.string('Velg et tema').min(1, 'Velg et tema'),
  areaId: z.string('Velg et område').min(1, 'Velg et område'),
  likelihood: ratingSchema,
  consequence: ratingSchema,
})

export const riskSchema = riskInputSchema.extend({
  id: idSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

// --- Hele datasettet ---

export const appDataSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  owners: z.array(ownerSchema),
  themes: z.array(themeSchema),
  areas: z.array(areaSchema),
  risks: z.array(riskSchema),
})

// --- Typer ---

export type Id = z.infer<typeof idSchema>
export type Rating = z.infer<typeof ratingSchema>
export type RiskType = z.infer<typeof riskTypeSchema>

export type OwnerInput = z.infer<typeof ownerInputSchema>
export type Owner = z.infer<typeof ownerSchema>
export type ThemeInput = z.infer<typeof themeInputSchema>
export type Theme = z.infer<typeof themeSchema>
export type AreaInput = z.infer<typeof areaInputSchema>
export type Area = z.infer<typeof areaSchema>
export type RiskInput = z.infer<typeof riskInputSchema>
export type Risk = z.infer<typeof riskSchema>
export type AppData = z.infer<typeof appDataSchema>

export function emptyAppData(): AppData {
  return { schemaVersion: SCHEMA_VERSION, owners: [], themes: [], areas: [], risks: [] }
}
