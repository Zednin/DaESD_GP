import { useState, useEffect, useCallback } from 'react';
import styles from './ProducerDashboard.module.css';
import ProducerOverview from '../../components/Producer/ProducerOverview';
import ProducerProducts from '../../components/Producer/ProducerProducts';
import ProducerOrders from '../../components/Producer/ProducerOrders';
import ProducerPayments from '../../components/Producer/ProducerPayments';
import ProducerSurplus from '../../components/Producer/ProducerSurplus';
import ProducerProfile from '../../components/Producer/ProducerProfile';
import apiClient from '../../utils/apiClient';

const navItems = [
  { key: 'overview',  label: 'Overview' },
  { key: 'products',  label: 'Products' },
  { key: 'orders',    label: 'Orders' },
  { key: 'payments',  label: 'Payments' },
  { key: 'surplus',   label: 'Surplus' },
  { key: 'profile',   label: 'Profile' },
];

const SPLASH_LETTERS = ['B', 'R', 'F', 'N'];

export default function ProducerDashboard() {
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);

  const endSplash = useCallback(() => {
    setSplashFading(true);
    setTimeout(() => setShowSplash(false), 600);
  }, []);

  useEffect(() => {
    if (!showSplash) return;
    const timer = setTimeout(endSplash, 2000);
    return () => clearTimeout(timer);
  }, [showSplash, endSplash]);

  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [allProducers, setAllProducers] = useState([]);
  const [selectedProducerId, setSelectedProducerId] = useState('');

  const isAdmin = user?.account_type === 'admin';

  useEffect(() => {
    apiClient.get('/accounts/me/')
      .then(({ data }) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    apiClient.get('/producers/')
      .then(({ data }) => {
        const producers = data.results ?? data;
        setAllProducers(producers);

        if (isAdmin || selectedProducerId) return;

        const ownProducer = producers.find((p) => p.account === user?.id);
        const fallbackProducer = ownProducer ?? producers[0];
        if (fallbackProducer?.id) {
          setSelectedProducerId(String(fallbackProducer.id));
        }
      });
  }, [isAdmin, selectedProducerId, user?.id]);

  const producerId = selectedProducerId ? parseInt(selectedProducerId, 10) : null;
  const producerName = allProducers.find(p => p.id === producerId)?.company_name ?? '';

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':  return <ProducerOverview producerId={producerId} producerName={producerName} />;
      case 'products':  return <ProducerProducts producerId={producerId} producerName={producerName} />;
      case 'orders':    return <ProducerOrders producerId={producerId} producerName={producerName} />;
      case 'payments':  return <ProducerPayments producerId={producerId} producerName={producerName} />;
      case 'surplus':   return <ProducerSurplus producerId={producerId} producerName={producerName} />;
      case 'profile':   return <ProducerProfile producerId={producerId} producerName={producerName} />;
      default:          return <ProducerOverview producerId={producerId} producerName={producerName} />;
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
          <span className={styles.splashSubtitle}>Producer Dashboard</span>
          <span className={styles.splashUnderline} />
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.dashboardWrapper} ${styles.dashboardEnter}`}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <h2 className={styles.sidebarTitle}>Dashboard</h2>
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

      {/* Main content */}
      <main className={styles.content}>
        {isAdmin && (
          <div className={styles.adminBanner}>
            <span className={styles.adminLabel}>Producer:</span>
            <select
              className={styles.adminSelect}
              value={selectedProducerId}
              onChange={(e) => setSelectedProducerId(e.target.value)}
            >
              <option value="">— Choose a producer —</option>
              {allProducers.map((p) => (
                <option key={p.id} value={p.id}>{p.company_name}</option>
              ))}
            </select>
            {allProducers.length === 0 && (
              <span className={styles.adminHint}>No producers in the database yet.</span>
            )}
          </div>
        )}

        <div key={activeSection} className={styles.fadeIn}>
          {renderSection()}
        </div>
      </main>
    </div>
  );
}
