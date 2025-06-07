
import { config } from 'dotenv';
config();

import '@/ai/flows/extract-claims.ts';
import '@/ai/flows/ai-explanation.ts';
import '@/ai/flows/sub-claim-reasoning.ts';
import '@/ai/flows/trust-chain-analysis.ts';
import '@/ai/flows/evaluate-claim-quality.ts';
