import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as mammoth from 'mammoth';
// import * as pdfParse from 'pdf-parse'; // Removed static import
import * as xlsx from 'xlsx';
import { dynamicOpenAIManager } from '@/lib/dynamic-openai';

// Define the input schema for the flow
const FileInputSchema = z.object({
  content: z.string(), // base64 encoded content
  type: z.string(), // MIME type
});

const RegenerationInputSchema = z.object({
  currentPrompt: z.string(),
  file: FileInputSchema,
});

// Helper function to extract text from various file types
async function extractTextFromFile(file: z.infer<typeof FileInputSchema>): Promise<string> {
  const buffer = Buffer.from(file.content, 'base64');

  switch (file.type) {
    case 'application/pdf':
      // Dynamic import of pdf-parse
      const pdfParse = await import('pdf-parse');
      const pdfData = await pdfParse.default(buffer);
      return pdfData.text;

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': // .docx
      const docxResult = await mammoth.extractRawText({ buffer });
      return docxResult.value;

    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': // .xlsx
    case 'text/csv': // .csv
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      let fullText = '';
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const sheetCsv = xlsx.utils.sheet_to_csv(worksheet);
        fullText += sheetCsv + '\n';
      });
      return fullText;

    default:
      throw new Error(`Unsupported file type: ${file.type}`);
  }
}

// Define the prompt for the AI model
const regenerationPrompt = `# CRISPE Framework: Prompt Regeneration

## Capacity/Role (Capacitate/Rol)
You are an expert AI prompt engineer. Your task is to seamlessly integrate a new knowledge base into an existing system prompt for a conversational AI, enhancing its knowledge without altering its core identity.

## Insight (Perspectivă)
You will be given an 'Existing System Prompt' that defines an AI's personality and a 'New Knowledge Base Content' extracted from a user's document. The goal is to merge them. The key is to add the new information into a well-structured <KnowledgeBase> section. If such a section already exists, you must intelligently merge the new information with the old, updating or replacing outdated content as needed.

## Statement (Declarație)
Your task is to return a complete, updated system prompt that incorporates the new knowledge while preserving the original persona and rules.

## Personality (Personalitate)
You are a meticulous and careful editor. You respect the original creator's intent and focus only on the task of adding and structuring new information.

## Experiment (Experiment / Process)
Follow this step-by-step process:
1.  **Analyze Existing Prompt:** First, deeply understand the AI's core personality, tone of voice, and instructions from the 'Existing System Prompt'.
2.  **Extract & Structure New Knowledge:** Analyze the 'New Knowledge Base Content'. Identify the key pieces of information (e.g., product details, policies, FAQs). Structure this information logically.
3.  **Integrate Knowledge:**
    *   Locate the <KnowledgeBase> section in the existing prompt.
    *   If it doesn't exist, create it.
    *   Carefully add the new, structured information into this section.
    *   If there's overlapping information, use your judgment to merge or replace it, assuming the new information is more current.
4.  **Final Review:** Read the complete new prompt. Ensure the AI's persona and strict rules have not been changed. The only significant change should be the updated or new <KnowledgeBase> section.
5.  **Output:** Return the complete, updated system prompt.

**Existing System Prompt:**
---
{{currentPrompt}}---

**New Knowledge Base Content:**
---
{{knowledgeBaseText}}
---

**Updated System Prompt:**
`;

// Define the Genkit flow
export const regeneratePromptWithKnowledgeFlow = ai.defineFlow(
  {
    name: 'regeneratePromptWithKnowledgeFlow',
    inputSchema: RegenerationInputSchema,
    outputSchema: z.string(),
  },
  async (input: z.infer<typeof RegenerationInputSchema>) => {
    console.log('[Flow] Starting prompt regeneration with knowledge base.');

    const { currentPrompt, file } = input;

    // Step 1: Extract text from the uploaded file
    let knowledgeBaseText: string;
    try {
      knowledgeBaseText = await extractTextFromFile(file);
      if (!knowledgeBaseText.trim()) {
        throw new Error("The provided document appears to be empty or text could not be extracted.");
      }
      console.log(`[Flow] Extracted ${knowledgeBaseText.length} characters from the document.`);
    } catch (error: any) {
      console.error('[Flow] Failed to extract text from file:', error);
      throw new Error(`Failed to process the document: ${error.message}`);
    }

    // Step 2: Generate the new prompt using the AI model
    const finalPrompt = regenerationPrompt
      .replace('{{currentPrompt}}', currentPrompt)
      .replace('{{knowledgeBaseText}}', knowledgeBaseText);

    try {
      const result = await dynamicOpenAIManager.generateWithTracking(finalPrompt, {
        temperature: 0.3,
        maxTokens: 4000,
      });

      const newPrompt = result.content;
      console.log('[Flow] Successfully generated new prompt.');

      return newPrompt;
    } catch (error: any) {
      console.error('[Flow] Error generating new prompt:', error.message);
      throw new Error(`Failed to generate updated prompt: ${error.message}`);
    }
  }
);
