// Contact section: scroll-triggered fade-in on the title, email and social row, plus a subtle mouse-tracking gradient halo behind the CTA. Mirrors the provided design and uses the project palette tokens.
import { useEffect, useRef } from 'react';
import styles from './ContactSection.module.css';

const EMAIL = 'aethelvance@ingenierodeia.com';

const SOCIALS = [
  {
    name: 'LinkedIn',
    url: 'https://linkedin.com/in/aethelvance',
    icon: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 2a2 2 0 1 1-2 2 2 2 0 0 1 2-2z',
  },
  {
    name: 'GitHub',
    url: 'https://github.com/aethelvance',
    icon: 'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22',
  },
];

export function ContactSection() {
  const contactRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLDivElement>(null);
  const socialRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
          }
        });
      },
      { threshold: 0.1, rootMargin: '-10% 0px -10% 0px' }
    );

    const elements = [contactRef.current, titleRef.current, emailRef.current, socialRef.current];
    elements.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      elements.forEach((el) => {
        if (el) observer.unobserve(el);
      });
    };
  }, []);

  return (
    <section
      ref={contactRef}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-base"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-base via-surface to-base opacity-60" />

      <div className={`absolute top-1/4 left-1/4 h-96 w-96 rounded-full blur-[120px] ${styles.animatePulseSlow}`} style={{ background: 'rgba(31,31,42,0.2)' }} />
      <div className={`absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full blur-[100px] ${styles.animatePulseSlower}`} style={{ background: 'rgba(20,20,28,0.1)' }} />

      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(245,247,250,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(245,247,250,0.02) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 mx-auto max-w-4xl px-8 py-24">
        <div ref={titleRef} className={`${styles.contactElement} mb-16 text-center`}>
          <h1 className="mb-4 font-mono text-[clamp(2.2rem,4.5vw,3.4rem)] font-semibold leading-[0.95] tracking-[-0.04em] text-text-primary">
            <span className={`inline-block ${styles.hoverTrigger}`}>Creemos</span>{' '}
            <span className={`inline-block ${styles.hoverTrigger}`}>algo</span>{' '}
            <span className={`group inline-block ${styles.hoverTrigger} relative`}>
              juntos
              <span className="absolute -bottom-2 left-0 h-[1px] w-0 bg-gradient-to-r from-border via-text-secondary to-border transition-all duration-500 group-hover:w-full" />
            </span>
          </h1>
          <p className="mt-4 font-mono text-sm font-medium tracking-wide text-text-secondary md:text-base">
            Tu visión, mi código
          </p>
        </div>

        <div ref={emailRef} className={`${styles.contactElement} mb-16 flex justify-center`}>
          <a
            href={`mailto:${EMAIL}`}
            className="group relative inline-flex items-center gap-4 overflow-hidden rounded-full border border-border px-8 py-4 backdrop-blur-sm transition-all duration-500 hover:border-text-secondary"
            style={{ background: 'rgba(31,31,42,0.5)' }}
          >
            <span
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-text-secondary/20 to-transparent opacity-0 transition-all duration-500 group-hover:translate-x-full group-hover:opacity-100"
            />

            <span className="relative text-lg text-text-secondary transition-colors duration-300 group-hover:text-text-primary">
              {EMAIL}
            </span>

            <svg
              className="relative h-5 w-5 text-text-secondary transition-all duration-300 group-hover:translate-x-1 group-hover:text-text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>

            <span className="absolute left-0 top-0 h-2 w-2 border-l border-t border-border opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="absolute bottom-0 right-0 h-2 w-2 border-b border-r border-border opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </a>
        </div>

        <div ref={socialRef} className={`${styles.contactElement} flex justify-center gap-8`}>
          {SOCIALS.map((social, index) => (
            <a
              key={social.name}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.name}
              className="group relative rounded-full p-3 transition-all duration-300 hover:bg-surface"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="absolute inset-0 rounded-full border border-border transition-colors duration-300 group-hover:border-text-secondary" />

              <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-text-secondary opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <svg
                className="relative h-5 w-5 text-text-secondary transition-colors duration-300 group-hover:text-text-primary"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={social.icon} />
              </svg>

              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-text-secondary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                {social.name}
              </span>
            </a>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-border to-transparent" />
    </section>
  );
}

export default ContactSection;
