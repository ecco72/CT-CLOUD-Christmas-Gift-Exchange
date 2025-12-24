import { Person, Gift } from './types';

const TOTAL_PARTICIPANTS = 45;

const EMPLOYEE_NAMES = [
  "員工1", "員工2", "員工3", "員工4", "員工5",
  "員工6", "員工7", "員工8", "員工9", "員工10",
  "員工11", "員工12", "員工13", "員工14", "員工15",
  "員工16", "員工17", "員工18", "員工19", "員工20",
  "員工21", "員工22", "員工23", "員工24", "員工25",
  "員工26", "員工27", "員工28", "員工29", "員工30",
  "員工31", "員工32", "員工33", "員工34", "員工35",
  "員工36", "員工37", "員工38", "員工39", "員工40",
  "員工41", "員工42", "員工43", "員工44", "員工45"
];

export const INITIAL_PEOPLE: Person[] = EMPLOYEE_NAMES.map((name, index) => ({
  id: index + 1,
  name: name,
  hasDrawn: false,
}));

export const INITIAL_GIFTS: Gift[] = Array.from({ length: TOTAL_PARTICIPANTS }, (_, i) => {
  const number = i + 1;
  const prefix = number <= 38 ? "禮物" : "神秘禮物";
  return {
    id: number,
    number: number,
    // Placeholder description. Admin should fill these out.
    description: `${prefix} #${number} - 裡面會有什麼驚喜呢？`,
    revealed: false,
    ownerId: null,
  };
});
