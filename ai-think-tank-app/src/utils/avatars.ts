export const AVATAR_COUNT = 32

export const getAvatarUrl = (index: number): string => {
  const avatarIndex = Math.max(0, Math.min(index, AVATAR_COUNT - 1))
  const paddedIndex = avatarIndex.toString().padStart(3, '0')
  return `/avatars/tile${paddedIndex}.png`
}

export const getAllAvatarUrls = (): string[] => {
  return Array.from({ length: AVATAR_COUNT }, (_, i) => getAvatarUrl(i))
}

export const getRandomAvatarUrl = (): string => {
  const randomIndex = Math.floor(Math.random() * AVATAR_COUNT)
  return getAvatarUrl(randomIndex)
}

const usedAvatarIndices = new Set<number>()

export const getUniqueAvatarUrl = (): string => {
  if (usedAvatarIndices.size >= AVATAR_COUNT) {
    usedAvatarIndices.clear()
  }

  let avatarIndex: number
  do {
    avatarIndex = Math.floor(Math.random() * AVATAR_COUNT)
  } while (usedAvatarIndices.has(avatarIndex))

  usedAvatarIndices.add(avatarIndex)
  return getAvatarUrl(avatarIndex)
}

export const getAvatarIndexFromUrl = (url: string): number => {
  const match = url.match(/tile(\d{3})\.png$/)
  if (match) {
    return parseInt(match[1], 10)
  }
  return 0
}

export const resetUsedAvatars = (): void => {
  usedAvatarIndices.clear()
}