import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn(
      "bg-white rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col",
      className
    )}>
      {children}
    </div>
  );
}
