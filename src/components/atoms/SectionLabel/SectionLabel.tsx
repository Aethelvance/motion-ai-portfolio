import type { ReactNode } from 'react';

export interface SectionLabelProps {
  index: string;
  accent: string;
  children: ReactNode;
}

export const SectionLabel = ({ index, accent, children }: SectionLabelProps) => {
  return (
    <div className="inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em]">
      <span style={{ color: accent }}>{index}</span>
      <span className="h-px w-8 bg-border" />
      <span className="text-text-secondary">{children}</span>
    </div>
  );
};

export default SectionLabel;
