import { useState, useEffect, useCallback } from 'react';
import shared from '../../pages/Producer/ProducerShared.module.css';
import local from './ProducerSurplus.module.css';
const styles = { ...shared, ...local };
import apiClient from '../../utils/apiClient';

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
    return `${days}d ${hours % 24}h remaining`;
  }
  return `${hours}h ${mins}m remaining`;
}

/* Modal to create / edit a discount offer */
function DiscountOfferModal({ product, onClose, onSaved }) {
  const isEdit = Boolean(product.is_surplus);
  const [closing, setClosing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [discountPercentage, setDiscountPercentage] = useState(
    product.discount_percentage || 30
  );
  const [dealDuration, setDealDuration] = useState(48);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customHours, setCustomHours] = useState('');
  const [surplusNote, setSurplusNote] = useState(
    product.surplus_note || ''
  );
  const [bestBefore, setBestBefore] = useState(
    product.best_before_date ? product.best_before_date.slice(0, 16) : ''
  );

  const originalPrice = parseFloat(product.price);
  const discountedPrice = (originalPrice * (1 - discountPercentage / 100)).toFixed(2);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const surplusEndDate = new Date();
      surplusEndDate.setHours(surplusEndDate.getHours() + dealDuration);

      const payload = {
        is_surplus: true,
        discount_percentage: discountPercentage,
        surplus_end_date: surplusEndDate.toISOString(),
        surplus_note: surplusNote,
        best_before_date: bestBefore || null,
      };

      const res = await apiClient.patch(`/products/${product.id}/`, payload);
      onSaved(res.data);
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        'Failed to save discount offer.';
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`${styles.overlay} ${closing ? styles.overlayClosing : ''}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>{isEdit ? 'Edit' : 'Create'} Discount Offer — {product.name}</h3>
          <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">
            ✕
          </button>
        </div>

        {error && <p className={styles.errorBanner}>{error}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Product info summary */}
          <div className={styles.productSummary}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Product</span>
              <span className={styles.summaryValue}>{product.name}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Current Stock</span>
              <span className={styles.summaryValue}>{product.stock} {product.unit}s</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Original Price</span>
              <span className={styles.summaryValue}>£{originalPrice.toFixed(2)} / {product.unit}</span>
            </div>
          </div>

          {/* Discount percentage */}
          <div className={styles.field}>
            <label>Discount Percentage *</label>
            <div className={styles.sliderRow}>
              <input
                type="range"
                min="5"
                max="80"
                step="5"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                className={styles.slider}
              />
              <span className={styles.sliderValue}>{discountPercentage}%</span>
            </div>
            <div className={styles.pricePreview}>
              <span className={styles.originalPrice}>£{originalPrice.toFixed(2)}</span>
              <span className={styles.arrow}>→</span>
              <span className={styles.discountedPrice}>£{discountedPrice}</span>
              <span className={styles.savingsBadge}>Save {discountPercentage}%</span>
            </div>
          </div>

          {/* Deal duration */}
          <div className={styles.field}>
            <label>Deal Duration *</label>
            <select
              value={isCustomDuration ? 'custom' : dealDuration}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setIsCustomDuration(true);
                  setCustomHours('');
                } else {
                  setIsCustomDuration(false);
                  setCustomHours('');
                  setDealDuration(Number(e.target.value));
                }
              }}
            >
              <option value={6}>6 hours</option>
              <option value={12}>12 hours</option>
              <option value={24}>24 hours</option>
              <option value={48}>48 hours</option>
              <option value={72}>72 hours (3 days)</option>
              <option value={120}>120 hours (5 days)</option>
              <option value={168}>168 hours (7 days)</option>
              <option value="custom">Custom duration…</option>
            </select>
            {isCustomDuration && (
              <input
                type="number"
                min="1"
                max="720"
                placeholder="Enter hours (1–720)"
                value={customHours}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomHours(val);
                  const num = Number(val);
                  if (num >= 1) setDealDuration(num);
                }}
              />
            )}
          </div>

          {/* Best before date */}
          <div className={styles.field}>
            <label>Best Before Date</label>
            <input
              type="datetime-local"
              value={bestBefore}
              onChange={(e) => setBestBefore(e.target.value)}
            />
          </div>

          {/* Note */}
          <div className={styles.field}>
            <label>Note for Customers</label>
            <textarea
              value={surplusNote}
              onChange={(e) => setSurplusNote(e.target.value)}
              rows={3}
              placeholder="e.g. Perfect condition, must sell quickly to avoid waste"
            />
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={handleClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Update Offer' : 'Create Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* Modal to remove a discount offer */
function RemoveOfferModal({ product, onClose, onRemoved }) {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const [closing, setClosing] = useState(false);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  async function handleRemove() {
    setRemoving(true);
    setError('');
    try {
      const payload = {
        is_surplus: false,
        discount_percentage: 0,
        surplus_end_date: null,
        surplus_note: '',
        best_before_date: null,
      };
      const res = await apiClient.patch(`/products/${product.id}/`, payload);
      onRemoved(res.data);
    } catch (err) {
      setError(err.message);
      setRemoving(false);
    }
  }

  return (
    <div
      className={`${styles.overlay} ${closing ? styles.overlayClosing : ''}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className={`${styles.modal} ${styles.deleteModal}`}>
        <h3>Remove Discount Offer</h3>
        <p>
          Are you sure you want to remove the discount offer for{' '}
          <strong>{product.name}</strong>? The product will return to its
          regular price.
        </p>
        {error && <p className={styles.errorBanner}>{error}</p>}
        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={handleClose} disabled={removing}>
            Cancel
          </button>
          <button className={styles.deleteBtn} onClick={handleRemove} disabled={removing}>
            {removing ? 'Removing…' : 'Remove Offer'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Main component */
export default function ProducerSurplus({ producerId, producerName }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [offerTarget, setOfferTarget] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);

  useEffect(() => {
    async function loadProducts() {
      if (!producerId) {
        setProducts([]);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const res = await apiClient.get('/products/', {
          params: { producer: producerId },
        });
        setProducts(res.data.results ?? res.data);
      } catch (err) {
        setError(err.response?.data?.detail || err.message || 'Failed to load products.');
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, [producerId]);

  function handleSaved(updatedProduct) {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );
    setOfferTarget(null);
  }

  function handleRemoved(updatedProduct) {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );
    setRemoveTarget(null);
  }

  const availableProducts = products.filter((p) => p.status === 'available' && p.stock > 0);
  const activeDeals = availableProducts.filter((p) => p.is_surplus);

  if (!producerId) {
    return (
      <div className={styles.centred}>
        <p>Choose a producer above to manage discount offers.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.centred}>
        <span className={styles.spinner} />
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centred}>
        <p className={styles.errorText}>Error: {error}</p>
      </div>
    );
  }

  return (
    <section className={styles.section}>
      {/* Header */}
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>
            {producerName ? `${producerName} — Discount Offers` : 'Discount Offers'}
          </h2>
          <p className={styles.subtitle}>
            Create discount offers for products to reduce food waste
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Active Offers</p>
          <p className={`${styles.statValue} ${styles.statAccent}`}>{activeDeals.length}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Available Products</p>
          <p className={styles.statValue}>{availableProducts.length}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total Products</p>
          <p className={styles.statValue}>{products.length}</p>
        </div>
      </div>

      {/* Product table */}
      {availableProducts.length === 0 ? (
        <div className={styles.empty}>
          <p>No available products to create discount offers for.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Unit</th>
                <th>Category</th>
                <th>Status</th>
                <th className={styles.actionsCol}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {availableProducts.map((p) => {
                const timeRemaining = p.is_surplus ? formatTimeRemaining(p.surplus_end_date) : null;
                const isExpired = timeRemaining === 'Expired';
                return (
                  <tr key={p.id}>
                    <td className={styles.nameCell}>
                      <span className={styles.productName}>{p.name}</span>
                      {p.description && (
                        <span className={styles.productDesc}>{p.description}</span>
                      )}
                    </td>
                    <td>
                      {p.is_surplus ? (
                        <>
                          <span className={styles.originalPriceSmall}>£{parseFloat(p.price).toFixed(2)}</span>
                          {' '}
                          <span className={styles.discountedPriceInline}>£{parseFloat(p.surplus_price).toFixed(2)}</span>
                        </>
                      ) : (
                        <>£{parseFloat(p.price).toFixed(2)}</>
                      )}
                    </td>
                    <td>
                      <span className={p.stock === 0 ? styles.stockZero : styles.stock}>
                        {p.stock}
                      </span>
                    </td>
                    <td>{p.unit}</td>
                    <td>{p.category_name ?? <span className={styles.muted}>—</span>}</td>
                    <td>
                      {p.is_surplus ? (
                        isExpired ? (
                          <span className={`${styles.badge} ${styles.badgeRed}`}>Expired</span>
                        ) : (
                          <span className={`${styles.badge} ${styles.badgeGreen}`}>
                            -{p.discount_percentage}% active
                          </span>
                        )
                      ) : (
                        <span className={`${styles.badge} ${styles.badgeGrey}`}>No offer</span>
                      )}
                    </td>
                    <td className={styles.actionsCell}>
                      <div className={styles.actionsBtns}>
                        {p.is_surplus ? (
                          <>
                            <button className={styles.editBtn} onClick={() => setOfferTarget(p)}>
                              Edit
                            </button>
                            <button className={styles.deleteRowBtn} onClick={() => setRemoveTarget(p)}>
                              Remove
                            </button>
                          </>
                        ) : (
                          <button className={styles.editBtn} onClick={() => setOfferTarget(p)}>
                            Create Discount Offer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Discount Offer Modal */}
      {offerTarget !== null && (
        <DiscountOfferModal
          product={offerTarget}
          onClose={() => setOfferTarget(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Remove Offer Modal */}
      {removeTarget !== null && (
        <RemoveOfferModal
          product={removeTarget}
          onClose={() => setRemoveTarget(null)}
          onRemoved={handleRemoved}
        />
      )}
    </section>
  );
}
