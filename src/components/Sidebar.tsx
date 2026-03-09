import { BookOpen, MessageSquare, Settings, Quote } from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const navItems = [
    { id: 'library', label: 'Libreria', icon: BookOpen },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'citations', label: 'Citazioni', icon: Quote },
    { id: 'settings', label: 'Impostazioni', icon: Settings },
  ];

  return (
    <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full text-zinc-300">
      <div className="p-6">
        <h1 className="text-xl font-bold text-white tracking-tight">Thesis Dashboard</h1>
        <p className="text-xs text-zinc-500 mt-1">Organizza la tua tesi</p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-indigo-500/10 text-indigo-400" 
                  : "hover:bg-zinc-800/50 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <div className="text-xs text-zinc-500 text-center">
          Powered by Claude
        </div>
      </div>
    </div>
  );
}
