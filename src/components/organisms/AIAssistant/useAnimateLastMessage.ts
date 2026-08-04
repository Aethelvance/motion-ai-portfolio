// Tracks which assistant message should currently animate. The rule: only the LAST message, only if it's a new assistant message (key not seen before), and only while not loading. Switches to a new key when a fresh assistant message arrives at the tail of the list.
import { useEffect, useState } from 'react';
import type { ChatMessage } from '@/components/providers/yuyiStore';

export function useAnimateLastMessage(
  messages: ChatMessage[],
  currentChatId: string | null,
) {
  const [animatedKey, setAnimatedKey] = useState<string | null>(null);

  useEffect(() => {
    if (messages.length === 0 || !currentChatId) return;
    const last = messages[messages.length - 1];
    if (last.role !== 'assistant') return;
    const key = `${currentChatId}_${messages.length - 1}`;
    if (key !== animatedKey) {
      setAnimatedKey(key);
    }
  }, [messages, currentChatId, animatedKey]);

  return (index: number) => {
    if (!currentChatId || !animatedKey) return false;
    return `${currentChatId}_${index}` === animatedKey;
  };
}
