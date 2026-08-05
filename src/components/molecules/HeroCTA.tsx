// CTA molecule grouping the primary and secondary hero buttons.
import HeroButton from '@/components/atoms/HeroButton';
import styles from './HeroCTA.module.css';

export const HeroCTA = () => {
  return (
    <div className={styles.cta}>
      <HeroButton variant="primary" href="/certs/cv.pdf" download="cv.pdf">DOWNLOAD CV</HeroButton>
      <HeroButton variant="secondary" href="/contact">CONTACT</HeroButton>
    </div>
  );
};

export default HeroCTA;
