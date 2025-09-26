// Manual avatar mapping based on persona characteristics
// Using avatars from /public/avatars/tile000-031.png

interface AvatarMapping {
  keywords: string[]
  avatarIndex: number
}

const avatarMappings: AvatarMapping[] = [
  // Professional/Business avatars
  { keywords: ['ceo', 'executive', 'manager', 'director', 'business', 'corporate'], avatarIndex: 0 },
  { keywords: ['analyst', 'consultant', 'strategist'], avatarIndex: 1 },
  { keywords: ['marketing', 'sales', 'brand'], avatarIndex: 2 },
  { keywords: ['finance', 'accountant', 'banker', 'investor'], avatarIndex: 3 },
  { keywords: ['lawyer', 'legal', 'attorney'], avatarIndex: 4 },

  // Technical avatars
  { keywords: ['developer', 'programmer', 'engineer', 'coding', 'software'], avatarIndex: 5 },
  { keywords: ['designer', 'ux', 'ui', 'creative', 'artist'], avatarIndex: 6 },
  { keywords: ['data', 'scientist', 'researcher', 'analytics'], avatarIndex: 7 },
  { keywords: ['devops', 'sysadmin', 'infrastructure', 'cloud'], avatarIndex: 8 },
  { keywords: ['security', 'cyber', 'hacker'], avatarIndex: 9 },

  // Academic/Educational
  { keywords: ['professor', 'teacher', 'educator', 'academic'], avatarIndex: 10 },
  { keywords: ['student', 'learner', 'junior', 'intern'], avatarIndex: 11 },
  { keywords: ['phd', 'doctor', 'researcher'], avatarIndex: 12 },

  // Creative/Media
  { keywords: ['writer', 'author', 'journalist', 'editor'], avatarIndex: 13 },
  { keywords: ['musician', 'composer', 'artist', 'performer'], avatarIndex: 14 },
  { keywords: ['photographer', 'videographer', 'media'], avatarIndex: 15 },

  // Healthcare/Science
  { keywords: ['doctor', 'physician', 'medical', 'healthcare'], avatarIndex: 16 },
  { keywords: ['nurse', 'caregiver', 'therapist'], avatarIndex: 17 },
  { keywords: ['scientist', 'biologist', 'chemist', 'physicist'], avatarIndex: 18 },

  // Service/Support
  { keywords: ['customer', 'support', 'service', 'help'], avatarIndex: 19 },
  { keywords: ['assistant', 'secretary', 'admin'], avatarIndex: 20 },
  { keywords: ['coach', 'mentor', 'advisor'], avatarIndex: 21 },

  // Specialized roles
  { keywords: ['entrepreneur', 'founder', 'startup'], avatarIndex: 22 },
  { keywords: ['product', 'manager', 'owner'], avatarIndex: 23 },
  { keywords: ['architect', 'planner', 'builder'], avatarIndex: 24 },
  { keywords: ['chef', 'cook', 'culinary'], avatarIndex: 25 },
  { keywords: ['athlete', 'sports', 'fitness', 'trainer'], avatarIndex: 26 },
  { keywords: ['pilot', 'driver', 'captain'], avatarIndex: 27 },

  // Personality-based (for remaining avatars)
  { keywords: ['friendly', 'social', 'outgoing'], avatarIndex: 28 },
  { keywords: ['serious', 'analytical', 'logical'], avatarIndex: 29 },
  { keywords: ['creative', 'innovative', 'visionary'], avatarIndex: 30 },
  { keywords: ['experienced', 'senior', 'veteran', 'expert'], avatarIndex: 31 },
]

export const getAvatarForPersona = (name: string, role?: string, description?: string): string => {
  const searchText = `${name} ${role || ''} ${description || ''}`.toLowerCase()

  // Find the best matching avatar based on keywords
  for (const mapping of avatarMappings) {
    for (const keyword of mapping.keywords) {
      if (searchText.includes(keyword)) {
        const paddedIndex = mapping.avatarIndex.toString().padStart(3, '0')
        return `/avatars/tile${paddedIndex}.png`
      }
    }
  }

  // If no match, use a hash of the name to consistently assign an avatar
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }
  const avatarIndex = Math.abs(hash) % 32
  const paddedIndex = avatarIndex.toString().padStart(3, '0')
  return `/avatars/tile${paddedIndex}.png`
}

// Specific mappings for known personas (can be extended)
export const specificPersonaAvatars: Record<string, number> = {
  // Add specific persona name to avatar index mappings here
  'Alex Chen': 5,  // Developer avatar
  'Sarah Johnson': 2,  // Marketing avatar
  'Dr. Emily Watson': 16,  // Medical avatar
  'Marcus Rodriguez': 7,  // Data scientist avatar
  'Jessica Park': 6,  // Designer avatar
}