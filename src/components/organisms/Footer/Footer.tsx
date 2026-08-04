// Footer: keeps the lower half of the original design (description, email, nav, social, location, metrics, bottom bar) and discards the top blocks (HABLEMOS headline, magnetic CTAs, marquee). All colors mapped to the project palette tokens.
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { Infinity } from 'lucide-react';
import styles from './Footer.module.css';

const EMAIL = 'aethelvance@ingenierodeia.com';
const RADIUS = 21;
const CIRC = 2 * Math.PI * RADIUS;

function FancyLink({ label, href = '#', index }: { label: string; href?: string; index: number }) {
  const external = href.startsWith('http');
  return (
    <li>
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noreferrer' : undefined}
        className="group flex items-center gap-3 py-[7px]"
      >
        <span className="w-5 font-mono text-[10px] text-text-secondary/50 transition-colors duration-300 group-hover:text-cyan">
          0{index}
        </span>
        <span className="relative overflow-hidden text-sm font-medium text-text-primary">
          <span className="block transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-full">
            {label}
          </span>
          <span className="absolute left-0 top-full block text-cyan transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-full">
            {label}
          </span>
        </span>
        <span className="ml-auto -translate-x-1.5 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
          {external ? '↗' : '→'}
        </span>
      </a>
    </li>
  );
}

function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        const duration = 1500;
        const startTime = performance.now();
        const animate = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * to));
          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
        observer.disconnect();
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [to]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

const scrollToTop = () => {
  window.__lenis?.scrollTo(0, { duration: 1.2 });
};

