'use client';

import { ClaimVerificationResult, ClaimStatus, MockSource } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle2, XCircle, HelpCircle, AlertTriangle, Loader2, ExternalLink, MessageSquareQuote, ListChecks, ShieldQuestion, Info } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

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
      return 'default'; // Consider custom variant for green
    case 'contradicted':
      return 'destructive';
    case 'neutral':
      return 'secondary'; // Consider custom variant for yellow/orange
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

export function ClaimCard({ result }: ClaimCardProps) {
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

  return (
    <Card className={`my-6 shadow-lg rounded-lg overflow-hidden border-l-4 ${getStatusColorClass(result.status).split(' ')[1]}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="font-headline text-xl mb-1 pr-2">{result.claimText}</CardTitle>
          <Badge variant={getStatusBadgeVariant(result.status)} className={`capitalize whitespace-nowrap px-3 py-1 text-sm ${getStatusColorClass(result.status)}`}>
            <StatusIcon status={result.status} />
            <span className="ml-1.5">{result.status}</span>
          </Badge>
        </div>
        {result.isProcessing && <CardDescription className="font-body text-sm text-primary">Processing...</CardDescription>}
        {result.errorMessage && <CardDescription className="font-body text-sm text-destructive">Error: {result.errorMessage}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-0">
        <Accordion type="single" collapsible className="w-full">
          {result.explanation && (
            <AccordionItem value="explanation">
              <AccordionTrigger className="font-headline text-base hover:no-underline text-primary">
                <MessageSquareQuote className="mr-2 h-5 w-5" /> AI Explanation
              </AccordionTrigger>
              <AccordionContent className="font-body text-sm leading-relaxed whitespace-pre-wrap p-4 bg-muted/30 rounded-md">
                {result.explanation}
              </AccordionContent>
            </AccordionItem>
          )}

          {result.trustAnalysis && (
            <AccordionItem value="trust-analysis">
              <AccordionTrigger className="font-headline text-base hover:no-underline text-primary">
                <ShieldQuestion className="mr-2 h-5 w-5" /> Source Trust Analysis
              </AccordionTrigger>
              <AccordionContent className="font-body text-sm p-4 bg-muted/30 rounded-md space-y-3">
                {result.trustAnalysis.sourceUrl && (
                  <p>
                    Analyzed Source: <a href={result.trustAnalysis.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline break-all">{result.trustAnalysis.sourceUrl} <ExternalLink className="inline h-3 w-3 ml-0.5" /></a>
                  </p>
                )}
                {trustScorePercentage !== null && (
                  <div>
                    <p>Trust Score: {trustScorePercentage.toFixed(0)}%</p>
                    <Progress value={trustScorePercentage} className="h-2 mt-1" />
                  </div>
                )}
                {result.trustAnalysis.reasoning && (
                   <p>Reasoning: {result.trustAnalysis.reasoning}</p>
                )}
              </AccordionContent>
            </AccordionItem>
          )}
          
          {result.sources && result.sources.length > 0 && (
            <AccordionItem value="sources">
              <AccordionTrigger className="font-headline text-base hover:no-underline text-primary">
                <ListChecks className="mr-2 h-5 w-5" /> Mock Evidence Sources
              </AccordionTrigger>
              <AccordionContent className="font-body text-sm p-4 bg-muted/30 rounded-md">
                <ul className="space-y-2">
                  {result.sources.map((source: MockSource) => (
                    <li key={source.id} className="border-b border-border/50 pb-2 last:border-b-0 last:pb-0">
                      <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-medium block truncate">
                        {source.title} <ExternalLink className="inline h-3 w-3 ml-0.5" />
                      </a>
                      {source.trustScore && <p className="text-xs text-muted-foreground">Est. Trust: {(source.trustScore * 100).toFixed(0)}%</p>}
                      {source.shortSummary && <p className="text-xs mt-0.5">{source.shortSummary}</p>}
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
      <CardFooter className="flex justify-end space-x-3 pt-4 border-t border-border/50">
        <Button variant="outline" size="sm" className="font-headline text-accent border-accent hover:bg-accent/10 hover:text-accent">
          Dispute Verdict
        </Button>
        <Button variant="outline" size="sm" className="font-headline">
          Submit Better Source
        </Button>
      </CardFooter>
    </Card>
  );
}
