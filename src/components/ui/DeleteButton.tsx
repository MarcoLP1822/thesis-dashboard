import { Trash2 } from 'lucide-react';

interface DeleteButtonProps {
  onClick: (e: React.MouseEvent) => void;
  title: string;
}

export function DeleteButton({ onClick, title }: DeleteButtonProps) {
  return (
    <button
      onClick={onClick}
      className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
      title={title}
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
