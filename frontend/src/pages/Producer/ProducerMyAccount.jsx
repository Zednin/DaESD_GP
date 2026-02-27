import { useState } from 'react';
import Settings from '../../components/Producer/Settings';
import ProducerOnboarding from '../../components/Producer/ProducerOnboarding';

export default function ProducerMyAccount() {
  const [activeSection, setActiveSection] = useState('settings');

  const renderSection = () => {
    switch (activeSection) {
      case 'settings':   return <Settings />;
      case 'onboarding': return <ProducerOnboarding />;
      default:           return <Settings />;
    }
  };

  return (
    <main>
      <h1>My Account</h1>

      <nav>
        <button onClick={() => setActiveSection('settings')}>Settings</button>
        <button onClick={() => setActiveSection('onboarding')}>Site Onboarding</button>
      </nav>

      <div>
        {renderSection()}
      </div>
    </main>
  );
}
