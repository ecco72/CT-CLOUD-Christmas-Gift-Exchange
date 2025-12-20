// OFFLINE VERSION: No API Key required.
// We use a local template system instead of Gemini AI.

const TEMPLATES = [
  "恭喜 {name}！你抽到了 {number} 號禮物！",
  "哇！{name} 拆開了 {number} 號禮物，希望你會喜歡！🎁",
  "聖誕快樂，{name}！{number} 號禮物是你的了！🎄",
  "Ho Ho Ho! {name} 選中了 {number} 號禮物！🎅",
  "看哪！{name} 把 {number} 號禮物帶回家了！",
  "太驚喜了！{number} 號禮物現在屬於 {name}！",
  "今天 {name} 的幸運數字是 {number} 號！享受你的禮物吧！",
  "選得好啊 {name}！{number} 號禮物看起來很棒！✨"
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