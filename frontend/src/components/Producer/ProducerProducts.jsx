import { useState, useEffect } from 'react';
import styles from '../../pages/Producer/ProducerDashboard.module.css';

/*  Mock data 
const MOCK_PRODUCERS = [
  { id: 1, company_name: 'Green Valley Farm' },
  { id: 2, company_name: 'Sunny Meadows Organics' },
  { id: 3, company_name: 'Riverside Dairy' },
];

let nextId = 10;
const MOCK_PRODUCTS = {
  1: [
    { id: 1, name: 'Carrots', description: 'Fresh garden carrots', price: '1.50', unit: 'kg', stock: 100, availability_start: '2026-03-01', availability_end: '2026-06-30', status: 'available', organic_certified: true, category_name: 'Vegetables' },
    { id: 2, name: 'Potatoes', description: 'Maris Piper potatoes', price: '0.80', unit: 'kg', stock: 200, availability_start: '2026-03-01', availability_end: '2026-09-30', status: 'available', organic_certified: false, category_name: 'Vegetables' },
  ],
  2: [
    { id: 3, name: 'Honey', description: 'Raw wildflower honey', price: '6.00', unit: 'unit', stock: 40, availability_start: '2026-04-01', availability_end: '2026-12-31', status: 'available', organic_certified: true, category_name: 'Honey & Preserves' },
  ],
  3: [
    { id: 4, name: 'Whole Milk', description: 'Fresh whole milk', price: '1.20', unit: 'litre', stock: 80, availability_start: '2026-03-01', availability_end: '2026-12-31', status: 'available', organic_certified: false, category_name: 'Dairy' },
    { id: 5, name: 'Cheddar Cheese', description: 'Mature cheddar', price: '4.50', unit: 'kg', stock: 0, availability_start: '2026-03-01', availability_end: '2026-12-31', status: 'unavailable', organic_certified: false, category_name: 'Dairy' },
  ],
};

// In-memory store
const mockProductStore = Object.fromEntries(
  Object.entries(MOCK_PRODUCTS).map(([k, v]) => [k, v.map((p) => ({ ...p }))])
);

*/

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  unit: 'unit',
  stock: '',
  availability_start: '',
  availability_end: '',
  status: 'available',
  organic_certified: false,
  category: '',
  allergens: [],
  image: '',
};

// Cross-Site Request Forgery token
function getCookie(name) {
  return document.cookie.split('; ') 
    .find(r => r.startsWith(name + '='))
    ?.split('=')[1];
}

const UNIT_OPTIONS = ['kg', 'g', 'litre', 'ml', 'unit', 'dozen'];
const STATUS_OPTIONS = ['available', 'unavailable'];

