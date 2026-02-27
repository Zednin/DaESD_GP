import { useState } from 'react';
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

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':  return <ProducerOverview />;
      case 'products':  return <ProducerProducts />;
      case 'orders':    return <ProducerOrders />;
      case 'payments':  return <ProducerPayments />;
      case 'surplus':   return <ProducerSurplus />;
      case 'profile':   return <ProducerProfile />;
      default:          return <ProducerOverview />;
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
        {renderSection()}
      </main>
    </div>
  );
}
