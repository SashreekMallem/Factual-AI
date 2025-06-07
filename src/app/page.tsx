
'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { Header } from '@/components/Header';
import { ClaimInputForm } from '@/components/ClaimInputForm';
import { ClaimCard } from '@/components/ClaimCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { verifyClaimsInText } from '@/app/actions';
import type { ClaimVerificationResult } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Sparkles, Info, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  text: z.string().min(20).max(5000),
});

const processingSteps = [
  "Initializing verification sequence...",
  "Extracting key claims from your text...",
  "Performing detailed quality assessment on each claim...",
  "Generating optimized search queries for evidence...",
  "Searching the web for relevant information (via DuckDuckGo)...",
  "Analyzing trustworthiness of potential sources...",
  "Conducting sub-claim reasoning for complex statements...",
  "Synthesizing findings and generating final explanations...",
  "Compiling comprehensive verification report...",
];

export default function Home() {
  const [results, setResults] = useState<ClaimVerificationResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentProcessingStep, setCurrentProcessingStep] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isProcessing) {
      let stepIndex = 0;
      setCurrentProcessingStep(processingSteps[stepIndex]);
      intervalId = setInterval(() => {
        stepIndex = (stepIndex + 1) % processingSteps.length;
        setCurrentProcessingStep(processingSteps[stepIndex]);
      }, 2500); // Change step every 2.5 seconds
    }
    return () => clearInterval(intervalId);
  }, [isProcessing]);

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsProcessing(true);
    setError(null);
    setResults([]); 

    try {
      toast({
        title: "Verification Initiated",
        description: "Verity Engine is now processing your request. This may take a moment.",
        duration: 5000,
      });
      const verificationResults = await verifyClaimsInText(data.text);
      setResults(verificationResults);

      if (verificationResults.some(r => r.status === 'error' && r.id !== 'no_claims_found')) {
        setError("Some claims could not be processed. Please review the details below.");
        toast({
          title: "Partial Success",
          description: "Some claims encountered errors during verification. Check results for details.",
          variant: "destructive",
        });
      } else if (verificationResults.length > 0 && verificationResults[0].id === 'no_claims_found') {
        toast({
          title: "No Claims Detected",
          description: "The system did not identify any verifiable claims in the provided text.",
          variant: "default",
        });
      } else if (verificationResults.length > 0) {
         toast({
          title: "Verification Complete!",
          description: "Your text has been analyzed. See the detailed report below.",
          variant: "default",
          className: "bg-green-500 border-green-600 text-white dark:bg-green-600 dark:border-green-700"
        });
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Failed to process claims: ${errorMessage}`);
      toast({
        title: "Verification Process Failed",
        description: `An unexpected error occurred: ${errorMessage}`,
        variant: "destructive",
      });
      setResults([{
        id: 'top-level-error',
        claimText: "Overall Processing Error Encountered",
        status: 'error',
        explanation: `An unexpected error disrupted the verification process: ${errorMessage}`,
        isProcessing: false,
        sources: []
      }]);
    } finally {
      setIsProcessing(false);
      setCurrentProcessingStep('');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-muted/50 dark:from-background dark:to-muted/20">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-4xl mx-auto space-y-10">
          <ClaimInputForm onSubmit={handleSubmit} isProcessing={isProcessing} />

          {isProcessing && (
            <div className="mt-8 flex flex-col items-center justify-center space-y-4 p-8 bg-card rounded-xl shadow-2xl border border-primary/20">
              <LoadingSpinner size={60} />
              <p className="font-headline text-xl text-primary animate-pulse">Engaging AI Cognitive Cores...</p>
              <p className="font-body text-base text-muted-foreground text-center w-3/4">{currentProcessingStep}</p>
              <div className="w-full max-w-md bg-muted rounded-full h-2.5 mt-2">
                <div className="bg-primary h-2.5 rounded-full animate-pulse" style={{ width: `${(processingSteps.indexOf(currentProcessingStep) + 1) / processingSteps.length * 100}%` }}></div>
              </div>
            </div>
          )}

          {error && !isProcessing && (
             <Alert variant="destructive" className="mt-8 shadow-lg rounded-lg">
              <Terminal className="h-5 w-5" />
              <AlertTitle className="font-headline text-lg">Processing Error</AlertTitle>
              <AlertDescription className="font-body text-base">{error}</AlertDescription>
            </Alert>
          )}

          {!isProcessing && results.length > 0 && (
            <div className="mt-12 space-y-8">
              <div className="flex items-center space-x-3 mb-6 pb-3 border-b-2 border-primary/30">
                <Sparkles className="h-8 w-8 text-primary" />
                <h2 className="font-headline text-3xl text-primary tracking-tight">Verification Report</h2>
              </div>
              {results.map((result) => (
                <ClaimCard key={result.id} result={result} />
              ))}
            </div>
          )}
          
          {!isProcessing && results.length === 0 && !error && (
            <div className="mt-10 text-center p-8 bg-card rounded-xl shadow-xl border border-border/50">
              <Info className="mx-auto h-12 w-12 text-primary/70 mb-4" />
              <h3 className="font-headline text-xl text-foreground mb-2">Ready for Analysis</h3>
              <p className="font-body text-muted-foreground max-w-md mx-auto">
                Enter text into the form above. Verity Engine will dissect it, identify factual claims, and provide a detailed verification analysis for each.
              </p>
            </div>
          )}
        </div>
      </main>
      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border/50 mt-auto bg-card/80">
        <p className="font-body">&copy; {new Date().getFullYear()} Verity Engine. Advanced AI Fact Verification.</p>
        <p className="font-body text-xs mt-1">Built with Next.js, ShadCN UI, TailwindCSS, and Genkit.</p>
      </footer>
    </div>
  );
}
