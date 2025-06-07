
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
import { Terminal, Sparkles, Info, CheckCircle, FileText, Search, BarChart3, Brain, Edit3, ListChecks, ShieldCheck, PackageCheck, Hourglass, Zap, SearchCheck, ChevronRight, CircleDotDashed, CircleSlash, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from '@/components/ui/progress';

const formSchema = z.object({
  text: z.string().min(20).max(5000),
});

const initialProcessingSteps: Omit<DisplayedProcessingStep, 'id' | 'status'>[] = [
  { text: "Initializing Factual AI Cognitive Matrix...", icon: Zap, details: "System waking up..." },
  { text: "Parsing input text for semantic structure...", icon: FileText, details: "Understanding language..." },
  { text: "Identifying and extracting potential claims...", icon: Edit3, details: "Pinpointing statements..." },
];

const claimSpecificProcessingSteps = (claimText: string, claimIndex: number): Omit<DisplayedProcessingStep, 'id' | 'status'>[] => [
  { text: `Checking smart cache for Claim ${claimIndex + 1}...`, icon: SearchCheck, details: `Searching for: "${claimText.substring(0,30)}..."`},
  { text: `Assessing linguistic quality of Claim ${claimIndex + 1}...`, icon: BarChart3, details: "Evaluating clarity & focus..."},
  { text: `Initiating sub-claim reasoning for Claim ${claimIndex + 1}...`, icon: Brain, details: "Breaking down complexity..."},
  { text: `Conducting evidence search & trust analysis for Claim ${claimIndex + 1}...`, icon: Search, details: "Scouring web for evidence..."},
  { text: `Synthesizing findings & generating AI explanation for Claim ${claimIndex + 1}...`, icon: Sparkles, details: "Formulating verdict..."},
];

const finalProcessingSteps: Omit<DisplayedProcessingStep, 'id' | 'status'>[] = [
  { text: "Compiling final verification dossier...", icon: ListChecks, details: "Assembling all findings..." },
  { text: "Finalizing analysis and preparing report...", icon: ShieldCheck, details: "Almost ready!" },
];


export default function Home() {
  const [results, setResults] = useState<ClaimVerificationResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayedProcessingSteps, setDisplayedProcessingSteps] = useState<DisplayedProcessingStep[]>([]);
  const [currentGlobalStepIndex, setCurrentGlobalStepIndex] = useState(0);
  const [currentProcessingStepMessage, setCurrentProcessingStepMessage] = useState<DisplayedProcessingStep | null>(null);
  const { toast } = useToast();

  const totalStepsForProgressBar = useMemo(() => {
    const numClaims = results.length > 0 ? results.length : 1; // Estimate 1 claim if none yet for progress bar starting point
    return initialProcessingSteps.length + (numClaims * claimSpecificProcessingSteps('',0).length) + finalProcessingSteps.length;
  }, [results.length]);


  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;
    let masterStepIndex = 0;
    
    if (isProcessing) {
      const initialStepsWithStatus = initialProcessingSteps.map((step, idx) => ({
        ...step,
        id: `initial-${idx}`,
        status: 'pending' as ProcessingStepStatus,
      }));
      // At this point, we don't know the number of claims, so we only add initial steps.
      // Claim-specific steps will be added dynamically in handleSubmit after claim extraction.
      // For now, allStepsForCurrentRun will be built up.
      let allStepsForCurrentRun: DisplayedProcessingStep[] = [...initialStepsWithStatus];
      setDisplayedProcessingSteps([...allStepsForCurrentRun]);
      
      setCurrentProcessingStepMessage(allStepsForCurrentRun[0] || null);

      const advanceStep = () => {
        if (masterStepIndex < allStepsForCurrentRun.length) {
          setDisplayedProcessingSteps(prevSteps => {
            const newSteps = [...prevSteps];
            if (masterStepIndex > 0 && newSteps[masterStepIndex -1]) {
              newSteps[masterStepIndex-1].status = 'completed';
            }
            if (newSteps[masterStepIndex]) {
               newSteps[masterStepIndex].status = 'in-progress';
               setCurrentProcessingStepMessage(newSteps[masterStepIndex]);
            }
            return newSteps;
          });
          setCurrentGlobalStepIndex(masterStepIndex + 1); // +1 because index is 0-based
          masterStepIndex++;
        } else {
          clearInterval(intervalId);
           setDisplayedProcessingSteps(prevSteps => {
             const allCompleted = prevSteps.map(s => ({...s, status: s.status === 'in-progress' ? 'completed' : s.status as ProcessingStepStatus }));
             // Ensure the last message shown is the final completion message or the last step
             const finalMessageStep = finalProcessingSteps[finalProcessingSteps.length - 1] || allCompleted[allCompleted.length -1];
             if (finalMessageStep) {
                setCurrentProcessingStepMessage({
                    ...finalMessageStep,
                    id: 'final-completion',
                    text: "Analysis Complete!",
                    status: 'completed',
                    icon: PackageCheck
                });
             }
             return allCompleted;
           });
        }
      };
      
      advanceStep(); 
      intervalId = setInterval(advanceStep, 1800);

    } else {
        // Reset steps when not processing
        //setCurrentGlobalStepIndex(0);
        // If there were steps and the last one was in progress, mark it completed.
         if (displayedProcessingSteps.length > 0 && displayedProcessingSteps.some(s => s.status === 'in-progress')) {
            setDisplayedProcessingSteps(prevSteps => prevSteps.map(s => ({ ...s, status: s.status === 'in-progress' ? 'completed' : s.status as ProcessingStepStatus })));
        }
        if (results.length > 0 && !error) {
             setCurrentProcessingStepMessage({ id:'final-done', text: "Verification Dossier Ready", icon: PackageCheck, status: 'completed' });
        } else if (error) {
             setCurrentProcessingStepMessage({ id:'final-error', text: "Processing Error Encountered", icon: Terminal, status: 'error' });
        } else if (!isProcessing && results.length === 0 && displayedProcessingSteps.length === 0){
             setCurrentProcessingStepMessage(null); // Clear message if starting fresh
        }
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isProcessing]); // Dependencies: isProcessing. We handle results/error changes separately in handleSubmit.


  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsProcessing(true);
    setError(null);
    setResults([]);
    setCurrentGlobalStepIndex(0);
    
    // Initial steps are already set by the useEffect when isProcessing becomes true
    toast({
      title: "Verification Protocol Initiated",
      description: "Factual AI is decoding your request. This comprehensive analysis may take a moment.",
      duration: 4000,
    });

    try {
      // Simulate the initial steps completing before calling the backend
      // This logic is now largely handled by the useEffect for isProcessing
      // We will update the 'allStepsForCurrentRun' within useEffect if needed, or pass a callback
      // For now, verifyClaimsInText will run, and then we'll update based on its results.
      
      const verificationResults = await verifyClaimsInText(data.text);
      setResults(verificationResults);

      // Dynamically build the full list of steps for this run, now that we know the number of claims
      const initialSteps = initialProcessingSteps.map((step, idx) => ({
        ...step, id: `initial-${idx}`, status: 'completed' as ProcessingStepStatus, // Mark initial as completed
      }));

      let dynamicClaimSteps: DisplayedProcessingStep[] = [];
      if (verificationResults.length > 0 && verificationResults[0].id !== 'no_claims_found') {
        verificationResults.forEach((claim, claimIdx) => {
          claimSpecificProcessingSteps(claim.claimText, claimIdx).forEach((template, stepIdx) => {
            dynamicClaimSteps.push({
              ...template,
              id: `claim-${claimIdx}-step-${stepIdx}`,
              status: 'completed' as ProcessingStepStatus, // Mark claim-specific as completed
            });
          });
        });
      }
      
      const finalSystemSteps = finalProcessingSteps.map((step, idx) => ({
        ...step, id: `final-${idx}`, status: 'completed' as ProcessingStepStatus, // Mark final as completed
      }));
      
      const allCompletedSteps = [...initialSteps, ...dynamicClaimSteps, ...finalSystemSteps];
      setDisplayedProcessingSteps(allCompletedSteps);
      setCurrentGlobalStepIndex(allCompletedSteps.length); // Set progress to max

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
       setDisplayedProcessingSteps(prevSteps => prevSteps.map(s => ({ ...s, status: s.status === 'in-progress' ? 'error' : s.status as ProcessingStepStatus })));
    } finally {
      setIsProcessing(false);
    }
  };
  
  const progressPercentage = totalStepsForProgressBar > 0 ? Math.min(100, (currentGlobalStepIndex / totalStepsForProgressBar) * 100) : 0;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-muted/60 dark:from-background dark:to-muted/30">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-4xl mx-auto space-y-10">
          <ClaimInputForm onSubmit={handleSubmit} isProcessing={isProcessing} />

          {(isProcessing || displayedProcessingSteps.length > 0) && (
            <div className="mt-8 p-6 bg-card/80 backdrop-blur-sm rounded-xl shadow-2xl border border-primary/30">
              <div className="flex items-center mb-4">
                 {currentProcessingStepMessage?.icon && <currentProcessingStepMessage.icon className={`h-7 w-7 text-primary mr-3 ${currentProcessingStepMessage.status === 'in-progress' ? 'animate-pulse' : ''}`} />}
                <h2 className="font-headline text-2xl text-primary">{currentProcessingStepMessage?.text || "Cognitive Process Monitor"}</h2>
              </div>
              {currentProcessingStepMessage?.details && <p className="text-sm text-muted-foreground mb-1 italic">{currentProcessingStepMessage.details}</p>}
              
              <Progress value={progressPercentage} className="w-full h-2 mb-6 rounded-full" indicatorClassName={`bg-primary transition-all duration-1500 ease-linear ${isProcessing ? 'animate-pulse' : ''}`} />
              
              <div className="space-y-2 max-h-[20rem] overflow-y-auto pr-2 custom-scrollbar">
                {displayedProcessingSteps.map((step) => {
                  let IconComponent;
                  let iconColor = '';
                  let animationClass = '';

                  switch (step.status) {
                    case 'completed': IconComponent = CheckCircle2; iconColor = 'text-green-500 dark:text-green-400'; break;
                    case 'in-progress': IconComponent = Loader2; iconColor = 'text-primary'; animationClass = 'animate-spin'; break;
                    case 'error': IconComponent = CircleSlash; iconColor = 'text-red-500 dark:text-red-400'; break;
                    case 'pending': IconComponent = CircleDotDashed; iconColor = 'text-muted-foreground opacity-60'; break;
                    default: IconComponent = Hourglass; iconColor = 'text-muted-foreground opacity-60';
                  }
                  
                  return (
                    <div key={step.id} className={`flex items-center p-2.5 rounded-lg transition-all duration-300 ease-in-out text-sm
                                      ${step.status === 'in-progress' ? 'bg-primary/10 scale-102 shadow-md' : 'bg-muted/40 hover:bg-muted/70'}
                                      ${step.status === 'completed' ? 'opacity-70' : ''}`}>
                      {step.icon && <step.icon className={`mr-2.5 h-5 w-5 shrink-0 ${iconColor} ${step.status !== 'in-progress' && 'opacity-80'}`} />}
                      <span className={`font-body flex-grow ${step.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground/90'}`}>
                        {step.text}
                      </span>
                       <IconComponent className={`ml-3 h-5 w-5 shrink-0 ${iconColor} ${animationClass}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {error && !isProcessing && (
             <Alert variant="destructive" className="mt-8 shadow-lg rounded-lg border-l-4 border-red-600">
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
          
          {!isProcessing && results.length === 0 && !error && !displayedProcessingSteps.some(s => s.status !== 'completed' && s.status !== 'pending') && (
            <div className="mt-10 text-center p-8 bg-card/80 backdrop-blur-sm rounded-xl shadow-xl border border-border/60">
              <Info className="mx-auto h-12 w-12 text-primary/70 mb-4" />
              <h3 className="font-headline text-xl text-foreground mb-2">Awaiting Directives</h3>
              <p className="font-body text-muted-foreground max-w-md mx-auto">
                Input text into the form above. Factual AI will initiate its analytical protocols, identify claims, and compile a detailed verification dossier for each.
              </p>
            </div>
          )}
        </div>
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border/50 mt-auto bg-card/90 backdrop-blur-sm">
        <p className="font-body">&copy; {new Date().getFullYear()} Factual AI. Cognitive Fact Verification Matrix.</p>
        <p className="font-body text-xs mt-1">Constructed with Next.js, ShadCN UI, TailwindCSS, and Genkit AI Framework.</p>
      </footer>
    </div>
  );
}
