import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import QuickAddModal from '../QuickAddModal/QuickAddModal';
import styles from './SurplusDeals.module.css';
import { FiClock, FiCalendar, FiPackage } from 'react-icons/fi';
import { LuLeaf } from 'react-icons/lu';
import { addToCart, getCartSubtotal, readCart } from '../../utils/cartStorage';
import { getAllergenInfo } from '../../utils/allergenIcons';

function formatTimeRemaining(endDate) {
  if (!endDate) return null;
  const now = new Date();
  const end = new Date(endDate);
  const diff = end - now;
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h left`;
  }
  return `${hours}h ${mins}m left`;
}

function formatBestBefore(date) {
  if (!date) return null;
  const now = new Date();
  const bb = new Date(date);
  const diffDays = Math.ceil((bb - now) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return '1 day';
  return `${diffDays} days`;
}

export default function SurplusDeals() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartSubtotal, setCartSubtotal] = useState(() => getCartSubtotal(readCart()));

  useEffect(() => {
    function syncSubtotal() {
      setCartSubtotal(getCartSubtotal(readCart()));
    }
    window.addEventListener('cart:updated', syncSubtotal);
    return () => window.removeEventListener('cart:updated', syncSubtotal);
  }, []);

  useEffect(() => {
    fetch('/api/products/surplus-deals/')
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.results ?? data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Refresh countdown timers every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setProducts((prev) => [...prev]);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  function openQuickAdd(product) {
    // Pass surplus price to the modal
    const surplusProduct = {
      ...product,
      original_price: product.price,
      price: product.surplus_price,
    };
    setSelectedProduct(surplusProduct);
    setQuickAddOpen(true);
  }

  async function handleAddToBasket(product, qty) {
    await addToCart(product, qty);
    setQuickAddOpen(false);
  }

  if (loading) {
    return (
      <main className={`container ${styles.page}`}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading surplus deals...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={`container ${styles.page}`}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Surplus Deals</h1>
          <p className={styles.subtitle}>
            Last-minute offers on fresh produce — grab a bargain and help reduce food waste
          </p>
        </div>
        <div className={styles.wasteTag}>
          <LuLeaf className={styles.wasteIcon} />
          <span>Reducing food waste together</span>
        </div>
      </header>

      {/* Results count */}
      <p className={styles.resultCount}>
        {products.length} {products.length === 1 ? 'deal' : 'deals'} available
      </p>

      {products.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}><FiPackage size={32} /></div>
          <h3>No surplus deals right now</h3>
          <p>Check back soon — producers regularly add last-minute offers.</p>
        </div>
      ) : (
        <section className={styles.grid}>
          {products.map((product) => {
            const originalPrice = parseFloat(product.price);
            const surplusPrice = parseFloat(product.surplus_price);
            const timeRemaining = formatTimeRemaining(product.surplus_end_date);
            const bestBefore = formatBestBefore(product.best_before_date);

            return (
              <div key={product.id} className={styles.card}>
                {/* Discount badge */}
                <div className={styles.discountBadge}>
                  -{product.discount_percentage}% OFF
                </div>

                {/* Image area */}
                <div className={styles.imageArea}>
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className={styles.cardImage}
                    />
                  ) : (
                    <div className={styles.imagePlaceholder} />
                  )}
                  {product.organic_certified && (
                    <span className={styles.organicBadge}><LuLeaf size={14} /> Organic</span>
                  )}
                </div>

                {/* Card body */}
                <div className={styles.cardBody}>
                  <div className={styles.cardTop}>
                    <h3 className={styles.productName}>{product.name}</h3>
                    <span className={styles.producerName}>{product.producer_name}</span>
                  </div>

                  {/* Pricing */}
                  <div className={styles.pricing}>
                    <span className={styles.originalPrice}>
                      £{originalPrice.toFixed(2)}
                    </span>
                    <span className={styles.surplusPrice}>
                      £{surplusPrice.toFixed(2)}
                    </span>
                    <span className={styles.perUnit}>/ {product.unit}</span>
                  </div>

                  {/* Urgency info */}
                  <div className={styles.urgencyInfo}>
                    {timeRemaining && (
                      <div className={styles.urgencyRow}>
                        <FiClock className={styles.clockIcon} />
                        <span className={styles.urgencyText}>{timeRemaining}</span>
                      </div>
                    )}
                    {bestBefore && (
                      <div className={styles.urgencyRow}>
                        <FiCalendar className={styles.clockIcon} />
                        <span className={styles.urgencyText}>Best before: {bestBefore}</span>
                      </div>
                    )}
                    <div className={styles.urgencyRow}>
                      <FiPackage className={styles.clockIcon} />
                      <span className={styles.urgencyText}>{product.stock} {product.unit}s left</span>
                    </div>
                  </div>

                  {/* Surplus note */}
                  {product.surplus_note && (
                    <p className={styles.surplusNote}>"{product.surplus_note}"</p>
                  )}

                  {/* Allergens */}
                  {product.allergens && product.allergens.length > 0 && (
                    <div className={styles.allergenTags}>
                      {product.allergens.map((a) => {
                        const { Icon, label } = getAllergenInfo(a.name);
                        return (
                          <span key={a.id} className={styles.allergenTag} title={label}>
                            <Icon size={12} /> {label}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Quick add button */}
                  <button
                    type="button"
                    className={styles.quickAddBtn}
                    onClick={() => openQuickAdd(product)}
                  >
                    Add to basket — £{surplusPrice.toFixed(2)}
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Quick Add Modal */}
      <AnimatePresence>
        {quickAddOpen && selectedProduct && (
          <QuickAddModal
            product={selectedProduct}
            onClose={() => setQuickAddOpen(false)}
            onAdd={handleAddToBasket}
            cartSubtotal={cartSubtotal}
            freeShippingThreshold={40}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
