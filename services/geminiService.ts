import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
// Initialize conditionally to prevent crashes if key is missing during dev
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateCongratulation = async (
  personName: string,
  giftNumber: number,
  giftDescription: string
): Promise<string> => {
  if (!ai) {
    return `Congratulations ${personName}! You won Gift #${giftNumber}!`;
  }

  try {
    const prompt = `
      Write a very short, exciting, and funny Christmas-themed congratulatory message (max 2 sentences) for ${personName} who just won Gift Number ${giftNumber}.
      The gift is described as: "${giftDescription}".
      Don't spoil exactly what the gift is if the description is vague, but build hype.
      Use emojis.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || `Hooray! ${personName} got Gift #${giftNumber}! 🎁`;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `Merry Christmas! ${personName} matched with Gift #${giftNumber}! 🎄`;
  }
};
