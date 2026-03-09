import { cn } from '../../lib/utils';

interface PageLayoutProps {
  children: React.ReactNode;
  maxWidth?: 'max-w-3xl' | 'max-w-5xl';
}

export function PageLayout({ children, maxWidth = 'max-w-5xl' }: PageLayoutProps) {
  return (
    <div className="flex-1 h-full bg-zinc-50 p-8 overflow-y-auto">
      <div className={cn(maxWidth, "mx-auto space-y-8")}>
        {children}
      </div>
    </div>
  );
}
