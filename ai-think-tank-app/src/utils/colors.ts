const PERSONA_COLORS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#84CC16', // Lime
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#0EA5E9', // Sky
  '#6366F1', // Indigo
  '#A855F7', // Purple
  '#F43F5E', // Rose
  '#FB923C', // Orange
  '#FBBF24', // Amber
]

let usedColorIndices = new Set<number>()

export const getUniqueColor = (): string => {
  if (usedColorIndices.size >= PERSONA_COLORS.length) {
    usedColorIndices.clear()
  }

  let colorIndex: number
  do {
    colorIndex = Math.floor(Math.random() * PERSONA_COLORS.length)
  } while (usedColorIndices.has(colorIndex))

  usedColorIndices.add(colorIndex)
  return PERSONA_COLORS[colorIndex]
}

export const resetUsedColors = (): void => {
  usedColorIndices.clear()
}

export const getRandomColor = (): string => {
  return PERSONA_COLORS[Math.floor(Math.random() * PERSONA_COLORS.length)]
}