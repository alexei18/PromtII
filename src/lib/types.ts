import { z } from 'zod';

export const SurveyOptionSchema = z.object({
  text: z.string().describe('The text content of the option.'),
  icon: z.string().optional().describe('A relevant icon name from the lucide-react library for the option.'),
});

export type SurveyOption = z.infer<typeof SurveyOptionSchema>;

export const SurveyQuestionSchema = z.object({
  category: z.string().describe('The category of the question (e.g., Core Objective, Personality).'),
  question: z.string().describe('The tailored survey question.'),
  options: z.array(SurveyOptionSchema).describe('An array of multiple-choice options for the question.'),
  icon: z.string().optional().describe('A relevant icon name from the lucide-react library for the question itself.'),
  allowMultiple: z.boolean().default(false).describe('Whether multiple options can be selected for this question.'),
});

export type SurveyQuestion = z.infer<typeof SurveyQuestionSchema>;

export const WebsiteAnalysisSchema = z.object({
  industry: z.string().describe('The specific industry of the business.'),
  targetAudience: z.string().describe('The likely target audience for the business.'),
  toneOfVoice: z.string().describe('The detected tone of voice from the website content.'),
});

export type WebsiteAnalysis = z.infer<typeof WebsiteAnalysisSchema>;

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const PersonaCardDataSchema = z.object({
  name: z.string().describe("The AI assistant's name."),
  personality: z.string().describe('A short summary of the AI personality.'),
  objective: z.string().describe('The main goal of the AI assistant.'),
  keyRules: z.array(z.string()).describe('A list of 3-4 most important rules.'),
});

export type PersonaCardData = z.infer<typeof PersonaCardDataSchema>;
