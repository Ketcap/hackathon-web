import { customAlphabet } from "nanoid";

const adjectives = [
  "Happy",
  "Clever",
  "Bright",
  "Swift",
  "Calm",
  "Kind",
  "Bold",
  "Wise",
  "Brave",
  "Proud",
  "Pure",
  "Fair",
  "Free",
  "Noble",
  "Warm",
  "Rich",
];

const nouns = [
  "Star",
  "Moon",
  "Sun",
  "Cloud",
  "River",
  "Tree",
  "Bird",
  "Lake",
  "Ocean",
  "Forest",
  "Mountain",
  "Garden",
  "Field",
  "Valley",
  "Sky",
  "Wind",
];

export function generateRoomName(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective} ${noun}`;
}

// Create a custom nanoid with only uppercase letters and numbers
const generateInviteCode = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  6
);

export function generateInvitationCode(): string {
  return generateInviteCode();
}
