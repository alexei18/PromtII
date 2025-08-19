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

// MODIFICARE 1: Definim un input schema specific pentru prompt, care acceptă string-uri simple.
const PromptInputSchema = z.object({
  crawledText: z.string(),
  analysisAsJson: z.string(), // Vom folosi acest câmp pentru a pasa JSON-ul ca string
});

const prompt = ai.definePrompt({
  name: 'generateSurveyQuestionsPrompt',
  input: { schema: PromptInputSchema }, // Folosim noul schema de input
  output: { schema: GenerateTailoredSurveyQuestionsOutputSchema },
  prompt: `
  # Role (Rol)
  You are a strategic AI expert specializing in user profiling and dynamic survey design. Your mission is to create an intelligent, adaptive survey that extracts the core business objectives of a user to inform the development of a custom AI chatbot. You are building this for non-technical business owners, so clarity and relevance are paramount.

  # Action (Acțiune)
  Your core task is to generate a dynamic, multi-choice survey in JSON format. This survey will serve as a strategic tool to understand the user's business goals and define the chatbot's essential features.

  # Context (Context)
  You will be provided with two sources of information:
  1.  \`<analysis>\`: A JSON object containing the pre-verified business profile (industry, target audience, tone of voice). This is your primary source of truth.
  2.  \`<content>\`: Raw text crawled from the user's website. Use this for deeper contextual understanding, identifying key business terms, and finding examples to make the questions more specific and relatable.

  The survey's language MUST be Romanian.

  # Expectation (Așteptări)
  Your process must follow a sophisticated, multi-step reasoning model before generating the final output.

  ## Step 1: Tree-of-Thought (ToT) Strategic Planning
  Instead of generating a simple linear list of questions, you must first explore multiple strategic paths for profiling the user. Internally, generate three potential branches for the survey's focus:
  *   **Branch A: Marketing & Lead Generation Focus:** Questions centered on attracting and converting new customers.
  *   **Branch B: Customer Support & Efficiency Focus:** Questions about automating responses and improving user experience.
  *   **Branch C: Brand & Content Strategy Focus:** Questions about how the chatbot can embody the brand's voice and guide users through content.
  Evaluate which branch (or a hybrid of them) is most relevant based on the provided \`<analysis>\` and \`<content>\`. Select the most promising strategic path to guide your question generation.

  ## Step 2: Chain-of-Thought (CoT) Question Generation
  Following your chosen strategic path, generate **10 to 15** insightful, multiple-choice questions. For each question, perform the following sub-steps:
  *   **Categorization:** Assign the question to one of these categories: Core Objective & Scope, Personality & Tone, Functionality & Features, Integration & Technical, Success Measurement.
  *   **Wording:** Formulate a clear, concise question that is easy for a non-technical user to understand. Integrate specific terms from the \`<content>\` where appropriate to maximize personalization.
  *   **Options:** Provide 3-4 relevant, distinct multiple-choice options.
  *   **Icon Selection:** For the question and each option, select the most logically fitting icon from the exclusive list provided. The choice must be deliberate and meaningful.
  *   **Multiple Selections:** Questions that allow multiple answers must include \`allowMultiple: true\` and the text "selectați toate opțiunile relevante".
  *   **"Other" Option:** Most questions should include an "Altele (specificați)" option with the icon \`more-horizontal\`.

  ## Step 3: Self-Correction and Refinement
  Review the full set of generated questions. Critique your own work. Ask yourself:
  *   "Are these questions truly insightful, or are they generic?"
  *   "Do they logically flow from the chosen strategic path?"
  *   "Is there a better icon for this concept?"
  Refine the questions based on this internal feedback loop.

  ## Step 4: Final JSON Output
  Produce a single, valid JSON object as the final output. It must strictly adhere to the output schema. Do not include any explanations, comments, or markdown formatting outside the JSON structure.

  ### Icon List (Exclusive)
  You MUST use icons only from this list: 'briefcase', 'users', 'megaphone', 'target', 'zap', 'settings', 'message-circle', 'dollar-sign', 'calendar', 'award', 'shield', 'lightbulb', 'link', 'workflow', 'pie-chart', 'compass', 'book-open', 'feather', 'pen-tool', 'server', 'database', 'more-horizontal', 'x-circle'.

  <analysis>
  {{{analysisAsJson}}}
  </analysis>

  <content>
  {{{crawledText}}}
  </content>
  `
});


export const generateTailoredSurveyQuestionsFlow = ai.defineFlow(
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
        // MODIFICARE 2: Pregătim input-ul pentru prompt AICI.
        const promptInput = {
          crawledText: input.crawledText,
          analysisAsJson: JSON.stringify(input.analysis, null, 2), // Convertim obiectul în string
        };

        const { output } = await prompt(promptInput); // Trimitem datele pregătite

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

export async function generateTailoredSurveyQuestions(
  input: GenerateTailoredSurveyQuestionsInput
): Promise<GenerateTailoredSurveyQuestionsOutput> {
  return await generateTailoredSurveyQuestionsFlow(input);
}