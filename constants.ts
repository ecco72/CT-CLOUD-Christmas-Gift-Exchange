import { Person, Gift } from './types';

const TOTAL_PARTICIPANTS = 45;

export const INITIAL_PEOPLE: Person[] = Array.from({ length: TOTAL_PARTICIPANTS }, (_, i) => ({
  id: i + 1,
  name: `員工 ${i + 1}`,
  hasDrawn: false,
}));

export const INITIAL_GIFTS: Gift[] = Array.from({ length: TOTAL_PARTICIPANTS }, (_, i) => ({
  id: i + 1,
  number: i + 1,
  // Placeholder description. Admin should fill these out.
  description: `神秘禮物 #${i + 1} - 裡面會有什麼驚喜呢？`,
  revealed: false,
  ownerId: null,
}));
