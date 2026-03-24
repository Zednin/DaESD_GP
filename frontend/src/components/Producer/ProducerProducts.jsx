import { useState, useEffect, useCallback } from 'react';
import shared from '../../pages/Producer/ProducerShared.module.css';
import local from './ProducerProducts.module.css';
const styles = { ...shared, ...local };
import { FiUpload } from 'react-icons/fi';
import apiClient from "../../utils/apiClient";
import { uploadProductImage } from "../../utils/productUploads";

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  unit: 'unit',
  stock: '',
  availability_mode: 'year_round',
  season_start_month: '',
  season_end_month: '',
  harvest_date: '',
  status: 'available',
  organic_certified: false,
  category: '',
  allergens: [],
  image: '',
};


const UNIT_OPTIONS = ['kg', 'g', 'litre', 'ml', 'unit', 'dozen'];
const STATUS_OPTIONS = ['available', 'unavailable'];

const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

function formatAvailability(product) {
  if (product.availability_mode === 'seasonal') {
    const start = MONTH_OPTIONS.find(m => m.value === product.season_start_month)?.label ?? '?';
    const end = MONTH_OPTIONS.find(m => m.value === product.season_end_month)?.label ?? '?';
    return `${start} – ${end}`;
  }
  return 'Year Round';
}

/* Product form modal  */
function ProductModal({ product, producerId, onClose, onSaved }) {
  const isEdit = Boolean(product?.id);
  const [imageFile, setImageFile] = useState(null);
  const [form, setForm] = useState(
    isEdit
      ? {
          name: product.name,
          description: product.description ?? '',
          price: product.price,
          unit: product.unit,
          stock: product.stock,
          availability_mode: product.availability_mode ?? 'year_round',
          season_start_month: product.season_start_month ?? '',
          season_end_month: product.season_end_month ?? '',
          harvest_date: product.harvest_date ? product.harvest_date.slice(0, 16) : '',
          status: product.status,
          organic_certified: product.organic_certified,
          category: product.category ?? '',
          allergens: (product.allergens ?? []).map((a) => (typeof a === 'object' ? a.id : a)),
          image: product.image ?? '',
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [allergensList, setAllergensList] = useState([]);
  const [closing, setClosing] = useState(false);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  // Fetch categories and allergens on mount
  useEffect(() => {
    async function loadFormData() {
      try {
        const [categoriesRes, allergensRes] = await Promise.all([
          apiClient.get("/categories/"),
          apiClient.get("/allergens/"),
        ]);

        setCategories(categoriesRes.data.results ?? categoriesRes.data);
        setAllergensList(allergensRes.data.results ?? allergensRes.data);
      } catch (err) {
        setError("Failed to load form data.");
      }
    }

    loadFormData();
  }, []);

  function handleChange(e) {
    const { name, value, type, checked, files } = e.target;

    if (type === "file") {
      setImageFile(files?.[0] ?? null);
      return;
    }

    setForm((f) => ({
      ...f,
      [name]: type === 'checkbox' ? checked : value
    }));
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
    setSaving(true);
    setError('');

    try {
      const { allergens: _allergens, ...rest } = form;
      const payload = {
        ...rest,
        producer: producerId,
        price: parseFloat(form.price),
        stock: parseInt(form.stock, 10),
        category: form.category ? parseInt(form.category, 10) : null,
        allergen_ids: form.allergens,
        image: form.image || null,
        season_start_month:
          form.availability_mode === 'seasonal' && form.season_start_month
            ? parseInt(form.season_start_month, 10)
            : null,
        season_end_month:
          form.availability_mode === 'seasonal' && form.season_end_month
            ? parseInt(form.season_end_month, 10)
            : null,
        harvest_date: form.harvest_date || null,
      };

      let savedProduct;

      if (isEdit) {
        const res = await apiClient.put(`/products/${product.id}/`, payload);
        savedProduct = res.data;
      } else {
        const res = await apiClient.post(`/products/`, payload);
        savedProduct = res.data;
      }

      // Upload image after product exists / is updated
      if (imageFile && savedProduct?.id) {
        const uploadData = await uploadProductImage(savedProduct.id, imageFile);

        savedProduct = {
          ...savedProduct,
          image: uploadData.image,
        };
      }


      // add new product to list on screen
      onSaved(savedProduct, isEdit ? 'edit' : 'add');
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.image?.[0] ||
        err.response?.data?.non_field_errors?.[0] ||
        "Failed to save product.";
      setError(message);
    } finally {
      // Re enable save buttone when form is submitted
      setSaving(false);
    }
  }

  return (
    <div className={`${styles.overlay} ${closing ? styles.overlayClosing : ''}`} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>{isEdit ? 'Edit Product' : 'Add New Product'}</h3>
          <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">✕</button>
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
              <label>Product Image</label>
              <label className={styles.uploadBtn}>
                <FiUpload size={18} />
                {imageFile ? imageFile.name : 'Upload Image'}
                <input name="image" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleChange}/>
              </label>
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

          {/* Row: availability mode + harvest date */}
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>Availability Mode *</label>
              <select name="availability_mode" value={form.availability_mode} onChange={handleChange} required>
                <option value="year_round">Year Round</option>
                <option value="seasonal">Seasonal</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>Harvest Date</label>
              <input name="harvest_date" type="datetime-local" value={form.harvest_date} onChange={handleChange} />
            </div>
          </div>

          {/* Conditional: season months (only when seasonal) */}
          {form.availability_mode === 'seasonal' && (
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label>Season Start Month *</label>
                <select name="season_start_month" value={form.season_start_month} onChange={handleChange} required>
                  <option value="">-- Select --</option>
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label>Season End Month *</label>
                <select name="season_end_month" value={form.season_end_month} onChange={handleChange} required>
                  <option value="">-- Select --</option>
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

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
  const [closing, setClosing] = useState(false);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  async function handleDelete() {
    setDeleting(true);
    setError('');
    try {
      
      // Send delete request to backend
      await apiClient.delete(`/products/${product.id}/`);

      // Remove listed product from screen
      onDeleted(product.id);
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  return (
    <div className={`${styles.overlay} ${closing ? styles.overlayClosing : ''}`} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className={`${styles.modal} ${styles.deleteModal}`}>
        <h3>Delete Product</h3>
        <p>
          Are you sure you want to delete <strong>{product.name}</strong>?
          This cannot be undone.
        </p>
        {error && <p className={styles.errorBanner}>{error}</p>}
        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={handleClose} disabled={deleting}>Cancel</button>
          <button className={styles.deleteBtn} onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Main component  */
export default function ProducerProducts({ producerId, producerName }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    async function loadProducts() {
      if (!producerId) {
        setProducts([]);
        return;
      }
 
      setLoading(true);
      setError('');

      try {
        const res = await apiClient.get(`/products/`, {
          params: { producer: producerId },
        });
        setProducts(res.data.results ?? res.data);
      } catch (err) {
        setError(err.response?.data?.detail || err.message || "Failed to load products.");
      } finally {
        setLoading(false);
      }
    }

  loadProducts();
}, [producerId]);

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

  if (!producerId) {
    return (
      <div className={styles.centred}>
        <p>Choose a producer above to view and manage their products.</p>
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
      {products.length === 0 ? (
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
                    <span>{formatAvailability(p)}</span>
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
