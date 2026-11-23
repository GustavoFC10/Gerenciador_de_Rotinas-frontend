import { PROCESS_SECTORS, type ProcessNoteInput } from '../types/processes'

export function normalizeProcessNotes(notes: readonly ProcessNoteInput[] = []) {
  return notes.map(({ text, visibleToSectors }, index): ProcessNoteInput => {
    const position = index + 1
    const content = text.trim()
    if (!content || content.length > 5000)
      throw new Error(
        `Escreva a observação ${position} com até 5000 caracteres.`,
      )
    if (
      !visibleToSectors.length ||
      visibleToSectors.some((sector) => !PROCESS_SECTORS.includes(sector))
    )
      throw new Error(
        `Selecione ao menos um departamento válido para a observação ${position}.`,
      )
    return {
      text: content,
      visibleToSectors: PROCESS_SECTORS.filter((sector) =>
        visibleToSectors.includes(sector),
      ),
    }
  })
}
