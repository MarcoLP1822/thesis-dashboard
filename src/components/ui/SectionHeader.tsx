interface SectionHeaderProps {
  title: string;
  description: string;
  children?: React.ReactNode;
}

export function SectionHeader({ title, description, children }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">{title}</h2>
        <p className="text-zinc-500 mt-2">{description}</p>
      </div>
      {children}
    </div>
  );
}
