
'use client';

import { useState, useEffect, useMemo } from 'react';
import { z } from 'zod';
import { Header } from '@/components/Header';
import { ClaimInputForm } from '@/components/ClaimInputForm';
import { ClaimCard } from '@/components/ClaimCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { verifyClaimsInText } from '@/app/actions';
import type { ClaimVerificationResult, DisplayedProcessingStep, ProcessingStepStatus } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Sparkles, Info, CheckCircle, FileText, Search, BarChart3, Brain, Edit3, ListChecks, ShieldCheck, PackageCheck, Hourglass, Zap, SearchCheck, ChevronRight, CircleDotDashed, CircleSlash, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from '@/components/ui/progress';

const formSchema = z.object({
  text: z.string().min(20).max(5000),
});

// Base steps definition
const baseProcessingStepsConfig: Omit<DisplayedProcessingStep, 'id' | 'status' | 'details'>[] = [
  { text: "Initializing Verity Engine", icon: Zap },
  { text: "Parsing input text...", icon: FileText },
  { text: "Extracting potential claims...", icon: Edit3 },
  // Claim-specific steps will be inserted here
  { text: "Compiling final verification report...", icon: ListChecks },
  { text: "Finalizing analysis...", icon: ShieldCheck },
];

const claimSpecificStepTemplates: Omit<DisplayedProcessingStep, 'id' | 'status' | 'details' | 'text'>[] = [
  { icon: SearchCheck }, // Smart Cache Check
  { icon: BarChart3 },   // Quality Assessment
  { icon: Brain },       // Sub-Claim Reasoning
  { icon: Search },      // Evidence Search & Trust Analysis
  { icon: Sparkles },    // Generating AI Explanation
];


