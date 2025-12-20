// OFFLINE VERSION: No API Key required.
// We use a local template system instead of Gemini AI.

const TEMPLATES = [
  "Congratulations {name}! You got Gift #{number}!",
  "Wow! {name} unpacked Gift #{number}. Hope you like it! 🎁",
  "Merry Christmas, {name}! Gift #{number} is all yours! 🎄",
  "Ho Ho Ho! {name} has chosen Gift #{number}! 🎅",
  "Look at that! {name} goes home with Gift #{number}!",
  "What a surprise! Gift #{number} belongs to {name} now!",
  "{name}'s lucky number is #{number} today! Enjoy the gift!",
  "Nice choice {name}! Gift #{number} looks interesting! ✨"
];

export const generateCongratulation = async (
  personName: string,
  giftNumber: number,
  giftDescription: string
): Promise<string> => {
  // Simulate a small delay to feel like "thinking" or processing
  await new Promise(resolve => setTimeout(resolve, 600));

  const randomIndex = Math.floor(Math.random() * TEMPLATES.length);
  const template = TEMPLATES[randomIndex];

  return template.replace("{name}", personName).replace("{number}", giftNumber.toString());
};
