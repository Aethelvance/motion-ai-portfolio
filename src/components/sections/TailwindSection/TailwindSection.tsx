import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import styles from './TailwindSection.module.css';

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
          UTILITY FIRST / PRECISION / UTILITY FIRST /
        </motion.div>
        <motion.div className={styles.outline} style={{ x: lineTwo }}>
          RAPIDEZ / SISTEMA / RAPIDEZ / SISTEMA /
        </motion.div>
        <motion.div style={{ x: lineThree }}>
          VELOCIDAD / CONSISTENCIA / VELOCIDAD /
        </motion.div>
        <motion.div className={styles.outline} style={{ x: lineFour }}>
          RENDIMIENTO / ESCALA / RENDIMIENTO /
        </motion.div>
      </div>
    </section>
  );
}

export default TailwindSection;
