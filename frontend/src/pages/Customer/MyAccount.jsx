import { useState } from 'react';
import OrderHistory from '../../components/Customer/OrderHistory';
import RecurringOrders from '../../components/Customer/RecurringOrders';
import Reviews from '../../components/Customer/Reviews';
import Settings from '../../components/Customer/Settings';

export default function MyAccount() {
  const [activeSection, setActiveSection] = useState('orderHistory');

  const renderSection = () => {
    switch (activeSection) {
      case 'orderHistory':    return <OrderHistory />;
      case 'recurringOrders': return <RecurringOrders />;
      case 'reviews':         return <Reviews />;
      case 'settings':        return <Settings />;
      default:                return <OrderHistory />;
    }
  };

  return (
    <main>
      <h1>My Account</h1>

      <nav>
        <button onClick={() => setActiveSection('orderHistory')}>Order History</button>
        <button onClick={() => setActiveSection('recurringOrders')}>Recurring Orders</button>
        <button onClick={() => setActiveSection('reviews')}>Reviews</button>
        <button onClick={() => setActiveSection('settings')}>Settings</button>
      </nav>

      <div>
        {renderSection()}
      </div>
    </main>
  );
}
