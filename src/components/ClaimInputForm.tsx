
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lightbulb, SearchCode } from 'lucide-react';

const formSchema = z.object({
  text: z.string().min(20, {
    message: 'Please enter at least 20 characters for a comprehensive analysis.',
  }).max(5000, {
    message: 'Text cannot exceed 5000 characters for optimal performance.'
  }),
});

type ClaimInputFormProps = {
  onSubmit: (data: z.infer<typeof formSchema>) => void;
  isProcessing: boolean;
};

export function ClaimInputForm({ onSubmit, isProcessing }: ClaimInputFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      text: '',
    },
  });

  return (
    <Card className="w-full shadow-xl border-transparent overflow-hidden rounded-xl bg-card/80 backdrop-blur-sm">
      <CardHeader className="bg-muted/30 p-6">
        <CardTitle className="font-headline text-2xl text-primary flex items-center">
          <Lightbulb className="mr-3 h-7 w-7" />
          Submit Text for Fact Verification
        </CardTitle>
        <CardDescription className="font-body text-base mt-1">
          Enter text containing factual claims. Factual AI will meticulously extract, analyze, and verify each claim using advanced AI.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-headline text-lg sr-only">Text to Analyze</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Example: The Amazon rainforest produces 20% of the world's oxygen. The Great Wall of China is visible from space. Water boils at 100 degrees Celsius at sea level."
                      className="min-h-[180px] font-body text-base resize-y shadow-inner bg-background/70 border-border/70 focus:ring-primary focus:border-primary rounded-lg p-4"
                      {...field}
                      disabled={isProcessing}
                    />
                  </FormControl>
                  <FormMessage className="text-red-500 dark:text-red-400" />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full sm:w-auto bg-primary hover:bg-primary/80 text-primary-foreground font-headline text-lg py-3.5 px-8 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center group active:scale-95"
              disabled={isProcessing}
            >
              <SearchCode className="mr-2.5 h-5 w-5 group-hover:animate-pulse" />
              {isProcessing ? 'Analyzing Deeply...' : 'Verify Claims'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
