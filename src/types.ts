export type TextSourceType = 'quran' | 'hadith' | 'sahaba' | 'tabiin' | 'salaf';

export interface TextCard {
  id: string;
  type: TextSourceType;
  source: string; // Surah & Ayah OR Hadith Narrator
  originalText: string;
  quranKey?: string; // e.g. "2:255" for Quran texts
  simpleExplanation: string;
  additionToTopic: string;
}

export interface TopicAnalysis {
  topic: string;
  overallPicture: string;
  cards: TextCard[];
  mindmap: { mainIdea: string; subIdeas: string[] }[];
  summary: string[];
  finalWisdom: string;
}

export interface AppSettings {
  geminiApiKey: string;
  quranClientId: string;
  quranClientSecret: string;
}
