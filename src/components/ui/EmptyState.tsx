import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
}

export function EmptyState({ icon: Icon, message }: EmptyStateProps) {
  return (
    <div className="text-center p-12 bg-white rounded-2xl border border-zinc-200">
      <Icon className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
      <p className="text-zinc-500">{message}</p>
    </div>
  );
}
