// Multi-chunk assistant bubble: renders each "---"-separated chunk from the assistant message as its own bubble, released sequentially by useDelayedReveal (chunks are queued; each is appended to the output only after the previous chunk's delay has fully elapsed). Two style variants: "floating" (small AIAssistant window) and "fullpage" (YuyiChatSection).
import { useDelayedReveal } from './useDelayedReveal';
import { renderRichText } from './renderRichText';

type Variant = 'floating' | 'fullpage';

const BUBBLE: Record<Variant, string> = {
  floating: 'max-w-[85%] whitespace-pre-wrap rounded-2xl bg-surface-elevated px-3 py-2 text-sm leading-relaxed text-text-primary',
  fullpage: 'max-w-[85%] whitespace-pre-wrap rounded-2xl bg-surface-elevated px-4 py-3 text-sm leading-relaxed text-text-primary border border-border',
};

interface Props {
  text: string;
  animate: boolean;
  variant: Variant;
  className?: string;
  isConsecutive?: boolean;
}

export function AssistantMessage({ text, animate, variant, className = '', isConsecutive = false }: Props) {
  const visibleChunks = useDelayedReveal(text, animate);

  if (visibleChunks.length === 0) return null;

  return (
    <>
      {visibleChunks.map((visible, i) => {
        const marginClass = i === 0 ? (isConsecutive ? 'mt-1' : 'mt-3') : 'mt-1';
        return (
          <div key={i} className={`flex justify-start ${marginClass}`}>
            <div className={`${BUBBLE[variant]} ${className}`}>
              {renderRichText(visible)}
            </div>
          </div>
        );
      })}
    </>
  );
}
