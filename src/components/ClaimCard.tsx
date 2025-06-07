
'use client';

import { ClaimVerificationResult, ClaimStatus, MockSource, ClaimQualityMetrics } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle2, XCircle, HelpCircle, AlertTriangle, Loader2, ExternalLink, MessageSquareQuote, ListChecks, ShieldQuestion, Info, SearchCheck, ThumbsDown, Send, Search, Microscope, Percent, FileText } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


interface ClaimCardProps {
  result: ClaimVerificationResult;
}

const StatusIcon = ({ status }: { status: ClaimStatus }) => {
  switch (status) {
    case 'supported':
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case 'contradicted':
      return <XCircle className="h-5 w-5 text-red-600" />;
    case 'neutral':
      return <HelpCircle className="h-5 w-5 text-yellow-600" />;
    case 'error':
      return <AlertTriangle className="h-5 w-5 text-destructive" />;
    case 'pending':
      return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    default:
      return <HelpCircle className="h-5 w-5 text-gray-500" />;
  }
};

const getStatusBadgeVariant = (status: ClaimStatus): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'supported':
      return 'default'; 
    case 'contradicted':
      return 'destructive';
    case 'neutral':
      return 'secondary'; 
    default:
      return 'outline';
  }
}

const getStatusColorClass = (status: ClaimStatus): string => {
  switch (status) {
    case 'supported':
      return 'bg-green-100 border-green-500 text-green-700';
    case 'contradicted':
      return 'bg-red-100 border-red-500 text-red-700';
    case 'neutral':
      return 'bg-yellow-100 border-yellow-500 text-yellow-700';
    case 'error':
      return 'bg-destructive/10 border-destructive text-destructive';
    default:
      return 'bg-gray-100 border-gray-500 text-gray-700';
  }
}

const QualityMetricItem: React.FC<{ label: string; value?: string | number | null; assessment?: string }> = ({ label, value, assessment }) => {
  if (!value && !assessment) return null;
  return (
    <div className="grid grid-cols-3 gap-1 text-xs">
      <span className="font-semibold col-span-1">{label}:</span>
      <span className="col-span-2 capitalize">{value || assessment}</span>
    </div>
  );
};


