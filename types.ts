export interface Person {
  id: number;
  name: string;
  photoUrl: string;
  hasDrawn: boolean;
}

export interface Gift {
  id: number;
  number: number;
  description: string;
  photoUrl: string;
  revealed: boolean;
  ownerId: number | null; // ID of the person who won this gift
}

export enum GameStage {
  IDLE = 'IDLE',
  SELECTING_PERSON = 'SELECTING_PERSON',
  PERSON_SELECTED = 'PERSON_SELECTED', // In this stage, we wait for user to click a gift
  GIFT_REVEALED = 'GIFT_REVEALED',
  FINISHED = 'FINISHED'
}

export interface AppData {
  people: Person[];
  gifts: Gift[];
}
