'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Header } from '@/components/Header';
import { ClaimInputForm } from '@/components/ClaimInputForm';
import { ClaimCard } from '@/components/ClaimCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { verifyClaimsInText } from '@/app/actions';
import type { ClaimVerificationResult } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


const formSchema = z.object({
  text: z.string().min(10).max(5000),
});

export default function Home() {
  const [results, setResults] = useState<ClaimVerificationResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsProcessing(true);
    setError(null);
    setResults([]); // Clear previous results

    try {
      toast({
        title: "Processing Request",
        description: "Extracting and verifying claims. This may take a moment...",
      });
      const verificationResults = await verifyClaimsInText(data.text);
      setResults(verificationResults);
      if (verificationResults.some(r => r.status === 'error' && r.id !== 'no_claims_found')) {
        setError("Some claims could not be processed. See details below.");
        toast({
          title: "Processing Partly Successful",
          description: "Some claims encountered errors during verification.",
          variant: "destructive",
        });
      } else if (verificationResults.length > 0 && verificationResults[0].id !== 'no_claims_found') {
         toast({
          title: "Verification Complete",
          description: "Claims have been processed successfully.",
        });
      } else if (verificationResults.length > 0 && verificationResults[0].id === 'no_claims_found') {
        toast({
          title: "No Claims Found",
          description: "The system did not find any verifiable claims in your text.",
        });
      }

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Failed to process claims: ${errorMessage}`);
      toast({
        title: "Verification Failed",
        description: `An error occurred: ${errorMessage}`,
        variant: "destructive",
      });
      setResults([{
        id: 'top-level-error',
        claimText: "Overall Processing Error",
        status: 'error',
        explanation: `An unexpected error occurred: ${errorMessage}`,
        isProcessing: false,
        sources: []
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <ClaimInputForm onSubmit={handleSubmit} isProcessing={isProcessing} />

          {isProcessing && (
            <div className="mt-8 flex flex-col items-center justify-center space-y-3 p-6 bg-card rounded-lg shadow-md">
              <LoadingSpinner size={48} />
              <p className="font-headline text-lg text-primary">Analyzing claims, please wait...</p>
              <p className="font-body text-sm text-muted-foreground">This may take a few moments depending on the complexity of the text.</p>
            </div>
          )}

          {error && !isProcessing && (
             <Alert variant="destructive" className="mt-8">
              <Terminal className="h-4 w-4" />
              <AlertTitle className="font-headline">Error</AlertTitle>
              <AlertDescription className="font-body">{error}</AlertDescription>
            </Alert>
          )}

          {!isProcessing && results.length > 0 && (
            <div className="mt-10">
              <h2 className="font-headline text-2xl text-primary mb-6 border-b pb-2">Verification Results</h2>
              {results.map((result) => (
                <ClaimCard key={result.id} result={result} />
              ))}
            </div>
          )}
          
          {!isProcessing && results.length === 0 && !error && (
            <div className="mt-8 text-center p-6 bg-card rounded-lg shadow-md">
              <p className="font-body text-muted-foreground">
                Enter some text above to start verifying claims.
              </p>
              <p className="font-body text-sm text-muted-foreground mt-2">
                Verity Engine uses advanced AI to analyze text, identify claims, and check their validity against various sources.
              </p>
            </div>
          )}
        </div>
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border mt-auto bg-card">
        <p className="font-body">&copy; {new Date().getFullYear()} Verity Engine. Powered by AI.</p>
      </footer>
    </div>
  );
}