export default function Footer() {
  const ref = useRef<HTMLElement | null>(null);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] });
  const scaleX = useSpring(scrollYProgress, { stiffness: 110, damping: 28 });
  const ghostY = useTransform(scrollYProgress, [0, 1], ['18%', '-18%']);

  const { scrollYProgress: pageProgress } = useScroll();
  const springProgress = useSpring(pageProgress, { stiffness: 90, damping: 24 });
  const dashOffset = useTransform(springProgress, (p: number) => CIRC * (1 - p));

  const [glow, setGlow] = useState({ x: -1000, y: -1000 });
  const glowX = useSpring(glow.x, { stiffness: 55, damping: 18, mass: 0.6 });
  const glowY = useSpring(glow.y, { stiffness: 55, damping: 18, mass: 0.6 });

  const onMove = (e: MouseEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setGlow({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  const [copied, setCopied] = useState(false);
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
    } catch {
      /* noop */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const [clock, setClock] = useState('--:--');
  useEffect(() => {
    const update = () =>
      setClock(
        new Intl.DateTimeFormat('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'America/Lima',
        }).format(new Date())
      );
    update();
    const id = window.setInterval(update, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <footer
      ref={ref}
      onMouseMove={onMove}
      className={`relative overflow-hidden rounded-t-[2.5rem] bg-base text-text-primary ${styles.footer}`}
    >
      <motion.div
        style={{ scaleX }}
        className="absolute inset-x-0 top-0 z-30 h-[3px] origin-left bg-cyan"
      />

      <div className="pointer-events-none absolute inset-0 z-0">
        <motion.div style={{ x: glowX, y: glowY }} className="absolute left-0 top-0">
          <div
            className="h-[52rem] w-[52rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(0,245,255,0.12), transparent 62%)' }}
          />
        </motion.div>
      </div>

      <motion.div
        aria-hidden
        style={{ y: ghostY }}
        className="pointer-events-none absolute inset-x-0 top-8 z-0 select-none text-center"
      >
        <span
          className="font-mono text-[26vw] font-extrabold uppercase leading-none tracking-tighter text-transparent"
          style={{ WebkitTextStroke: '1px rgba(245,247,250,0.06)' }}
        >
          AETHEL
        </span>
      </motion.div>

      <div className={`${styles.noise} pointer-events-none absolute inset-0 z-10 opacity-[0.05] mix-blend-overlay`} />

      <div className="relative z-20 mx-auto flex min-h-screen max-w-[1600px] flex-col justify-between px-6 pb-8 pt-14 md:px-14 lg:px-20">
        <div className="mt-auto grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-4">
            <p className="max-w-xs text-sm leading-relaxed text-text-secondary">
              AI Engineer & Software Developer especializado en integrar LLMs, automatizar infra y construir sistemas que escalan sin supervisión.
            </p>
            <button onClick={copyEmail} className="group mt-6 flex items-center gap-3 text-left">
              <span className="relative overflow-hidden font-mono text-lg font-semibold md:text-xl">
                {EMAIL}
                <span className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-cyan transition-transform duration-500 group-hover:scale-x-100" />
              </span>
              <span
                className={`rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.22em] transition-all duration-300 ${
                  copied
                    ? 'border-cyan bg-cyan text-base'
                    : 'border-border text-text-secondary group-hover:border-cyan group-hover:text-cyan'
                }`}
              >
                {copied ? '¡Copiado!' : 'Copiar'}
              </span>
            </button>
            <p className="mt-3 text-[10px] uppercase tracking-[0.3em] text-text-secondary/50">
              Respuesta en &lt; 24 h
            </p>
          </div>

          <nav className="md:col-span-2">
            <h3 className="mb-4 text-[10px] uppercase tracking-[0.35em] text-text-secondary/60">Menú</h3>
            <ul>
              <FancyLink label="CV" href="/cv" index={1} />
              <FancyLink label="Yuyi AI" href="/yuyi" index={2} />
              <FancyLink label="Contacto" href="/contact" index={3} />
            </ul>
          </nav>

          <nav className="md:col-span-3">
            <h3 className="mb-4 text-[10px] uppercase tracking-[0.35em] text-text-secondary/60">Redes</h3>
            <ul>
              <FancyLink label="GitHub" href="https://github.com/aethelvance" index={1} />
              <FancyLink label="LinkedIn" href="https://linkedin.com/in/aethelvance" index={2} />
            </ul>
          </nav>

          <div className="md:col-span-3">
            <h3 className="mb-4 text-[10px] uppercase tracking-[0.35em] text-text-secondary/60">Ubicación</h3>
            <p className="text-sm font-medium text-text-primary">Ayacucho, Perú</p>
            <p className="mt-1 inline-flex cursor-default font-mono text-[11px] text-text-secondary transition-colors duration-300 hover:text-cyan">
              13.1588° S · 74.2232° W
            </p>
            <p className="mt-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-text-secondary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan" />
              Hora local {clock}
            </p>
            <p className="mt-1 font-mono text-[10px] text-text-secondary/50">UTC-5 / PET</p>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-3 divide-x divide-border border-t border-border pt-8 md:mt-14">
          {[
            { to: 3, prefix: '+', label: 'Proyectos' },
            { icon: true, label: 'Buscando retos' },
            { to: 2, prefix: '+', label: 'Años de oficio' },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1 px-2 text-center">
              <span className="font-mono text-3xl font-bold text-text-primary md:text-5xl">
                {s.icon ? (
                  <Infinity className="h-8 w-8 md:h-12 md:w-12" strokeWidth={1.5} />
                ) : (
                  <>
                    {s.prefix}
                    <Counter to={s.to!} />
                  </>
                )}
              </span>
              <span className="text-[9px] uppercase tracking-[0.3em] text-text-secondary md:text-[10px]">
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-6 border-t border-border pt-8 text-[10px] uppercase tracking-[0.28em] text-text-secondary md:flex-row">
          <span>© MMXXVI — AETHELVANCE®</span>
          <span className="hidden md:block">
            Hecho con <span className="text-cyan">♥</span> y mucho café
          </span>
          <button onClick={scrollToTop} className="group flex items-center gap-3">
            <span className="transition-colors duration-300 group-hover:text-text-primary">Subir</span>
            <span className="relative grid h-14 w-14 place-items-center rounded-full">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 56 56" fill="none">
                <circle cx="28" cy="28" r={RADIUS} stroke="var(--border)" strokeWidth="1.5" />
                <motion.circle
                  cx="28"
                  cy="28"
                  r={RADIUS}
                  stroke="var(--cyan)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  style={{ strokeDasharray: CIRC, strokeDashoffset: dashOffset }}
                />
              </svg>
              <span className="font-mono text-lg transition-transform duration-500 group-hover:-translate-y-1">
                ↑
              </span>
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
}
