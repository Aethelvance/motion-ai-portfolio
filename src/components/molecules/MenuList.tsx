import MenuLink from '@/components/atoms/MenuLink';
import styles from './MenuList.module.css';

export interface MenuItem {
  label: string;
  href: string;
}

export interface MenuListProps {
  items: MenuItem[];
  currentPath?: string;
  onItemClick?: (href: string) => void;
}

// List molecule that renders the fullscreen navigation links.
export const MenuList = ({ items, currentPath, onItemClick }: MenuListProps) => {
  return (
    <nav className={styles.menuContainer} aria-label="Main navigation">
      <ul className={styles.menu}>
        {items.map((item) => (
          <li key={item.href}>
            <MenuLink
              href={item.href}
              isActive={currentPath === item.href}
              onClick={onItemClick}
            >
              {item.label}
            </MenuLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default MenuList;
