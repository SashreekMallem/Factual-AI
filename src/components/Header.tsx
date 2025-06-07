
import { ShieldCheck, Zap } from 'lucide-react';

export function Header() {
  return (
    <header className="py-5 bg-card border-b border-border/60 shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center">
          <ShieldCheck className="h-10 w-10 text-primary mr-3" />
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">
            Verity Engine
          </h1>
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground font-headline">
          <Zap className="h-4 w-4 text-accent" />
          <span>Powered by Genkit & Gemini</span>
        </div>
      </div>
    </header>
  );
}
