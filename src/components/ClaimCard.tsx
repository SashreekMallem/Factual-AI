
'use client';

import type { ClaimVerificationResult, ClaimStatus, MockSource, ClaimQualityMetrics } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle2, XCircle, HelpCircle, AlertTriangle, Loader2, ExternalLink, MessageSquareQuote, ListChecks, ShieldCheck, Info, SearchCheck, ThumbsDown, Send, Search, Microscope, Percent, FileText, BookOpen, Brain, BarChart3, AlertOctagon, Atom, Blend, Languages, TestTube2, Pin, History } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ClaimCardProps {
  result: ClaimVerificationResult;
}

const StatusIcon = ({ status, size = "h-6 w-6" }: { status: ClaimStatus; size?: string }) => {
  const iconClass = `${size} mr-2`;
  switch (status) {
    case 'supported':
      return <CheckCircle2 className={`${iconClass} text-green-500 dark:text-green-400`} />;
    case 'contradicted':
      return <XCircle className={`${iconClass} text-red-500 dark:text-red-400`} />;
    case 'neutral':
      return <HelpCircle className={`${iconClass} text-yellow-500 dark:text-yellow-400`} />;
    case 'error':
      return <AlertTriangle className={`${iconClass} text-orange-500 dark:text-orange-400`} />;
    case 'pending':
      return <Loader2 className={`${iconClass} animate-spin text-primary`} />;
    default:
      return <HelpCircle className={`${iconClass} text-gray-500 dark:text-gray-400`} />;
  }
};

