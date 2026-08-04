// Tracks which assistant message should currently animate. Derived during render (useMemo)
// so the value is correct on the very first commit of a new message — storing it in
// useState + useEffect would update it one render late, causing useDelayedReveal to
// briefly render with active=false (releasedCount = chunks.length → all chunks flash
// visible) before resetting to 0 and starting the reveal.
import { useMemo } from 'react';
import type { ChatMessage } from '@/components/providers/yuyiStore';

export function useAnimateLastMessage(
  messages: ChatMessage[],
  currentChatId: string | null,
) {
  const animatedKey = useMemo(() => {
    if (messages.length === 0 || !currentChatId) return null;
    const last = messages[messages.length - 1];
    if (last.role !== 'assistant') return null;
    return `${currentChatId}_${messages.length - 1}`;
  }, [messages, currentChatId]);

  return (index: number) => {
    if (!currentChatId || !animatedKey) return false;
    return `${currentChatId}_${index}` === animatedKey;
  };
}
