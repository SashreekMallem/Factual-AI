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
import { Lightbulb } from 'lucide-react';

const formSchema = z.object({
  text: z.string().min(10, {
    message: 'Please enter at least 10 characters to analyze.',
  }).max(5000, {
    message: 'Text cannot exceed 5000 characters.'
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
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-primary flex items-center">
          <Lightbulb className="mr-2 h-6 w-6" />
          Submit Text for Fact Verification
        </CardTitle>
        <CardDescription className="font-body">
          Enter a paragraph or document containing factual claims. Verity Engine will extract and analyze each claim.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-headline text-lg">Text to Analyze</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Paste your text here... e.g., 'The Eiffel Tower is located in Paris, France and was completed in 1889. It is the tallest structure in the city.'"
                      className="min-h-[150px] font-body text-base resize-none shadow-sm focus:ring-2 focus:ring-primary"
                      {...field}
                      disabled={isProcessing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-headline text-lg py-3 px-6 rounded-md shadow-md hover:shadow-lg transition-shadow duration-200" 
              disabled={isProcessing}
            >
              {isProcessing ? 'Analyzing...' : 'Verify Claims'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
