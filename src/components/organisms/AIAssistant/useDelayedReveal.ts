// Queue-based delayed reveal: each "---"-separated chunk waits its proportional delay (100ms per word, capped at 3s) then is released from the head of the chunks array. A chunk is never present in the returned array before its delay elapses, so the parent can never accidentally render it (no "ghost" chunk flashes). Single rAF loop drives the release counter. When `active` is false, all chunks are released immediately.
import { useEffect, useState } from 'react';

const WORD_MS = 100;
const MAX_MS = 3000;
const DELIMITER = /\s*---\s*/;

export function useDelayedReveal(text: string, active: boolean): string[] {
  const chunks = text.split(DELIMITER).filter((c) => c.length > 0);
  const chunkDelays = chunks.map((c) => {
    const wordCount = c.split(/\s+/).filter((w) => w.length > 0).length;
    if (wordCount === 0) return 0;
    return Math.min(wordCount * WORD_MS, MAX_MS);
  });
  const totalDuration = chunkDelays.reduce((a, b) => a + b, 0);

  const [releasedCount, setReleasedCount] = useState(active ? 0 : chunks.length);

  useEffect(() => {
    if (!active || totalDuration === 0) {
      setReleasedCount(chunks.length);
      return;
    }
    setReleasedCount(0);

    let cumulative = 0;
    const thresholds: number[] = [];
    for (let i = 0; i < chunkDelays.length; i++) {
      cumulative += chunkDelays[i];
      thresholds.push(cumulative);
    }

    let raf = 0;
    const start = performance.now();
    let lastReleased = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      let next = lastReleased;
      while (next < thresholds.length && elapsed >= thresholds[next]) {
        next++;
      }
      if (next > lastReleased) {
        lastReleased = next;
        setReleasedCount(next);
      }
      if (elapsed < totalDuration) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, active, totalDuration]);

  return chunks.slice(0, releasedCount);
}
