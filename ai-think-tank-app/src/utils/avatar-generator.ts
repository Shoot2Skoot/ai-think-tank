import type { Persona } from "@/types";

interface DiceBearOptions {
  seed: string;
  backgroundColor?: string[];
  skinColor?: string[];
  hairColor?: string[];
  eyesColor?: string[];
  glassesColor?: string[];
  accessories?: string[];
  accessoriesColor?: string[];
  hair?: string[];
  mouth?: string[];
  eyes?: string[];
  eyebrows?: string[];
  glasses?: string[];
  flip?: boolean;
}

// Map demographics to DiceBear Miniavs parameters
const mapDemographics = (persona: Persona): Partial<DiceBearOptions> => {
  const options: Partial<DiceBearOptions> = {};

  // Map skin color based on ethnicity
  if (persona.demographics?.ethnicity) {
    const ethnicity = persona.demographics.ethnicity.toLowerCase();
    if (ethnicity.includes("african") || ethnicity.includes("black")) {
      options.skinColor = ["9e7e7e", "8b6f6f", "6f5656"];
    } else if (
      ethnicity.includes("asian") ||
      ethnicity.includes("east asian")
    ) {
      options.skinColor = ["f4c6a8", "e8b89b", "dcaa8f"];
    } else if (ethnicity.includes("hispanic") || ethnicity.includes("latino")) {
      options.skinColor = ["d4a27f", "c79572", "ba8865"];
    } else if (
      ethnicity.includes("middle eastern") ||
      ethnicity.includes("arab")
    ) {
      options.skinColor = ["c79572", "ba8865", "ad7b58"];
    } else if (
      ethnicity.includes("south asian") ||
      ethnicity.includes("indian")
    ) {
      options.skinColor = ["ba8865", "ad7b58", "a06e4b"];
    } else if (ethnicity.includes("white") || ethnicity.includes("caucasian")) {
      options.skinColor = ["f8d5c2", "efc4b1", "e6b3a0"];
    }
  }

  // Map hair color based on demographics
  if (persona.demographics?.age) {
    const age = parseInt(persona.demographics.age);
    if (age > 60) {
      // Gray/white hair for older personas
      options.hairColor = ["9a9a9a", "b3b3b3", "cccccc"];
    } else if (age > 45) {
      // Mix of graying hair
      options.hairColor = ["4a4a4a", "6b6b6b", "8c8c8c"];
    }
  }

  // Add glasses for certain personas based on personality/background
  if (
    persona.personality?.traits?.includes("intellectual") ||
    persona.background?.professional?.includes("researcher") ||
    persona.background?.professional?.includes("professor")
  ) {
    options.glasses = ["square", "round"];
  }

  // Gender-based adjustments
  if (persona.demographics?.gender) {
    const gender = persona.demographics.gender.toLowerCase();
    if (gender === "female" || gender === "woman") {
      options.hair = ["long01", "long02", "long03", "long04", "long05"];
      options.hairColor = options.hairColor || [
        "2c1b18",
        "4a3c3b",
        "6b5d5c",
        "8c7e7d",
        "b89778",
      ];
    } else if (gender === "male" || gender === "man") {
      options.hair = [
        "short01",
        "short02",
        "short03",
        "short04",
        "short05",
        "curly01",
        "curly02",
      ];
      options.hairColor = options.hairColor || [
        "2c1b18",
        "4a3c3b",
        "1a1a1a",
        "3d3d3d",
      ];
    }
  }

  // Don't set background color here - we'll use it as a circular background in the UI
  // This keeps the avatar transparent

  return options;
};

// Generate DiceBear Miniavs URL for a persona
export const generateAvatarUrl = (persona: Persona): string => {
  const baseUrl = "https://api.dicebear.com/9.x/miniavs/svg";

  // Use persona name as seed for consistency
  const seed = encodeURIComponent(persona.name);

  // Get demographic-based options
  const demographicOptions = mapDemographics(persona);

  // Build query parameters
  const params = new URLSearchParams();
  params.append("seed", seed);


    // Default pastel colors if no persona color
  params.append("backgroundColor", "b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf");
  params.append("backgroundType", "solid");

  // Set radius to 10 for rounded corners (controlled from API)
  params.append("radius", "25");

  // Set radius to 10 for rounded corners (controlled from API)
  params.append("scale", "110");

  // Set radius to 10 for rounded corners (controlled from API)

  // Apply gender-based parameters if available
  if (persona.demographics?.gender) {
    const gender = persona.demographics.gender.toLowerCase();
    const age = persona.demographics?.age
      ? parseInt(persona.demographics.age)
      : 30;

    if (gender === "female" || gender === "woman") {
      // Female characteristics for Miniavs
      params.append("hair", "curly,ponyTail,long");
      params.append("mustacheProbability", "0");
      params.append("translateX", "7");
    } else if (gender === "male" || gender === "man") {
      // Male characteristics for Miniavs
      if (age > 50) {
        params.append(
          "hair",
          "balndess,classic01,classic02,elvis,stylish,curly,slaughter"
        );
      } else {
        params.append("hair", "classic01,classic02,elvis,stylish,curly");
      }
      params.append("mustacheProbability", "40");
      params.append("translateX", "2");
    }
  }

  return `${baseUrl}?${params.toString()}`;
};

// For user avatars
export const generateUserAvatarUrl = (name: string = "User"): string => {
  const baseUrl = "https://api.dicebear.com/9.x/miniavs/svg";
  const params = new URLSearchParams();
  params.append("seed", name);
  params.append("backgroundColor", "2563eb"); // Blue background for users
  params.append("backgroundType", "solid");
  params.append("radius", "50"); // Controlled rounding from API

  return `${baseUrl}?${params.toString()}`;
};
