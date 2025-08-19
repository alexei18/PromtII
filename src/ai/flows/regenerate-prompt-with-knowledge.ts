import { ai } from '@/ai/genkit';
import { defineFlow } from '@genkit-ai/flow';
import { z } from 'zod';
import * as mammoth from 'mammoth';
// import * as pdfParse from 'pdf-parse'; // Removed static import
import * as xlsx from 'xlsx';

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
const regenerationPrompt = `
You are an expert AI prompt engineer. Your task is to integrate a new knowledge base into an existing system prompt for a conversational AI.

**Instructions:**
1.  Analyze the 'Existing System Prompt' to understand the AI's core personality, role, and instructions.
2.  Analyze the 'New Knowledge Base Content' which has been extracted from a user-provided document. This content may include product details, service descriptions, company policies, FAQs, or other business-specific data.
3.  Integrate the key information from the knowledge base into the system prompt. Create a new, clearly marked section within the prompt called "## Knowledge Base".
4.  Under this new section, summarize and structure the information from the document in a clear, concise, and easily accessible format for the AI.
5.  Do NOT alter the AI's core personality, tone of voice, or fundamental instructions from the original prompt. You are only enhancing the prompt with new information.
6.  Return the complete, updated system prompt.

**Existing System Prompt:**
---
{{currentPrompt}}
---

**New Knowledge Base Content:**
---
{{knowledgeBaseText}}
---

**Updated System Prompt:**
`;

// Define the Genkit flow
export const regeneratePromptWithKnowledgeFlow = defineFlow(
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

    const response = await ai.generate({
      prompt: finalPrompt,
      config: {
        temperature: 0.3, // Lower temperature for more predictable, structured output
      },
    });

    const newPrompt = response.text;
    console.log('[Flow] Successfully generated new prompt.');

    return newPrompt;
  }
);
 