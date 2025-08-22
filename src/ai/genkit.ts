import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { dynamicGenkitManager } from '@/lib/dynamic-genkit';

// Fallback pentru compatibilitate cu codul vechi
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash',
});

// Export pentru noua implementare cu load balancing
export { dynamicGenkitManager } from '@/lib/dynamic-genkit';
export { generateWithLoadBalancing, runFlowWithLoadBalancing } from '@/lib/dynamic-genkit';