/* Product form modal  */
function ProductModal({ product, producerId, onClose, onSaved }) {
  const isEdit = Boolean(product?.id);
  const [form, setForm] = useState(
    isEdit
      ? {
          name: product.name,
          description: product.description ?? '',
          price: product.price,
          unit: product.unit,
          stock: product.stock,
          availability_start: product.availability_start,
          availability_end: product.availability_end,
          status: product.status,
          organic_certified: product.organic_certified,
          category: product.category ?? '',
          allergens: product.allergens ?? [],
          image: product.image ?? '',
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [allergensList, setAllergensList] = useState([]);

  // Fetch categories and allergens on mount
  useEffect(() => {
    fetch('/api/categories/')
      .then(res => res.json())
      .then(data => setCategories(data.results ?? data));
    fetch('/api/allergens/')
      .then(res => res.json())
      .then(data => setAllergensList(data.results ?? data));
  }, []);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleAllergenToggle(allergenId) {
    setForm((f) => {
      const current = f.allergens;
      return {
        ...f,
        allergens: current.includes(allergenId)
          ? current.filter((id) => id !== allergenId)
          : [...current, allergenId],
      };
    });
  }

  // Prepares form for api response on 'add product' / 'save changes'
  async function handleSubmit(e) {
    e.preventDefault();

    // disable submit (turns to saving) when user clicks Submit
    setSaving(true);
    setError('');
    const payload = {
      ...form,
      producer: producerId,
      price: parseFloat(form.price),
      stock: parseInt(form.stock, 10),
      category: form.category ? parseInt(form.category, 10) : null,
      allergens: form.allergens,
      image: form.image || null,
    };

    // Edit existing products
    if (isEdit) {

      // PUT = Updating existing record, product_id goes to url
      const res = await fetch(`/api/products/${product.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
        
        // Convert to JSON 
        body: JSON.stringify(payload),
      });

      // Wait for django response and parse back into js object
      const updated = await res.json();

      // replace old row with updated one
      onSaved(updated, 'edit');
    } else {

      // POST = create new record from scratch and generate id
      const res = await fetch('/api/products/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
        body: JSON.stringify(payload),
      });

      // pass new object to django
      const created = await res.json();

      // add new product to list on screen
      onSaved(created, 'add');
    }
    // Re enable save buttone when form is submitted
    setSaving(false);
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>{isEdit ? 'Edit Product' : 'Add New Product'}</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {error && <p className={styles.errorBanner}>{error}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Name */}
          <div className={styles.field}>
            <label>Product Name *</label>
            <input name="name" value={form.name} onChange={handleChange} required />
          </div>

          {/* Description */}
          <div className={styles.field}>
            <label>Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3} />
          </div>

          {/* Row: category + image */}
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>Category</label>
              <select name="category" value={form.category} onChange={handleChange}>
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>Image URL</label>
              <input name="image" type="url" placeholder="https://..." value={form.image} onChange={handleChange} />
            </div>
          </div>

          {/* Row: price + unit + stock */}
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>Price (£) *</label>
              <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange} required />
            </div>
            <div className={styles.field}>
              <label>Unit *</label>
              <select name="unit" value={form.unit} onChange={handleChange} required>
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>Stock *</label>
              <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} required />
            </div>
          </div>

          {/* Row: dates */}
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>Availability Start *</label>
              <input name="availability_start" type="date" value={form.availability_start} onChange={handleChange} required />
            </div>
            <div className={styles.field}>
              <label>Availability End *</label>
              <input name="availability_end" type="date" value={form.availability_end} onChange={handleChange} required />
            </div>
          </div>

          {/* Row: status + organic */}
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>Status *</label>
              <select name="status" value={form.status} onChange={handleChange} required>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>Organic</label>
              <label className={styles.allergenCheckbox}>
                <input name="organic_certified" type="checkbox" checked={form.organic_certified} onChange={handleChange} />
                Organic Certified
              </label>
            </div>
          </div>

          {/* Allergens */}
          {allergensList.length > 0 && (
            <div className={styles.field}>
              <label>Allergens</label>
              <div className={styles.allergensGrid}>
                {allergensList.map((a) => (
                  <label key={a.id} className={styles.allergenCheckbox}>
                    <input
                      type="checkbox"
                      checked={form.allergens.includes(a.id)}
                      onChange={() => handleAllergenToggle(a.id)}
                    />
                    {a.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* Delete confirmation modal  */
function DeleteModal({ product, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setDeleting(true);
    setError('');
    try {
      
      // Send delete request to backend
      const res = await fetch(`/api/products/${product.id}/`, {
        method: 'DELETE',
        headers: { 'X-CSRFToken': getCookie('csrftoken') },
      });

      // Remove listed product from screen
      onDeleted(product.id);
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`${styles.modal} ${styles.deleteModal}`}>
        <h3>Delete Product</h3>
        <p>
          Are you sure you want to delete <strong>{product.name}</strong>?
          This cannot be undone.
        </p>
        {error && <p className={styles.errorBanner}>{error}</p>}
        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={deleting}>Cancel</button>
          <button className={styles.deleteBtn} onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Main component  */
export default function ProducerProducts() {
  const [allProducers, setAllProducers] = useState([]);
  const [selectedProducerId, setSelectedProducerId] = useState('');
  const [producerName, setProducerName] = useState('');

  const [producerId, setProducerId] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading] = useState(false);
  const [error] = useState('');

  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    fetch('/api/producers/')
      .then(res => res.json())
      .then(data => setAllProducers(data.results ?? data));
  }, []);

  /* Load products when a producer is selected */
  function handleProducerSelect(e) {
    const pid = e.target.value;
    setSelectedProducerId(pid);
    if (!pid) {
      setProducerId(null);
      setProducerName('');
      setProducts([]);
      return;
    }
    const chosen = allProducers.find((p) => p.id === parseInt(pid, 10));
    const pidInt = parseInt(pid, 10);
    setProducerId(pidInt);
    setProducerName(chosen?.company_name ?? 'Producer');
    fetch(`/api/products/?producer=${pid}`)
      .then(res => res.json())
      .then(data => setProducts(data.results ?? data));
  }

  function handleSaved(product, mode) {
    setProducts((prev) =>
      mode === 'edit'
        ? prev.map((p) => (p.id === product.id ? product : p))
        : [...prev, product].sort((a, b) => a.name.localeCompare(b.name))
    );
    setEditTarget(null);
  }

  function handleDeleted(id) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setDeleteTarget(null);
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

      {/* Producer picker --- REMOVE LATER ON */}
      <div className={styles.adminBanner}>
        <span className={styles.adminLabel}>Producer:</span>
        <select
          className={styles.adminSelect}
          value={selectedProducerId}
          onChange={handleProducerSelect}
        >
          <option value="">— Choose a producer —</option>
          {allProducers.map((p) => (
            <option key={p.id} value={p.id}>{p.company_name}</option>
          ))}
        </select>
        {allProducers.length === 0 && (
          <span className={styles.adminHint}>
            No producers in the database yet.
          </span>
        )}
      </div>

      {/* Header */}
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>
            {producerName ? `${producerName} — Products` : 'My Products'}
          </h2>
          {producerId && (
            <p className={styles.subtitle}>
              {products.length} product{products.length !== 1 ? 's' : ''} listed
            </p>
          )}
        </div>
        {producerId && (
          <button className={styles.addBtn} onClick={() => setEditTarget('new')}>
            + Add Product
          </button>
        )}
      </div>

      {/* Body */}
      {!producerId ? (
        <div className={styles.empty}>
          <p>Choose a producer above to view and manage their products.</p>
        </div>
      ) : products.length === 0 ? (
        <div className={styles.empty}>
          <p>No products listed yet.</p>
          <button className={styles.addBtn} onClick={() => setEditTarget('new')}>
            Add your first product
          </button>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Unit</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Organic</th>
                <th>Available</th>
                <th className={styles.actionsCol}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className={styles.nameCell}>
                    <span className={styles.productName}>{p.name}</span>
                    {p.description && (
                      <span className={styles.productDesc}>{p.description}</span>
                    )}
                  </td>
                  <td>{p.category_name ?? <span className={styles.muted}>—</span>}</td>
                  <td>£{parseFloat(p.price).toFixed(2)}</td>
                  <td>{p.unit}</td>
                  <td>
                    <span className={p.stock === 0 ? styles.stockZero : styles.stock}>
                      {p.stock}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${p.status === 'available' ? styles.badgeGreen : styles.badgeGrey}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className={styles.centredCell}>{p.organic_certified ? '✓' : '—'}</td>
                  <td className={styles.dateCell}>
                    <span>{p.availability_start}</span>
                    <span className={styles.dateSep}>→</span>
                    <span>{p.availability_end}</span>
                  </td>
                  <td className={styles.actionsCell}>
                    <div className={styles.actionsBtns}>
                      <button className={styles.editBtn} onClick={() => setEditTarget(p)} aria-label={`Edit ${p.name}`}>
                        Edit
                      </button>
                      <button className={styles.deleteRowBtn} onClick={() => setDeleteTarget(p)} aria-label={`Delete ${p.name}`}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit modal */}
      {editTarget !== null && (
        <ProductModal
          product={editTarget === 'new' ? null : editTarget}
          producerId={producerId}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget !== null && (
        <DeleteModal
          product={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </section>
  );
}