const getStatusColors = (status: ClaimStatus): { badge: string; border: string; text: string; progress: string } => {
  switch (status) {
    case 'supported':
      return { badge: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-green-400 dark:border-green-600', border: 'border-green-500 dark:border-green-500', text: 'text-green-600 dark:text-green-400', progress: 'bg-green-500' };
    case 'contradicted':
      return { badge: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-red-400 dark:border-red-600', border: 'border-red-500 dark:border-red-500', text: 'text-red-600 dark:text-red-400', progress: 'bg-red-500' };
    case 'neutral':
      return { badge: 'bg-yellow-100 dark:bg-yellow-800/50 text-yellow-700 dark:text-yellow-300 border-yellow-400 dark:border-yellow-500', border: 'border-yellow-500 dark:border-yellow-500', text: 'text-yellow-600 dark:text-yellow-400', progress: 'bg-yellow-500' };
    case 'error':
      return { badge: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 border-orange-400 dark:border-orange-600', border: 'border-orange-500 dark:border-orange-500', text: 'text-orange-600 dark:text-orange-400', progress: 'bg-orange-500' };
    default:
      return { badge: 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-gray-400 dark:border-gray-500', border: 'border-gray-500 dark:border-gray-500', text: 'text-gray-600 dark:text-gray-400', progress: 'bg-gray-500' };
  }
};

const QualityMetricItem: React.FC<{ label: string; value?: string | number | null; Icon: React.ElementType }> = ({ label, value, Icon }) => {
  if (!value) return null;
  const rating = String(value).toLowerCase();
  let colorClass = "text-muted-foreground";
  if (['high', 'good', 'specific'].includes(rating)) colorClass = "text-green-600 dark:text-green-400";
  else if (['medium', 'fair', 'neutral'].includes(rating)) colorClass = "text-yellow-600 dark:text-yellow-400";
  else if (['low', 'poor', 'broad', 'na'].includes(rating)) colorClass = "text-red-600 dark:text-red-400";

  return (
    <div className="flex items-center space-x-2 p-2 bg-background/50 dark:bg-background/20 rounded-md">
      <Icon className={`h-5 w-5 ${colorClass}`} />
      <span className="font-medium text-sm text-foreground/80">{label}:</span>
      <span className={`text-sm font-semibold capitalize ${colorClass}`}>{value}</span>
    </div>
  );
};

const DetailSection: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, icon: Icon, children, defaultOpen = false }) => (
  <AccordionItem value={title.toLowerCase().replace(/\s+/g, '-')}>
    <AccordionTrigger className="font-headline text-lg hover:no-underline text-primary hover:bg-primary/5 dark:hover:bg-primary/10 px-4 py-3 rounded-t-md">
      <div className="flex items-center">
        <Icon className="mr-3 h-5 w-5" /> {title}
      </div>
    </AccordionTrigger>
    <AccordionContent className="font-body text-sm leading-relaxed p-4 bg-muted/20 dark:bg-muted/10 rounded-b-md border-t border-border/50">
      {children}
    </AccordionContent>
  </AccordionItem>
);

export function ClaimCard({ result }: ClaimCardProps) {
  const { toast } = useToast();
  const statusColors = getStatusColors(result.status);

  if (result.id === 'no_claims_found') {
    return (
      <Card className="my-6 shadow-lg rounded-xl border-l-4 border-primary dark:border-primary-dark overflow-hidden">
        <CardHeader className="bg-primary/5 dark:bg-primary/10 p-5">
          <CardTitle className="font-headline text-xl text-primary dark:text-primary-light flex items-center">
            <Info className="mr-3 h-6 w-6" />
            System Notification
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <p className="font-body text-base text-foreground/90">{result.claimText}</p>
          {result.explanation && <p className="font-body mt-2 text-sm text-muted-foreground">{result.explanation}</p>}
        </CardContent>
      </Card>
    );
  }
  
  const trustScorePercentage = result.trustAnalysis?.score !== undefined ? result.trustAnalysis.score * 100 : null;
  const verdictConfidencePercentage = result.verdictConfidence !== undefined ? result.verdictConfidence * 100 : null;

  const handleDisputeVerdict = () => {
    toast({
      title: "Feedback Noted",
      description: `Your dispute for the claim has been recorded. This helps us improve Verity Engine!`,
      variant: "default",
    });
  };

  const handleSubmitBetterSource = () => {
     toast({
      title: "Submit Source",
      description: `Thank you! Source submission feature is under development and coming soon.`,
      variant: "default",
    });
  };

  return (
    <TooltipProvider>
      <Card className={`my-8 shadow-2xl rounded-xl overflow-hidden border-2 ${statusColors.border} bg-card`}>
        <CardHeader className={`p-5 sm:p-6 border-b-2 ${statusColors.border} bg-gradient-to-r ${result.status === 'supported' ? 'from-green-50 dark:from-green-900/30' : result.status === 'contradicted' ? 'from-red-50 dark:from-red-900/30' : result.status === 'neutral' ? 'from-yellow-50 dark:from-yellow-900/30' : 'from-gray-50 dark:from-gray-800/30'} to-card`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
            <CardTitle className="font-headline text-xl md:text-2xl leading-tight text-foreground pr-2 flex-1">{result.claimText}</CardTitle>
            <div className="flex flex-col items-start sm:items-end space-y-1.5 shrink-0">
              <Badge className={`capitalize whitespace-nowrap px-3 py-1.5 text-sm font-semibold shadow-sm ${statusColors.badge} border`}>
                <StatusIcon status={result.status} size="h-5 w-5" />
                <span className="ml-1.5">{result.status}</span>
              </Badge>
              {verdictConfidencePercentage !== null && (
                 <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-background/70 dark:bg-background/30 border border-border/50">
                       <Brain className="h-4 w-4 text-primary/80" />
                       <span className="text-xs font-medium text-primary/90">AI Confidence:</span>
                       <span className={`text-xs font-bold ${statusColors.text}`}>{verdictConfidencePercentage.toFixed(0)}%</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-popover text-popover-foreground shadow-lg rounded-md p-2">
                    <p>AI's confidence level in this verdict.</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
          {result.isProcessing && <CardDescription className="font-body text-sm text-primary mt-2">Processing...</CardDescription>}
          {result.errorMessage && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded-md text-sm text-red-700 dark:text-red-300 flex items-start space-x-2">
              <AlertOctagon className="h-5 w-5 shrink-0 mt-0.5"/>
              <div>
                <p className="font-semibold">Error encountered:</p>
                <p>{result.errorMessage}</p>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Accordion type="single" collapsible className="w-full" defaultValue="explanation">
            
            <DetailSection title="AI Verdict Explanation" icon={MessageSquareQuote} defaultOpen>
              <p className="whitespace-pre-wrap">{result.explanation || "No detailed explanation available."}</p>
              {result.nuanceDescription && (
                <div className="mt-4 pt-3 border-t border-border/70">
                  <h4 className="font-semibold text-sm text-foreground/90 mb-1.5 flex items-center">
                    <Blend className="mr-2 h-4 w-4 text-accent" />
                    Context & Nuance:
                  </h4>
                  <p className="italic text-xs text-muted-foreground bg-accent/5 dark:bg-accent/10 p-3 rounded-md">{result.nuanceDescription}</p>
                </div>
              )}
            </DetailSection>

            {result.claimQualityMetrics && (
              <DetailSection title="Claim Linguistic Quality" icon={Microscope}>
                <p className="text-xs italic text-muted-foreground mb-3 p-2 bg-primary/5 dark:bg-primary/10 rounded-md border border-primary/20">
                  <span className="font-semibold">Overall Assessment:</span> {result.claimQualityMetrics.overallAssessment}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <QualityMetricItem label="Atomicity" value={result.claimQualityMetrics.atomicity} Icon={Atom} />
                  <QualityMetricItem label="Fluency" value={result.claimQualityMetrics.fluency} Icon={Languages} />
                  <QualityMetricItem label="Decontextualization" value={result.claimQualityMetrics.decontextualization} Icon={Pin} />
                  <QualityMetricItem label="Faithfulness" value={result.claimQualityMetrics.faithfulness} Icon={History} />
                  <QualityMetricItem label="Focus" value={result.claimQualityMetrics.focus} Icon={TestTube2} />
                  <QualityMetricItem label="Check-worthiness" value={result.claimQualityMetrics.checkworthiness} Icon={ShieldCheck} />
                </div>
              </DetailSection>
            )}

            {result.trustAnalysis && (result.trustAnalysis.reasoning || trustScorePercentage !== null) && (
              <DetailSection title="Source Trust & Provenance" icon={SearchCheck}>
                {result.trustAnalysis.generatedSearchQuery && (
                  <div className="mb-3 text-xs text-muted-foreground italic p-2 bg-background dark:bg-background/30 rounded-md border border-border/50">
                    <Search className="inline mr-1.5 h-3.5 w-3.5" /> 
                    AI-generated search query for evidence: "{result.trustAnalysis.generatedSearchQuery}"
                  </div>
                )}
                {trustScorePercentage !== null && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-semibold text-sm text-foreground/90">Estimated Source Trust Score:</p>
                      <p className={`font-bold text-lg ${trustScorePercentage > 70 ? 'text-green-500' : trustScorePercentage > 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {trustScorePercentage.toFixed(0)}%
                      </p>
                    </div>
                    <Progress value={trustScorePercentage} className="h-3 rounded-full" 
                      indicatorClassName={`${trustScorePercentage > 70 ? 'bg-green-500' : trustScorePercentage > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      aria-label={`Trust score ${trustScorePercentage.toFixed(0)}%`} />
                  </div>
                )}
                {result.trustAnalysis.reasoning && (
                   <div className="space-y-1">
                      <h4 className="font-semibold text-sm text-foreground/90 flex items-center"><BarChart3 className="mr-2 h-4 w-4 text-accent"/>AI Reasoning on Sources:</h4>
                      <p className="whitespace-pre-wrap text-xs leading-relaxed bg-accent/5 dark:bg-accent/10 p-3 rounded-md border border-accent/20">{result.trustAnalysis.reasoning}</p>
                   </div>
                )}
              </DetailSection>
            )}
            
            {result.sources && result.sources.length > 0 && (
              <DetailSection title="Supporting Evidence (from DuckDuckGo)" icon={BookOpen}>
                <ul className="space-y-4">
                  {result.sources.map((source: MockSource) => (
                    <li key={source.id} className="p-3 bg-background/50 dark:bg-background/20 rounded-lg border border-border/70 shadow-sm">
                      <a href={source.url} target="_blank" rel="noopener noreferrer" className="group text-accent hover:text-accent/80 dark:text-accent-light dark:hover:text-accent-light/80 font-medium block text-base mb-1" title={source.url}>
                        {source.title || "Untitled Source"} <ExternalLink className="inline h-4 w-4 ml-1 opacity-70 group-hover:opacity-100 transition-opacity" />
                      </a>
                      {source.shortSummary && <p className="text-xs text-muted-foreground line-clamp-3">{source.shortSummary}</p>}
                       {source.type && <Badge variant="outline" className="mt-2 text-xs">{source.type}</Badge>}
                    </li>
                  ))}
                </ul>
                 <p className="mt-4 text-xs text-muted-foreground text-center italic">Note: Source links are from DuckDuckGo's Instant Answer API and may sometimes be outdated or lead to summaries.</p>
              </DetailSection>
            )}
          </Accordion>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-end items-center space-y-2 sm:space-y-0 sm:space-x-3 p-4 border-t-2 border-border/60 bg-muted/20 dark:bg-muted/10">
          <Button variant="outline" size="sm" className="font-headline text-sm text-accent border-accent hover:bg-accent/10 hover:text-accent w-full sm:w-auto" onClick={handleDisputeVerdict}>
            <ThumbsDown className="mr-2 h-4 w-4" />
            Dispute Verdict
          </Button>
          <Button variant="outline" size="sm" className="font-headline text-sm w-full sm:w-auto" onClick={handleSubmitBetterSource}>
             <Send className="mr-2 h-4 w-4" />
            Submit Better Source
          </Button>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}
