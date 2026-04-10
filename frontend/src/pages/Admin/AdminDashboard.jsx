import { useState, useEffect, useCallback } from 'react';
import styles from './AdminDashboard.module.css';
import AdminOverview from '../../components/Admin/AdminOverview';
import AdminOrders from '../../components/Admin/AdminOrders';
import AdminProducers from '../../components/Admin/AdminProducers';
import AdminUsers from '../../components/Admin/AdminUsers';
import AdminProducts from '../../components/Admin/AdminProducts';
import AdminSurplus from '../../components/Admin/AdminSurplus';
import AdminCommission from '../../components/Producer/AdminCommission';
import AdminAnnouncements from '../../components/Admin/AdminAnnouncements';
import AdminAIModels from '../../components/Admin/AdminAIModels';
import AdminSettings from '../../components/Admin/AdminSettings';

const navItems = [
  { key: 'overview',      label: 'Overview' },
  { key: 'orders',        label: 'Orders' },
  { key: 'producers',     label: 'Producers' },
  { key: 'users',         label: 'Users' },
  { key: 'products',      label: 'Products' },
  { key: 'commission',    label: 'Commission' },
  { key: 'surplus',       label: 'Surplus' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'ai-models',     label: 'AI Models' },
  { key: 'settings',      label: 'Settings' },
];

const SPLASH_LETTERS = ['B', 'R', 'F', 'N'];

export default function AdminDashboard() {
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  const endSplash = useCallback(() => {
    setSplashFading(true);
    setTimeout(() => setShowSplash(false), 600);
  }, []);

  useEffect(() => {
    if (!showSplash) return;
    const timer = setTimeout(endSplash, 2000);
    return () => clearTimeout(timer);
  }, [showSplash, endSplash]);

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':      return <AdminOverview />;
      case 'orders':        return <AdminOrders />;
      case 'producers':     return <AdminProducers />;
      case 'users':         return <AdminUsers />;
      case 'products':      return <AdminProducts />;
      case 'commission':    return <AdminCommission />;
      case 'surplus':       return <AdminSurplus />;
      case 'announcements': return <AdminAnnouncements />;
      case 'ai-models':     return <AdminAIModels />;
      case 'settings':      return <AdminSettings />;
      default:              return <AdminOverview />;
    }
  };

  if (showSplash) {
    return (
      <div className={`${styles.splash} ${splashFading ? styles.splashFading : ''}`}>
        <div className={styles.splashLetters}>
          {SPLASH_LETTERS.map((letter, i) => (
            <span
              key={i}
              className={styles.splashLetter}
              style={{ animationDelay: `${i * 0.2}s` }}
            >
              {letter}
            </span>
          ))}
          <span className={styles.splashSubtitle}>Admin Dashboard</span>
          <span className={styles.splashUnderline} />
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.dashboardWrapper} ${styles.dashboardEnter}`}>
      <aside className={styles.sidebar}>
        <h2 className={styles.sidebarTitle}>Admin</h2>
        <nav className={styles.nav}>
          {navItems.map(({ key, label }) => (
            <button
              key={key}
              className={`${styles.navBtn} ${activeSection === key ? styles.active : ''}`}
              onClick={() => setActiveSection(key)}
            >
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <main className={styles.content}>
        <div key={activeSection} className={styles.fadeIn}>
          {renderSection()}
        </div>
      </main>
    </div>
  );
}
