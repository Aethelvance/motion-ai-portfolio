// CTA molecule grouping the primary and secondary hero buttons.
import HeroButton from '@/components/atoms/HeroButton/HeroButton';
import styles from './HeroCTA.module.css';

export const HeroCTA = () => {
  return (
    <div className={styles.cta}>
      <HeroButton variant="primary">DISCOVER MORE</HeroButton>
      <HeroButton variant="secondary">WATCH FILM</HeroButton>
    </div>
  );
};

export default HeroCTA;
