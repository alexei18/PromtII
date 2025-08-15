import { config } from 'dotenv';
config();

// Existing flows
import '@/ai/flows/generate-ai-prompt.ts';
import '@/ai/flows/generate-survey-questions.ts';
import '@/ai/flows/recursive-crawler.ts';
import '@/ai/flows/extract-page-content.ts';
import '@/ai/flows/analyze-website-basics.ts';
import '@/ai/flows/test-prompt.ts';
import '@/ai/flows/generate-persona-card.ts';

// Orchestration flows
import '@/ai/flows/crawl-and-extract-content.ts';
import '@/ai/flows/analyze-website-for-survey.ts';
import '@/ai/flows/quick-scan.ts';