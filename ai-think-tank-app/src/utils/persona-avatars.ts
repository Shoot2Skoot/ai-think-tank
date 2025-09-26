// Manual avatar assignments for specific personas
// Using avatars from /public/avatars/tile000-031.png

export const personaAvatarMap: Record<string, string> = {
  // Manually assign avatars to specific persona names
  'Alex Chen': '/avatars/tile005.png',           // Developer looking avatar
  'Sarah Johnson': '/avatars/tile002.png',       // Professional female avatar
  'Dr. Emily Watson': '/avatars/tile016.png',    // Medical/academic avatar
  'Marcus Rodriguez': '/avatars/tile007.png',    // Data scientist avatar
  'Jessica Park': '/avatars/tile006.png',        // Creative/designer avatar
  'Michael Thompson': '/avatars/tile000.png',    // Business executive
  'David Kim': '/avatars/tile008.png',           // Tech/engineer avatar
  'Rachel Green': '/avatars/tile003.png',        // Marketing professional
  'James Wilson': '/avatars/tile001.png',        // Senior consultant
  'Maria Garcia': '/avatars/tile004.png',        // Finance professional
  'Robert Brown': '/avatars/tile009.png',        // Security expert
  'Jennifer Lee': '/avatars/tile010.png',        // Teacher/educator
  'Chris Martinez': '/avatars/tile011.png',      // Student/junior
  'Amanda White': '/avatars/tile012.png',        // Researcher
  'Daniel Taylor': '/avatars/tile013.png',       // Writer/journalist
  'Lisa Anderson': '/avatars/tile014.png',       // Artist/creative
  'Kevin Moore': '/avatars/tile015.png',         // Photographer
  'Patricia Thomas': '/avatars/tile017.png',     // Healthcare worker
  'Brian Jackson': '/avatars/tile018.png',       // Scientist
  'Nancy Harris': '/avatars/tile019.png',        // Customer service
  'Steven Clark': '/avatars/tile020.png',        // Assistant/admin
  'Karen Lewis': '/avatars/tile021.png',         // Coach/mentor
  'Joseph Walker': '/avatars/tile022.png',       // Entrepreneur
  'Betty Hall': '/avatars/tile023.png',          // Product manager
  'Richard Allen': '/avatars/tile024.png',       // Architect
  'Sandra Young': '/avatars/tile025.png',        // Chef/culinary
  'Mark King': '/avatars/tile026.png',           // Athlete/fitness
  'Dorothy Wright': '/avatars/tile027.png',      // Pilot/captain
  'Paul Lopez': '/avatars/tile028.png',          // Friendly/social
  'Helen Hill': '/avatars/tile029.png',          // Analytical
  'Gary Scott': '/avatars/tile030.png',          // Creative/innovative
  'Ruth Adams': '/avatars/tile031.png',          // Senior expert
}

export const getPersonaAvatar = (name: string): string => {
  // Return manually assigned avatar or fallback to a default
  return personaAvatarMap[name] || '/avatars/tile000.png'
}

// List of all available personas (for showing in offline section)
export const allAvailablePersonas = Object.keys(personaAvatarMap)