import { ShieldCheck } from 'lucide-react';

export function Header() {
  return (
    <header className="py-6 bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4 flex items-center">
        <ShieldCheck className="h-8 w-8 text-primary mr-3" />
        <h1 className="text-3xl font-headline font-bold text-primary">
          Verity Engine
        </h1>
      </div>
    </header>
  );
}
