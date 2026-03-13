import { useState, useEffect } from 'react';
import styles from './ProducerDashboard.module.css';
import ProducerOverview from '../../components/Producer/ProducerOverview';
import ProducerProducts from '../../components/Producer/ProducerProducts';
import ProducerOrders from '../../components/Producer/ProducerOrders';
import ProducerPayments from '../../components/Producer/ProducerPayments';
import ProducerSurplus from '../../components/Producer/ProducerSurplus';
import ProducerProfile from '../../components/Producer/ProducerProfile';

const navItems = [
  { key: 'overview',  label: 'Overview' },
  { key: 'products',  label: 'Products' },
  { key: 'orders',    label: 'Orders' },
  { key: 'payments',  label: 'Payments' },
  { key: 'surplus',   label: 'Surplus' },
  { key: 'profile',   label: 'Profile' },
];

export default function ProducerDashboard() {
  const [activeSection, setActiveSection] = useState('overview');
  const [allProducers, setAllProducers] = useState([]);
  const [selectedProducerId, setSelectedProducerId] = useState('');

  useEffect(() => {
    fetch('/api/producers/', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setAllProducers(data.results ?? data));
  }, []);

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

  return (
    <div className={styles.dashboardWrapper}>
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
        {/* Producer selector */}
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

        {renderSection()}
      </main>
    </div>
  );
}
