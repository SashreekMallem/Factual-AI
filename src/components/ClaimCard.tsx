
'use client';

import type { ClaimVerificationResult, ClaimStatus, MockSource } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle2, XCircle, HelpCircle, AlertTriangle, Loader2, ExternalLink, MessageSquareQuote, ListChecks, ShieldCheck, Info, SearchCheck, ThumbsDown, Send, Search, Microscope, Percent, FileText, BookOpen, Brain, BarChart3, AlertOctagon, Atom, Blend, Languages, TestTube2, Pin, History, Quote, Sigma, CheckCheck, Sparkles, ListTree, FileSignature, Scale, Lightbulb, CircleDotDashed, CircleSlash, Zap, PackageCheck } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ClaimCardProps {
  result: ClaimVerificationResult;
}

const StatusIcon = ({ status, size = "h-7 w-7" }: { status: ClaimStatus; size?: string }) => {
  const iconClass = `${size} mr-2.5 shrink-0`;
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

const getStatusColors = (status: ClaimStatus): { badge: string; border: string; text: string; progress: string; bg: string; headerBg: string; } => {
  switch (status) {
    case 'supported':
      return { badge: 'bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-300 border-green-500 dark:border-green-600', border: 'border-green-500 dark:border-green-500', text: 'text-green-600 dark:text-green-400', progress: 'bg-green-500', bg: 'bg-green-50 dark:bg-green-900/20', headerBg: 'bg-gradient-to-r from-green-500/20 via-green-500/10 to-card' };
    case 'contradicted':
      return { badge: 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 border-red-500 dark:border-red-600', border: 'border-red-500 dark:border-red-500', text: 'text-red-600 dark:text-red-400', progress: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-900/20', headerBg: 'bg-gradient-to-r from-red-500/20 via-red-500/10 to-card' };
    case 'neutral':
      return { badge: 'bg-yellow-100 dark:bg-yellow-800/60 text-yellow-700 dark:text-yellow-300 border-yellow-500 dark:border-yellow-600', border: 'border-yellow-500 dark:border-yellow-500', text: 'text-yellow-600 dark:text-yellow-400', progress: 'bg-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', headerBg: 'bg-gradient-to-r from-yellow-500/20 via-yellow-500/10 to-card' };
    case 'error':
      return { badge: 'bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300 border-orange-500 dark:border-orange-600', border: 'border-orange-500 dark:border-orange-500', text: 'text-orange-600 dark:text-orange-400', progress: 'bg-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', headerBg: 'bg-gradient-to-r from-orange-500/20 via-orange-500/10 to-card' };
    default:
      return { badge: 'bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 border-gray-400 dark:border-gray-500', border: 'border-gray-500 dark:border-gray-500', text: 'text-gray-600 dark:text-gray-400', progress: 'bg-gray-500', bg: 'bg-gray-50 dark:bg-gray-800/20', headerBg: 'bg-gradient-to-r from-gray-500/10 via-gray-500/5 to-card' };
  }
};

const QualityMetricItem: React.FC<{ label: string; value?: string | number | null; Icon: React.ElementType; tooltipText: string }> = ({ label, value, Icon, tooltipText }) => {
  if (!value && value !== 0) return null; // Also render if value is 0, e.g. for scores
  const rating = String(value).toLowerCase();
  let colorClass = "text-muted-foreground";
  if (['high', 'good', 'specific'].includes(rating)) colorClass = "text-green-600 dark:text-green-400";
  else if (['medium', 'fair', 'neutral'].includes(rating)) colorClass = "text-yellow-600 dark:text-yellow-400";
  else if (['low', 'poor', 'broad', 'na'].includes(rating)) colorClass = "text-red-600 dark:text-red-400";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center space-x-2 p-2.5 bg-background/60 dark:bg-background/30 rounded-lg border border-border/50 hover:shadow-md transition-shadow">
          <Icon className={`h-5 w-5 shrink-0 ${colorClass}`} />
          <span className="font-medium text-sm text-foreground/80">{label}:</span>
          <span className={`text-sm font-bold capitalize ${colorClass}`}>{String(value)}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="bg-popover text-popover-foreground shadow-lg rounded-md p-2 max-w-xs z-50">
        <p>{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  );
};

interface InvestigationStepProps {
  stepNumber: number;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  value: string;
}

const InvestigationStep: React.FC<InvestigationStepProps> = ({ stepNumber, title, icon: Icon, children, defaultOpen = false, value }) => (
  <AccordionItem value={value} className="border-b-0 mb-1 overflow-hidden rounded-lg shadow-sm bg-card border border-border/50">
    <AccordionTrigger className="font-headline text-lg hover:no-underline text-primary hover:bg-primary/5 dark:hover:bg-primary/10 px-4 py-3.5 rounded-t-lg data-[state=open]:bg-primary/10 data-[state=open]:text-primary transition-colors">
      <div className="flex items-center">
        <span className="mr-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary/80 text-primary-foreground text-sm font-bold shrink-0">{stepNumber}</span>
        <Icon className="mr-3 h-5 w-5 text-primary/90 shrink-0" /> {title}
      </div>
    </AccordionTrigger>
    <AccordionContent className="font-body text-sm leading-relaxed p-4 md:p-5 bg-muted/20 dark:bg-muted/10 rounded-b-lg border-t border-primary/20">
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
            System Communiqué
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
      title: "Feedback Protocol Engaged",
      description: `Your dispute for the claim has been logged for system calibration. Verity Engine learns from critical human oversight.`,
      variant: "default",
    });
  };

  const handleSubmitBetterSource = () => {
     toast({
      title: "Source Uplink Initialized",
      description: `Thank you for contributing to the Verity Engine's knowledge base. The source submission channel is under continuous refinement.`,
      variant: "default",
    });
  };

  const validSourceTypesToExclude = ['NoSpecificResults', 'APIError', 'ToolExecutionError', 'NoResult', 'Error'];
  const actualSources = result.sources?.filter(s => !validSourceTypesToExclude.includes(s.type ?? ''));
  const hasActualSources = actualSources && actualSources.length > 0;


  return (
    <TooltipProvider>
      <Card className={`my-8 shadow-2xl rounded-xl overflow-hidden border-2 ${statusColors.border} ${statusColors.bg}`}>
        <CardHeader className={`p-5 sm:p-6 border-b-2 ${statusColors.border} ${statusColors.headerBg}`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0 mb-3">
            <div className="flex items-start flex-1 min-w-0"> {/* Changed items-center to items-start */}
                <Quote className="h-7 w-7 text-primary mr-3 shrink-0 mt-1" /> {/* Added mt-1 for alignment */}
                <CardTitle className="font-headline text-xl md:text-2xl leading-tight text-foreground pr-2 flex-1">{result.claimText}</CardTitle>
            </div>
            <div className="flex flex-col items-start sm:items-end space-y-1.5 shrink-0 self-start sm:self-center"> {/* Added self-start / self-center */}
              <Badge className={`capitalize whitespace-nowrap px-4 py-2 text-md font-bold shadow-md ${statusColors.badge} border-2`}>
                <StatusIcon status={result.status} />
                <span className="ml-1">{result.status}</span>
              </Badge>
            </div>
          </div>

          {verdictConfidencePercentage !== null && (
            <div className="mt-2 p-3 bg-card/50 dark:bg-card/20 rounded-lg border border-border/50">
              <div className="flex items-center justify-between mb-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center cursor-help">
                      <Brain className="h-5 w-5 text-primary/90 mr-2" />
                      <span className="text-sm font-semibold text-primary/90">AI Verdict Confidence:</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-popover text-popover-foreground shadow-lg rounded-md p-2 max-w-xs z-50">
                    <p>The AI's calculated confidence level in the assigned verdict for this claim, based on the totality of analyzed evidence.</p>
                  </TooltipContent>
                </Tooltip>
                <span className={`text-lg font-bold ${statusColors.text}`}>{verdictConfidencePercentage.toFixed(0)}%</span>
              </div>
              <Progress value={verdictConfidencePercentage} className="h-2.5 rounded-full" indicatorClassName={statusColors.progress} aria-label={`AI verdict confidence ${verdictConfidencePercentage.toFixed(0)}%`} />
            </div>
          )}

          {result.isProcessing && <CardDescription className="font-body text-sm text-primary mt-2 flex items-center"><Loader2 className="animate-spin h-4 w-4 mr-2"/>Processing...</CardDescription>}
          {result.errorMessage && (
            <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-700 rounded-md text-sm text-red-700 dark:text-red-300 flex items-start space-x-2">
              <AlertOctagon className="h-5 w-5 shrink-0 mt-0.5"/>
              <div>
                <p className="font-semibold">Claim Processing Error:</p>
                <p>{result.errorMessage}</p>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Accordion type="single" collapsible className="w-full" defaultValue="step-1-verdict">
            
            <InvestigationStep stepNumber={1} title="Verdict Summary & Explanation" icon={FileSignature} value="step-1-verdict" defaultOpen>
              <p className="whitespace-pre-wrap text-base leading-relaxed">{result.explanation || "No detailed explanation available."}</p>
              
              {result.status === 'contradicted' && result.correctedInformation && (
                <div className="mt-5 pt-4 border-t-2 border-green-500/30 bg-green-50 dark:bg-green-900/30 p-4 rounded-lg shadow">
                  <h4 className="font-headline text-md text-green-700 dark:text-green-300 mb-2 flex items-center">
                    <CheckCheck className="mr-2 h-6 w-6 text-green-600 dark:text-green-400" />
                    AI's Corrected Finding:
                  </h4>
                  <p className="font-body text-base text-green-800 dark:text-green-200 italic">{result.correctedInformation}</p>
                </div>
              )}

              {result.nuanceDescription && (
                <div className="mt-4 pt-3 border-t border-border/70">
                  <h4 className="font-semibold text-sm text-foreground/90 mb-1.5 flex items-center">
                    <Blend className="mr-2 h-4 w-4 text-accent" />
                    Contextual Nuances & Ambiguities:
                  </h4>
                  <p className="italic text-xs text-muted-foreground bg-accent/5 dark:bg-accent/10 p-3 rounded-md">{result.nuanceDescription}</p>
                </div>
              )}
            </InvestigationStep>

            <InvestigationStep stepNumber={2} title="Evidence Trail & Analysis" icon={ListTree} value="step-2-evidence">
                {result.claimQualityMetrics && (
                  <div className="mb-5">
                    <h3 className="font-headline text-md text-foreground mb-2 flex items-center"><Microscope className="mr-2 h-5 w-5 text-primary/80"/>Linguistic Quality Assessment:</h3>
                    <p className="text-xs italic text-muted-foreground mb-3 p-2.5 bg-primary/5 dark:bg-primary/10 rounded-md border border-primary/20">
                      <span className="font-semibold">AI's Overall Assessment:</span> {result.claimQualityMetrics.overallAssessment}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <QualityMetricItem label="Atomicity" value={result.claimQualityMetrics.atomicity} Icon={Atom} tooltipText="Is the claim a single, indivisible factual statement?" />
                      <QualityMetricItem label="Fluency" value={result.claimQualityMetrics.fluency} Icon={Languages} tooltipText="Is the claim grammatically correct and easy to understand?" />
                      <QualityMetricItem label="Decontextualization" value={result.claimQualityMetrics.decontextualization} Icon={Pin} tooltipText="Is the claim understandable on its own, without surrounding text?" />
                      <QualityMetricItem label="Faithfulness" value={result.claimQualityMetrics.faithfulness} Icon={History} tooltipText="Does the claim accurately represent information from the original text?" />
                      <QualityMetricItem label="Focus" value={result.claimQualityMetrics.focus} Icon={TestTube2} tooltipText="Is the claim specific and not overly broad or vague?" />
                      <QualityMetricItem label="Check-worthiness" value={result.claimQualityMetrics.checkworthiness} Icon={ShieldCheck} tooltipText="Is it a factual statement that can be verified against evidence?" />
                    </div>
                  </div>
                )}
                
                <div className="my-5 pt-4 border-t border-border/60">
                    <h3 className="font-headline text-md text-foreground mb-3 flex items-center"><SearchCheck className="mr-2 h-5 w-5 text-primary/80"/>Source Trust & Provenance Simulation:</h3>
                    {result.trustAnalysis?.generatedSearchQuery && (
                      <div className="mb-3 text-sm text-muted-foreground italic p-3 bg-background dark:bg-background/40 rounded-md border border-border/60 shadow-sm">
                        <Lightbulb className="inline mr-2 h-4 w-4 text-yellow-500" /> 
                        <span className="font-semibold">AI initiated evidence search with query:</span> "{result.trustAnalysis.generatedSearchQuery}"
                      </div>
                    )}
                    {trustScorePercentage !== null && (
                      <div className="mb-4 p-3 bg-card rounded-lg border border-border/60 shadow-sm">
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
                    {result.trustAnalysis?.reasoning && (
                       <div className="space-y-1">
                          <h4 className="font-semibold text-sm text-foreground/90 flex items-center"><Sigma className="mr-2 h-4 w-4 text-accent"/>AI Reasoning on Source Trust:</h4>
                          <blockquote className="whitespace-pre-wrap text-xs leading-relaxed bg-accent/10 dark:bg-accent/20 p-3 rounded-md border-l-4 border-accent dark:border-accent/70 text-accent-foreground/80 dark:text-accent-foreground/70 shadow-sm">{result.trustAnalysis.reasoning}</blockquote>
                       </div>
                    )}
                </div>

                {hasActualSources && (
                  <div className="my-5 pt-4 border-t border-border/60">
                    <h3 className="font-headline text-md text-foreground mb-3 flex items-center"><BookOpen className="mr-2 h-5 w-5 text-primary/80"/>Retrieved Evidence Snippets (from Search API):</h3>
                    <ul className="space-y-3">
                      {actualSources.map((source: MockSource) => (
                        <li key={source.id} className="p-3.5 bg-background/70 dark:bg-background/40 rounded-lg border border-border/70 shadow-sm hover:shadow-md transition-shadow">
                          <a href={source.url} target="_blank" rel="noopener noreferrer" className="group text-accent hover:text-accent/80 dark:text-accent-light dark:hover:text-accent-light/80 font-medium block text-base mb-1.5" title={source.url}>
                            {source.title || "Untitled Source"} <ExternalLink className="inline h-4 w-4 ml-1 opacity-70 group-hover:opacity-100 transition-opacity" />
                          </a>
                          {source.shortSummary && <p className="text-xs text-muted-foreground line-clamp-3">{source.shortSummary}</p>}
                          {source.type && <Badge variant="outline" className="mt-2 text-xs py-0.5 px-1.5 bg-background dark:bg-background/50">{source.type}</Badge>}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 text-xs text-muted-foreground text-center italic">Note: Source links from the Search API may sometimes be outdated or lead to summaries rather than full articles.</p>
                  </div>
                )}
            </InvestigationStep>
            
          </Accordion>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-end items-center space-y-3 sm:space-y-0 sm:space-x-3 p-4 border-t-2 border-border/60 bg-muted/30 dark:bg-muted/20">
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
