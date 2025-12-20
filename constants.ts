import { Person, Gift } from './types';

// CONFIGURATION:
// In a real scenario, you could replace these generator functions with a hardcoded array
// JSON import that the admin staff prepared.

const TOTAL_PARTICIPANTS = 45;

export const INITIAL_PEOPLE: Person[] = Array.from({ length: TOTAL_PARTICIPANTS }, (_, i) => ({
  id: i + 1,
  name: `Employee ${i + 1}`,
  // Placeholder image. Replace with real employee photos.
  // e.g. "https://company-drive.com/photos/john_doe.jpg"
  photoUrl: `https://picsum.photos/seed/person${i + 1}/200/200`,
  hasDrawn: false,
}));

export const INITIAL_GIFTS: Gift[] = Array.from({ length: TOTAL_PARTICIPANTS }, (_, i) => ({
  id: i + 1,
  number: i + 1,
  // Placeholder description. Admin should fill these out.
  description: `Mystery Gift #${i + 1} - A wonderful surprise awaits!`,
  // Placeholder gift image.
  photoUrl: `https://picsum.photos/seed/gift${i + 1}/300/300`,
  revealed: false,
  ownerId: null,
}));
