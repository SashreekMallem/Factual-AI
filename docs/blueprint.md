# **App Name**: Verity Engine

## Core Features:

- Claim Extraction: Claim Extraction: Automatically identify and extract verifiable claims from user-submitted text using RoBERTa-large and GPT-4o.
- Verdict Display: Verdict Display: Clearly display the verification verdict (supported, contradicted, neutral) for each claim.
- Trust Chain Analysis: Trust Chain Analysis: Trace the provenance of evidence, assigning trust scores to sources based on authority and citation depth using LLMs as a tool.
- AI Explanation: AI-Powered Explanation: Generate human-readable explanations for each verdict, increasing transparency and user trust. Uses GPT-4o as a tool.
- User Feedback: User Feedback: Allow users to dispute verdicts and submit better sources for continuous learning.
- Smart Cache Check: Smart Cache Check: Vector similarity search to determine if claims have already been fact-checked, and serve existing responses to cut down on cost and time.
- Recursive Verification: Sub-Claim Reasoning: Use a GPT-4o self-loop to break down complex claims into sub-claims, verifying each recursively until a high-confidence verdict is reached, used as a tool.

## Style Guidelines:

- Primary color: Strong blue (#2962FF), suggesting reliability and authority.
- Background color: Light grey (#F0F4F9), to provide a clean, neutral backdrop.
- Accent color: Deep orange (#FF6B00), for interactive elements, emphasizing key actions and results.
- Body font: 'PT Sans', a humanist sans-serif that is very readable in text-heavy applications.
- Headline font: 'Space Grotesk', a techy sans-serif font used to differentiate headlines, and short labels, from body text.
- Use clear, simple icons to represent claim status (supported, contradicted, neutral) and source types.
- Subtle animations for loading states and transitions between claim verification stages.