export default function Home() {
  const [results, setResults] = useState<ClaimVerificationResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayedProcessingSteps, setDisplayedProcessingSteps] = useState<DisplayedProcessingStep[]>([]);
  const [currentGlobalStepIndex, setCurrentGlobalStepIndex] = useState(0);
  const { toast } = useToast();

  const totalSteps = useMemo(() => {
    // This is an approximation as claim-specific steps depend on number of claims
    // Assuming an average of 1-2 claims for progress bar fullness
    const numClaims = results.length || 1; // Estimate
    return baseProcessingStepsConfig.length - 2 + (numClaims * claimSpecificStepTemplates.length);
  }, [results.length]);


  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;
    let masterStepIndex = 0;
    let currentClaimIndex = 0;
    let currentClaimStepIndex = 0;
    let allStepsForCurrentRun: DisplayedProcessingStep[] = [];

    if (isProcessing) {
      // Dynamically build the full list of steps for this run
      const initialSteps = baseProcessingStepsConfig.slice(0, 3).map((step, idx) => ({
        ...step,
        id: `initial-${idx}`,
        status: 'pending' as ProcessingStepStatus,
      }));

      // Placeholder for claim-specific steps - will be updated as claims are extracted
      // For now, let's assume we'll know the number of claims after extraction for a more accurate timeline
      // This part would ideally be updated once `extractedClaimStrings` is available in `handleSubmit`
      // For simplicity in this effect, we'll just use a placeholder or a small number
      const estimatedClaims = 1; // Or use results.length if it's available and makes sense here
      let dynamicClaimSteps: DisplayedProcessingStep[] = [];
      for (let i = 0; i < estimatedClaims; i++) {
        claimSpecificStepTemplates.forEach((template, stepIdx) => {
          dynamicClaimSteps.push({
            ...template,
            id: `claim-${i}-step-${stepIdx}`,
            text: `${template.icon === SearchCheck ? 'Checking smart cache for claim ' :
                     template.icon === BarChart3 ? 'Assessing quality of claim ' :
                     template.icon === Brain ? 'Reasoning on sub-claims for claim ' :
                     template.icon === Search ? 'Searching evidence for claim ' :
                     'Explaining verdict for claim '} ${i + 1}...`,
            status: 'pending' as ProcessingStepStatus,
          });
        });
      }

      const finalSteps = baseProcessingStepsConfig.slice(3).map((step, idx) => ({
        ...step,
        id: `final-${idx}`,
        status: 'pending' as ProcessingStepStatus,
      }));
      
      allStepsForCurrentRun = [...initialSteps, ...dynamicClaimSteps, ...finalSteps];
      setDisplayedProcessingSteps(allStepsForCurrentRun.map(s => ({...s}))); // Initial display

      masterStepIndex = 0;
      const advanceStep = () => {
        if (masterStepIndex < allStepsForCurrentRun.length) {
          setDisplayedProcessingSteps(prevSteps => {
            const newSteps = [...prevSteps];
            if (masterStepIndex > 0 && newSteps[masterStepIndex -1]) {
              newSteps[masterStepIndex-1].status = 'completed';
            }
            if (newSteps[masterStepIndex]) {
               newSteps[masterStepIndex].status = 'in-progress';
            }
            return newSteps;
          });
          setCurrentGlobalStepIndex(masterStepIndex);
          masterStepIndex++;
        } else {
          clearInterval(intervalId);
           setDisplayedProcessingSteps(prevSteps => prevSteps.map(s => ({...s, status: s.status === 'in-progress' ? 'completed' : s.status })));
        }
      };
      
      advanceStep(); // Show the first step immediately
      intervalId = setInterval(advanceStep, 1800); // Adjust timing as needed

    } else {
        // Reset steps when not processing
        setCurrentGlobalStepIndex(0);
        if (displayedProcessingSteps.some(s => s.status === 'in-progress' || s.status === 'pending')) {
             setDisplayedProcessingSteps(prevSteps => prevSteps.map(s => ({ ...s, status: 'completed' })));
        }
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isProcessing]);


  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsProcessing(true);
    setError(null);
    setResults([]);
    setCurrentGlobalStepIndex(0);
    setDisplayedProcessingSteps([]);


    toast({
      title: "Verification Protocol Initiated",
      description: "Verity Engine is decoding your request. This comprehensive analysis may take a moment.",
      duration: 3000,
    });

    try {
      const verificationResults = await verifyClaimsInText(data.text);
      setResults(verificationResults); // Set results to trigger re-evaluation of totalSteps if needed

      // Update displayedProcessingSteps with actual claim count if possible, or mark all as complete
      setDisplayedProcessingSteps(prevSteps => {
        // This is tricky because the effect above drives the step-by-step display
        // For now, just mark all as completed when done. A more robust solution would
        // involve passing a callback to verifyClaimsInText to update steps during its execution.
        return prevSteps.map(s => ({ ...s, status: 'completed' as ProcessingStepStatus }));
      });


      if (verificationResults.some(r => r.status === 'error' && r.id !== 'no_claims_found')) {
        setError("Some claims encountered issues. Please review the detailed report cards below.");
        toast({
          title: "Analysis Partially Completed",
          description: "Some claims faced errors during verification. Check results for specifics.",
          variant: "destructive",
        });
      } else if (verificationResults.length > 0 && verificationResults[0].id === 'no_claims_found') {
        toast({
          title: "No Actionable Claims Identified",
          description: "The system did not detect verifiable factual statements in the provided text.",
          variant: "default",
        });
      } else if (verificationResults.length > 0) {
         toast({
          title: "Verification Dossier Compiled!",
          description: "Your text has been analyzed. See the detailed report cards below.",
          variant: "default",
          className: "bg-green-600 border-green-700 text-white dark:bg-green-700 dark:border-green-800"
        });
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Failed to process claims: ${errorMessage}`);
      toast({
        title: "Critical System Error",
        description: `An unexpected error halted the verification: ${errorMessage}`,
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
       setDisplayedProcessingSteps(prevSteps => prevSteps.map(s => ({ ...s, status: s.status === 'in-progress' ? 'error' : s.status })));
    } finally {
      setIsProcessing(false);
    }
  };
  
  const progressPercentage = totalSteps > 0 ? ((currentGlobalStepIndex +1) / totalSteps) * 100 : 0;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-muted/60 dark:from-background dark:to-muted/30">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-4xl mx-auto space-y-10">
          <ClaimInputForm onSubmit={handleSubmit} isProcessing={isProcessing} />

          {isProcessing && (
            <div className="mt-8 p-6 bg-card rounded-xl shadow-2xl border border-primary/30">
              <div className="flex items-center mb-6">
                <Zap className="h-8 w-8 text-primary mr-3 animate-pulse" />
                <h2 className="font-headline text-2xl text-primary">AI Cognitive Process Monitor</h2>
              </div>
              <Progress value={progressPercentage} className="w-full h-2.5 mb-6" indicatorClassName="bg-primary transition-all duration-1000 ease-linear" />
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {displayedProcessingSteps.map((step) => {
                  let IconComponent;
                  switch (step.status) {
                    case 'completed': IconComponent = CheckCircle; break;
                    case 'in-progress': IconComponent = Loader2; break;
                    case 'error': IconComponent = CircleSlash; break;
                    case 'pending': IconComponent = CircleDotDashed; break;
                    default: IconComponent = Hourglass;
                  }
                  const iconColor = step.status === 'completed' ? 'text-green-500' :
                                    step.status === 'in-progress' ? 'text-primary animate-spin' :
                                    step.status === 'error' ? 'text-red-500' :
                                    'text-muted-foreground opacity-70';

                  return (
                    <div key={step.id} className={`flex items-center p-3 rounded-md transition-all duration-300 ease-in-out ${step.status === 'in-progress' ? 'bg-primary/10 scale-105 shadow-lg' : 'bg-muted/50'}`}>
                      {step.icon && <step.icon className={`mr-3 h-5 w-5 shrink-0 ${iconColor} ${step.status !== 'in-progress' && 'opacity-70'}`} />}
                      <span className={`font-body text-sm ${step.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {step.text}
                      </span>
                       <IconComponent className={`ml-auto h-5 w-5 shrink-0 ${iconColor}`} />
                    </div>
                  );
                })}
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
              <div className="flex items-center space-x-3 mb-6 pb-3 border-b-2 border-primary/40">
                <PackageCheck className="h-8 w-8 text-primary" />
                <h2 className="font-headline text-3xl text-primary tracking-tight">Verification Dossier</h2>
              </div>
              {results.map((result) => (
                <ClaimCard key={result.id} result={result} />
              ))}
            </div>
          )}
          
          {!isProcessing && results.length === 0 && !error && (
            <div className="mt-10 text-center p-8 bg-card rounded-xl shadow-xl border border-border/60">
              <Info className="mx-auto h-12 w-12 text-primary/70 mb-4" />
              <h3 className="font-headline text-xl text-foreground mb-2">Awaiting Directives</h3>
              <p className="font-body text-muted-foreground max-w-md mx-auto">
                Input text into the form above. Verity Engine will initiate its analytical protocols, identify claims, and compile a detailed verification dossier for each.
              </p>
            </div>
          )}
        </div>
      </main>
      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border/50 mt-auto bg-card/90">
        <p className="font-body">&copy; {new Date().getFullYear()} Verity Engine. AI Cognitive Fact Verification Matrix.</p>
        <p className="font-body text-xs mt-1">Constructed with Next.js, ShadCN UI, TailwindCSS, and Genkit AI Framework.</p>
      </footer>
    </div>
  );
}