export function ClaimCard({ result }: ClaimCardProps) {
  const { toast } = useToast();

  if (result.id === 'no_claims_found') {
    return (
      <Card className="my-4 shadow-md border-l-4 border-blue-500">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-blue-700 flex items-center">
            <Info className="mr-2 h-5 w-5" />
            Information
            </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-body text-muted-foreground">{result.claimText}</p>
          {result.explanation && <p className="font-body mt-2 text-sm">{result.explanation}</p>}
        </CardContent>
      </Card>
    );
  }
  
  const trustScorePercentage = result.trustAnalysis?.score !== undefined ? result.trustAnalysis.score * 100 : null;
  const verdictConfidencePercentage = result.verdictConfidence !== undefined ? result.verdictConfidence * 100 : null;

  const handleDisputeVerdict = () => {
    toast({
      title: "Feedback Recorded",
      description: `Your dispute for the claim "${result.claimText.substring(0, 50)}..." has been noted. Thank you for your feedback!`,
      variant: "default"
    });
  };

  const handleSubmitBetterSource = () => {
     toast({
      title: "Submit Source",
      description: `The ability to submit a better source for "${result.claimText.substring(0,50)}..." is coming soon.`,
      variant: "default"
    });
  };


  return (
    <TooltipProvider>
    <Card className={`my-6 shadow-lg rounded-lg overflow-hidden border-l-4 ${getStatusColorClass(result.status).split(' ')[1]}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="font-headline text-xl mb-1 pr-2">{result.claimText}</CardTitle>
          <div className="flex flex-col items-end space-y-1">
            <Badge variant={getStatusBadgeVariant(result.status)} className={`capitalize whitespace-nowrap px-3 py-1 text-sm ${getStatusColorClass(result.status)}`}>
              <StatusIcon status={result.status} />
              <span className="ml-1.5">{result.status}</span>
            </Badge>
            {verdictConfidencePercentage !== null && (
               <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs px-2 py-0.5 border-primary/50 text-primary/80">
                    <Percent className="mr-1 h-3 w-3" /> Conf: {verdictConfidencePercentage.toFixed(0)}%
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>AI Confidence in this verdict: {verdictConfidencePercentage.toFixed(0)}%</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        {result.isProcessing && <CardDescription className="font-body text-sm text-primary">Processing...</CardDescription>}
        {result.errorMessage && <CardDescription className="font-body text-sm text-destructive">Error: {result.errorMessage}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-0">
        <Accordion type="single" collapsible className="w-full" defaultValue="explanation">
          {result.explanation && (
            <AccordionItem value="explanation">
              <AccordionTrigger className="font-headline text-base hover:no-underline text-primary">
                <MessageSquareQuote className="mr-2 h-5 w-5" /> AI Explanation
              </AccordionTrigger>
              <AccordionContent className="font-body text-sm leading-relaxed whitespace-pre-wrap p-4 bg-muted/30 rounded-md">
                {result.explanation}
                {result.nuanceDescription && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="font-semibold text-xs text-muted-foreground mb-1">Nuance / Ambiguity:</p>
                    <p className="italic text-xs">{result.nuanceDescription}</p>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          )}

          {result.claimQualityMetrics && (
            <AccordionItem value="claim-quality">
              <AccordionTrigger className="font-headline text-base hover:no-underline text-primary">
                <Microscope className="mr-2 h-5 w-5" /> Claim Quality Analysis
              </AccordionTrigger>
              <AccordionContent className="font-body text-sm p-4 bg-muted/30 rounded-md space-y-2">
                <p className="text-xs italic mb-2">{result.claimQualityMetrics.overallAssessment}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                  <QualityMetricItem label="Atomicity" value={result.claimQualityMetrics.atomicity} />
                  <QualityMetricItem label="Fluency" value={result.claimQualityMetrics.fluency} />
                  <QualityMetricItem label="Decontextualization" value={result.claimQualityMetrics.decontextualization} />
                  <QualityMetricItem label="Faithfulness" value={result.claimQualityMetrics.faithfulness} />
                  <QualityMetricItem label="Focus" value={result.claimQualityMetrics.focus} />
                  <QualityMetricItem label="Check-worthiness" value={result.claimQualityMetrics.checkworthiness} />
                </div>
              </AccordionContent>
            </AccordionItem>
          )}


          {result.trustAnalysis && (result.trustAnalysis.reasoning || trustScorePercentage !== null) && (
            <AccordionItem value="trust-analysis">
              <AccordionTrigger className="font-headline text-base hover:no-underline text-primary">
                <ShieldQuestion className="mr-2 h-5 w-5" /> Source Trust Analysis
              </AccordionTrigger>
              <AccordionContent className="font-body text-sm p-4 bg-muted/30 rounded-md space-y-3">
                 {result.trustAnalysis.generatedSearchQuery && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Search className="mr-1.5 h-3.5 w-3.5" /> 
                    <span className="italic">Search query used: "{result.trustAnalysis.generatedSearchQuery}"</span>
                  </div>
                )}
                {trustScorePercentage !== null && (
                  <div>
                    <p className="font-medium">Overall Trust Score (from live DuckDuckGo search): {trustScorePercentage.toFixed(0)}%</p>
                    <Progress value={trustScorePercentage} className="h-2 mt-1" 
                      aria-label={`Trust score ${trustScorePercentage.toFixed(0)}%`} />
                  </div>
                )}
                {result.trustAnalysis.reasoning && (
                   <p className="mt-2"><span className="font-medium">Reasoning:</span> {result.trustAnalysis.reasoning}</p>
                )}
              </AccordionContent>
            </AccordionItem>
          )}
          
          {result.sources && result.sources.length > 0 && (
            <AccordionItem value="sources">
              <AccordionTrigger className="font-headline text-base hover:no-underline text-primary">
                <SearchCheck className="mr-2 h-5 w-5" /> Evidence Sources (from DuckDuckGo)
              </AccordionTrigger>
              <AccordionContent className="font-body text-sm p-4 bg-muted/30 rounded-md">
                <ul className="space-y-3">
                  {result.sources.map((source: MockSource) => (
                    <li key={source.id} className="border-b border-border/50 pb-3 last:border-b-0 last:pb-0">
                      <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-medium block truncate text-base" title={source.url}>
                        {source.title || "Untitled Source"} <ExternalLink className="inline h-4 w-4 ml-1" />
                      </a>
                      {source.shortSummary && <p className="text-xs mt-1 text-muted-foreground">{source.shortSummary}</p>}
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-border/50 bg-card/50 p-4">
        <Button variant="outline" size="sm" className="font-headline text-accent border-accent hover:bg-accent/10 hover:text-accent w-full sm:w-auto" onClick={handleDisputeVerdict}>
          <ThumbsDown className="mr-2 h-4 w-4" />
          Dispute Verdict
        </Button>
        <Button variant="outline" size="sm" className="font-headline w-full sm:w-auto" onClick={handleSubmitBetterSource}>
           <Send className="mr-2 h-4 w-4" />
          Submit Better Source
        </Button>
      </CardFooter>
    </Card>
    </TooltipProvider>
  );
}
