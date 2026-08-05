import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import styles from './Tailwind.module.css';

export function TailwindSection() {
  const section = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: section,
    offset: ['start end', 'end start'],
  });
  const lineOne = useTransform(scrollYProgress, [0.15, 0.7], ['-18%', '10%']);
  const lineTwo = useTransform(scrollYProgress, [0.15, 0.7], ['14%', '-10%']);
  const lineThree = useTransform(scrollYProgress, [0.15, 0.7], ['-18%', '10%']);
  const lineFour = useTransform(scrollYProgress, [0.15, 0.7], ['14%', '-10%']);

  return (
    <section
      ref={section}
      id="tailwind"
      data-side-nav
      data-side-nav-label="TAILWIND"
      className={`${styles.section} ${styles.tailwindSection} grid-bg`}
    >
      <div className={styles.typeRiver}>
        <motion.div style={{ x: lineOne }}>
          LLM INTEGRATION / TOOL CALLING /
        </motion.div>
        <motion.div className={styles.outline} style={{ x: lineTwo }}>
          PROMPT ENGINEERING / WORKFLOWS /
        </motion.div>
        <motion.div style={{ x: lineThree }}>
          AGENTES IA / LLM AGENTS /
        </motion.div>
        <motion.div className={styles.outline} style={{ x: lineFour }}>
          SYSTEM PROMPTS / JSON TOOL CALLING /
        </motion.div>
      </div>
    </section>
  );
}

export default TailwindSection;
