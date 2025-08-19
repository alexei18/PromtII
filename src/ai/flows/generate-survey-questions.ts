'use server';

/**
 * @fileOverview A flow that generates tailored survey questions based on crawled website content.
 *
 * - generateTailoredSurveyQuestions - A function that generates a survey with tailored questions and options.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { SurveyQuestion } from '@/lib/types';
import { SurveyQuestionSchema } from '@/lib/types';


const GenerateTailoredSurveyQuestionsInputSchema = z.object({
  crawledText: z.string().describe('The crawled text content and analysis from the website.'),
  analysis: z.object({
    industry: z.string(),
    targetAudience: z.string(),
    toneOfVoice: z.string(),
  }).describe('User-confirmed analysis of the website.'),
});
export type GenerateTailoredSurveyQuestionsInput = z.infer<typeof GenerateTailoredSurveyQuestionsInputSchema>;

const GenerateTailoredSurveyQuestionsOutputSchema = z.object({
  questions: z.array(SurveyQuestionSchema).describe('An array of 10-20 tailored survey questions with options.'),
});
export type GenerateTailoredSurveyQuestionsOutput = z.infer<typeof GenerateTailoredSurveyQuestionsOutputSchema>;

export async function generateTailoredSurveyQuestions(
  input: GenerateTailoredSurveyQuestionsInput
): Promise<GenerateTailoredSurveyQuestionsOutput> {
  return generateTailoredSurveyQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSurveyQuestionsPrompt',
  input: { schema: GenerateTailoredSurveyQuestionsInputSchema },
  output: { schema: GenerateTailoredSurveyQuestionsOutputSchema },
  prompt: `# Identity
You are an AI expert specializing in creating dynamic, insightful onboarding experiences for chatbot development. You are building a survey for non-technical business owners. Your primary output language is determined by the input content.

# Instructions
1.  **Core Task:** Your goal is to generate a dynamic survey in JSON format to help a user define their chatbot's core features.
2.  **Input Analysis:**
    *   You will receive website content in \`<content>\` tags and a pre-made business analysis in \`<analysis>\` tags.
    *   The \`<analysis>\` data is the **single source of truth** for the business profile (industry, audience, tone). Use the \`<content>\` for contextual understanding and examples, but base the logic of the questions primarily on the \`<analysis>\`.
    *   The language of the survey MUST match the language of the business, as identified in the analysis.
3.  **Thinking Step - Icon Selection:** Before generating the final JSON, internally reason about the most appropriate icon for each question and each option. The choice must be logical and reflect the concept behind the text. For example, for a question about sales, 'dollar-sign' is appropriate; for personality, 'lightbulb' or 'feather'.
4.  **Question Generation:**
    *   Based on the \`<analysis>\`, generate **between 10 and 20** insightful, multiple-choice questions.
    *   The questions must cover these categories: Core Objective & Scope, Personality & Tone, Functionality & Features, Integration & Technical, Success Measurement.
5.  **Answer Options & Icons:**
    *   For each question, provide 3-4 relevant, multiple-choice \`options\`.
    *   Each option object MUST have a \`text\` field and an \`icon\` field.
    *   Questions that allow selecting multiple options should include \`allowMultiple: true\` and have "selectați toate opțiunile relevante" in the question text.
    *   The \`icon\` value MUST be a single, relevant icon name from the following exclusive list of available lucide-react icons: 'briefcase', 'users', 'megaphone', 'target', 'zap', 'settings', 'message-circle', 'dollar-sign', 'calendar', 'award', 'shield', 'lightbulb', 'link', 'workflow', 'pie-chart', 'compass', 'book-open', 'feather', 'pen-tool', 'server', 'database'.
    
    *   Most questions MUST include an "Altele (specificați)" option (or its equivalent) with the icon \`'more-horizontal'\`.
6.  **Output Format:**
    *   The final output MUST be a single, valid JSON object.
    *   Do not add any text, explanations, or markdown formatting outside the JSON block.

# Example (Few-Shot Learning)
<example>
  <user_query>
    <analysis>
      {
        "industry": "Agenție de design digital",
        "targetAudience": "Startup-uri",
        "toneOfVoice": "Creativ și entuziast",
        "language": "Romanian"
      }
    </analysis>
    <content>
    CreativePeak este o agenție de design digital. Misiunea noastră este să ajutăm startup-urile.
    </content>
  </user_query>
  <assistant_response>
  {
    "questions": [
      {
        "category": "Core Objective & Scope",
        "question": "Care sunt scopurile principale ale agentului AI pe site-ul CreativePeak? (selectați toate opțiunile relevante)",
        "icon": "target",
        "allowMultiple": true,
        "options": [
          {"text": "Să colecteze datele de contact (generare de lead-uri).", "icon": "briefcase"},
          {"text": "Să ofere instant o estimare de preț aproximativă.", "icon": "dollar-sign"},
          {"text": "Să răspundă la întrebări frecvente despre servicii.", "icon": "message-circle"},
          {"text": "Nu este cazul", "icon": "x-circle"}
        ]
      },
      {
        "category": "Personality & Tone",
        "question": "Ce personalitate ar trebui să adopte agentul?",
        "icon": "lightbulb",
        "options": [
          {"text": "Creativ și entuziast, folosind un limbaj modern.", "icon": "feather"},
          {"text": "Profesional și direct, axat pe eficiență.", "icon": "pen-tool"},
          {"text": "Consultativ și educativ, explicând procesul.", "icon": "book-open"},
          {"text": "Altele (specificați)", "icon": "more-horizontal"},
          {"text": "Nu este cazul", "icon": "x-circle"}
        ]
      }
    ]
  }
  </assistant_response>
</example>

# Output Schema
The output must be a JSON object with a single key "questions", which is an array of objects. Each object must have "category", "question", "icon", and "options" (which is an array of objects, each with "text" and "icon").

<analysis>
{{{json analysis}}}
</analysis>

<content>
{{{crawledText}}}
</content>
`,
});

const generateTailoredSurveyQuestionsFlow = ai.defineFlow(
  {
    name: 'generateTailoredSurveyQuestionsFlow',
    inputSchema: GenerateTailoredSurveyQuestionsInputSchema,
    outputSchema: GenerateTailoredSurveyQuestionsOutputSchema,
  },
  async input => {
    let retries = 3;
    let delay = 1000;
    while (retries > 0) {
      try {
        const { output } = await prompt(input);
        if (output) {
          const questions = output.questions.map(question => ({
            ...question,
            allowMultiple: true // Ensure all questions allow multiple selections
          }));
          return { questions };
        }
        throw new Error('No output from prompt.');
      } catch (error: any) {
        console.warn(`Survey generation attempt failed: ${error.message}`);
        retries--;
        if (retries === 0) {
          throw new Error(`Failed to generate survey questions after several retries: ${error.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
    // This part should not be reachable if retries are exhausted, as the error will be thrown.
    // But to satisfy TypeScript's need for a return path, we'll throw an error here too.
    throw new Error('Failed to generate survey questions and exited retry loop unexpectedly.');
  }
);
