import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';

type Layer = {
  step: string;
  title: string;
  stack: string;
  desc: string;
  bullets: string[];
  code: string[];
  accent: string;
  cardBg: string;
};

const layers: Layer[] = [
  {
    step: '01',
    title: 'Lorem',
    stack: 'Lorem v1.0',
    desc: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    bullets: ['Lorem ipsum dolor sit', 'Consectetur adipiscing elit', 'Sed do eiusmod tempor'],
    code: ['const lorem = {', '  ipsum: "dolor",', '  sit: "amet",', '}'],
    accent: 'var(--error)',
    cardBg: 'var(--card-bg-error)',
  },
  {
    step: '02',
    title: 'Ipsum',
    stack: 'Ipsum v2.0',
    desc: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    bullets: ['Duis aute irure dolor', 'In reephenderit voluptate', 'Velit esse cillum dolore'],
    code: ['function ipsum() {', '  return "dolor";', '}', ''],
    accent: 'var(--accent-blue)',
    cardBg: 'var(--card-bg-accent-blue)',
  },
  {
    step: '03',
    title: 'Dolor',
    stack: 'Dolor v3.0',
    desc: 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    bullets: ['Cillum dolore eu fugiat', 'Nulla pariatur excepteur', 'Sunt in culpa qui officia'],
    code: ['import { lorem }', '  from "ipsum";', '', ''],
    accent: 'var(--cyan)',
    cardBg: 'var(--card-bg-cyan)',
  },
  {
    step: '04',
    title: 'Sit',
    stack: 'Sit v4.0',
    desc: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
    bullets: ['Natus error sit voluptatem', 'Accusantium doloremque', 'Laudantium totam rem'],
    code: ['export default', '  function () {', '    return lorem;', '  }'],
    accent: 'var(--success)',
    cardBg: 'var(--card-bg-success)',
  },
];

export function DeckSection() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  return (
    <section
      id="capas"
      data-side-nav
      data-side-nav-label="CAPAS"
      className="relative grid-bg border-y border-border/60 bg-base py-24"
    >
      <div ref={containerRef} className="relative">
        {layers.map((layer, i) => (
          <DeckCard
            key={layer.step}
            layer={layer}
            i={i}
            total={layers.length}
            progress={scrollYProgress}
          />
        ))}
      </div>
      <div className="h-[10vh]" />
    </section>
  );
}

function DeckCard({
  layer,
  i,
  total,
  progress,
}: {
  layer: Layer;
  i: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const isLast = i === total - 1;
  const target = 1 - (total - 1 - i) * 0.04;
  const scale = useTransform(progress, [i / total, 1], [1, target]);
  const blur = useTransform(progress, [i / total, 1], [
    'blur(0px)',
    isLast ? 'blur(0px)' : 'blur(3px)',
  ]);
  const dim = useTransform(progress, [i / total, 1], [0, isLast ? 0 : 0.45]);

  return (
    <div
      className="sticky flex h-[78vh] items-start justify-center px-4 md:px-10"
      style={{ top: `calc(12vh + ${i * 22}px)` }}
    >
      <motion.article
        style={{ scale, filter: blur, transformOrigin: 'top center', background: layer.cardBg }}
        className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-border/80"
      >
        <motion.div
          style={{ opacity: dim }}
          className="pointer-events-none absolute inset-0 z-20 bg-base"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="relative grid gap-10 p-8 md:grid-cols-[1.15fr_0.85fr] md:p-12">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <span
                className="font-mono text-[11px] tracking-[0.3em]"
                style={{ color: layer.accent }}
              >
                {layer.step}
              </span>
              <span className="h-px w-10 bg-border" />
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-secondary">
                {layer.stack}
              </span>
            </div>

            <h3 className="text-[clamp(2.2rem,4.5vw,3.4rem)] font-semibold leading-[0.95] tracking-[-0.045em] text-text-primary">
              {layer.title}
            </h3>

            <p className="max-w-md text-[15px] leading-relaxed text-text-secondary">{layer.desc}</p>

            <ul className="space-y-2.5 pt-2">
              {layer.bullets.map((b) => (
                <li key={b} className="flex items-center gap-3 text-[13.5px] text-text-primary/85">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: layer.accent }}
                  />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-surface p-6">
            <div className="mb-5 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-white/20" />
              <span className="h-2 w-2 rounded-full bg-white/20" />
              <span className="h-2 w-2 rounded-full bg-white/20" />
              <span className="ml-3 font-mono text-[10px] text-text-secondary">
                {layer.title.toLowerCase()}.ts
              </span>
            </div>
            <pre className="font-mono text-[12.5px] leading-[1.9] text-text-secondary">
              {layer.code.map((line, li) => (
                <div key={li} className="flex gap-4">
                  <span className="select-none text-text-secondary/60">{li + 1}</span>
                  <span style={{ color: li === 0 ? layer.accent : undefined }}>{line}</span>
                </div>
              ))}
            </pre>
          </div>
        </div>
      </motion.article>
    </div>
  );
}

export default DeckSection;
