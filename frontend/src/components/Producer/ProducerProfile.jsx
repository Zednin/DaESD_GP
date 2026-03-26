import { useState, useEffect, useCallback } from 'react';
import shared from '../../pages/Producer/ProducerShared.module.css';
import local from './ProducerProfile.module.css';
const styles = { ...shared, ...local };
import { FiUpload, FiEdit2, FiTrash2, FiBookOpen, FiImage } from 'react-icons/fi';
import apiClient from '../../utils/apiClient';

const SEASONAL_OPTIONS = [
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'autumn', label: 'Autumn' },
  { value: 'winter', label: 'Winter' },
  { value: 'autumn_winter', label: 'Autumn/Winter' },
  { value: 'spring_summer', label: 'Spring/Summer' },
  { value: 'all_year', label: 'All Year Round' },
];

const TABS = [
  { key: 'profile', label: 'Profile & Settings' },
  { key: 'recipes', label: 'Recipes' },
  { key: 'stories', label: 'Farm Stories' },
];

/* ═══════════════════════════════════════════════════════════
   PROFILE SETTINGS SECTION
═══════════════════════════════════════════════════════════ */

function ProfileSettings({ producerId }) {
  const [producer, setProducer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    company_name: '',
    company_email: '',
    company_number: '',
    company_description: '',
    lead_time_hours: 48,
  });

  useEffect(() => {
    if (!producerId) return;
    setLoading(true);
    apiClient.get(`/producers/${producerId}/`)
      .then(res => {
        setProducer(res.data);
        setForm({
          company_name: res.data.company_name || '',
          company_email: res.data.company_email || '',
          company_number: res.data.company_number || '',
          company_description: res.data.company_description || '',
          lead_time_hours: res.data.lead_time_hours ?? 48,
        });
      })
      .catch(err => setError(err.response?.data?.detail || 'Failed to load profile.'))
      .finally(() => setLoading(false));
  }, [producerId]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        ...form,
        lead_time_hours: parseInt(form.lead_time_hours, 10),
        account: producer.account,
      };
      const res = await apiClient.patch(`/producers/${producerId}/`, payload);
      setProducer(res.data);
      setSuccess('Profile updated successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const msg = err.response?.data?.lead_time_hours?.[0]
        || err.response?.data?.detail
        || 'Failed to save profile.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className={styles.centred}><span className={styles.spinner} /> Loading profile...</div>;
  }

  return (
    <form onSubmit={handleSave} className={styles.profileForm}>
      {error && <p className={styles.errorBanner}>{error}</p>}
      {success && <p className={styles.successBanner}>{success}</p>}

      <div className={styles.formRow}>
        <div className={styles.field}>
          <label>Company Name</label>
          <input name="company_name" value={form.company_name} onChange={handleChange} required />
        </div>
        <div className={styles.field}>
          <label>Company Email</label>
          <input name="company_email" type="email" value={form.company_email} onChange={handleChange} required />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.field}>
          <label>Company Number</label>
          <input name="company_number" value={form.company_number} onChange={handleChange} />
        </div>
        <div className={styles.field}>
          <label>Minimum Lead Time (hours)</label>
          <input
            name="lead_time_hours"
            type="number"
            min="48"
            step="1"
            value={form.lead_time_hours}
            onChange={handleChange}
            required
          />
          <span className={styles.fieldHint}>Minimum 48 hours. Orders will require at least this much lead time.</span>
        </div>
      </div>

      <div className={styles.field}>
        <label>Company Description</label>
        <textarea name="company_description" value={form.company_description} onChange={handleChange} rows={4} />
      </div>

      <div className={styles.profileActions}>
        <button type="submit" className={styles.saveBtn} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════
   RECIPE MODAL
═══════════════════════════════════════════════════════════ */

function RecipeModal({ recipe, producerId, onClose, onSaved }) {
  const isEdit = Boolean(recipe?.id);
  const [imageFile, setImageFile] = useState(null);
  const [form, setForm] = useState(
    isEdit
      ? {
          title: recipe.title,
          description: recipe.description || '',
          ingredients: recipe.ingredients || '',
          instructions: recipe.instructions || '',
          seasonal_tag: recipe.seasonal_tag || 'all_year',
          products: recipe.products || [],
          is_published: recipe.is_published ?? false,
          image: recipe.image || '',
        }
      : {
          title: '',
          description: '',
          ingredients: '',
          instructions: '',
          seasonal_tag: 'all_year',
          products: [],
          is_published: false,
          image: '',
        }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [closing, setClosing] = useState(false);
  const [producerProducts, setProducerProducts] = useState([]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    apiClient.get('/products/', { params: { producer: producerId } })
      .then(res => setProducerProducts(res.data.results ?? res.data))
      .catch(() => {});
  }, [producerId]);

  function handleChange(e) {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file') {
      setImageFile(files?.[0] ?? null);
      return;
    }
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleProductToggle(productId) {
    setForm(f => {
      const current = f.products;
      return {
        ...f,
        products: current.includes(productId)
          ? current.filter(id => id !== productId)
          : [...current, productId],
      };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        ...form,
        producer: producerId,
      };

      let saved;
      if (isEdit) {
        const res = await apiClient.put(`/recipes/${recipe.id}/`, payload);
        saved = res.data;
      } else {
        const res = await apiClient.post('/recipes/', payload);
        saved = res.data;
      }

      if (imageFile && saved?.id) {
        const imgForm = new FormData();
        imgForm.append('image', imageFile);
        const imgRes = await apiClient.post(
          `/recipes/${saved.id}/upload-image/`,
          imgForm,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        saved = { ...saved, image: imgRes.data.image };
      }

      onSaved(saved, isEdit ? 'edit' : 'add');
    } catch (err) {
      const message =
        err.response?.data?.detail
        || err.response?.data?.title?.[0]
        || 'Failed to save recipe.';
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`${styles.overlay} ${closing ? styles.overlayClosing : ''}`} onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>{isEdit ? 'Edit Recipe' : 'Add New Recipe'}</h3>
          <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">&#x2715;</button>
        </div>

        {error && <p className={styles.errorBanner}>{error}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Recipe Title *</label>
            <input name="title" value={form.title} onChange={handleChange} required />
          </div>

          <div className={styles.field}>
            <label>Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Brief description of this recipe..." />
          </div>

          <div className={styles.field}>
            <label>Ingredients (one per line)</label>
            <textarea name="ingredients" value={form.ingredients} onChange={handleChange} rows={6} placeholder={"2 large carrots, peeled\n3 parsnips, diced\n500g potatoes\nOlive oil\nSalt and pepper"} />
          </div>

          <div className={styles.field}>
            <label>Cooking Instructions</label>
            <textarea name="instructions" value={form.instructions} onChange={handleChange} rows={6} placeholder={"1. Preheat oven to 200\u00B0C\n2. Chop vegetables into chunks\n3. Toss with olive oil..."} />
          </div>

          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>Seasonal Tag</label>
              <select name="seasonal_tag" value={form.seasonal_tag} onChange={handleChange}>
                {SEASONAL_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>Recipe Image</label>
              <label className={styles.uploadBtn}>
                <FiUpload size={18} />
                {imageFile ? imageFile.name : 'Upload Image'}
                <input name="image" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleChange} />
              </label>
            </div>
          </div>

          {producerProducts.length > 0 && (
            <div className={styles.field}>
              <label>Link to Products (from your inventory)</label>
              <div className={styles.checkboxGrid}>
                {producerProducts.map(p => (
                  <label key={p.id} className={styles.checkboxChip}>
                    <input
                      type="checkbox"
                      checked={form.products.includes(p.id)}
                      onChange={() => handleProductToggle(p.id)}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.publishLabel}>
              <input
                type="checkbox"
                name="is_published"
                checked={form.is_published}
                onChange={handleChange}
              />
              Publish recipe (visible to customers)
            </label>
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={handleClose} disabled={saving}>Cancel</button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FARM STORY MODAL
═══════════════════════════════════════════════════════════ */

function StoryModal({ story, producerId, onClose, onSaved }) {
  const isEdit = Boolean(story?.id);
  const [imageFile, setImageFile] = useState(null);
  const [form, setForm] = useState(
    isEdit
      ? {
          title: story.title,
          content: story.content || '',
          is_published: story.is_published ?? false,
          image: story.image || '',
        }
      : {
          title: '',
          content: '',
          is_published: false,
          image: '',
        }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [closing, setClosing] = useState(false);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  function handleChange(e) {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file') {
      setImageFile(files?.[0] ?? null);
      return;
    }
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = { ...form, producer: producerId };

      let saved;
      if (isEdit) {
        const res = await apiClient.put(`/farm-stories/${story.id}/`, payload);
        saved = res.data;
      } else {
        const res = await apiClient.post('/farm-stories/', payload);
        saved = res.data;
      }

      if (imageFile && saved?.id) {
        const imgForm = new FormData();
        imgForm.append('image', imageFile);
        const imgRes = await apiClient.post(
          `/farm-stories/${saved.id}/upload-image/`,
          imgForm,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        saved = { ...saved, image: imgRes.data.image };
      }

      onSaved(saved, isEdit ? 'edit' : 'add');
    } catch (err) {
      const message =
        err.response?.data?.detail
        || err.response?.data?.title?.[0]
        || 'Failed to save story.';
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`${styles.overlay} ${closing ? styles.overlayClosing : ''}`} onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>{isEdit ? 'Edit Farm Story' : 'Create Farm Story'}</h3>
          <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">&#x2715;</button>
        </div>

        {error && <p className={styles.errorBanner}>{error}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Story Title *</label>
            <input name="title" value={form.title} onChange={handleChange} required />
          </div>

          <div className={styles.field}>
            <label>Story Content *</label>
            <textarea name="content" value={form.content} onChange={handleChange} rows={8} required placeholder="Share your farm story, harvest season updates, educational content..." />
          </div>

          <div className={styles.field}>
            <label>Photo from Farm</label>
            <label className={styles.uploadBtn}>
              <FiUpload size={18} />
              {imageFile ? imageFile.name : 'Upload Photo'}
              <input name="image" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleChange} />
            </label>
          </div>

          <div className={styles.field}>
            <label className={styles.publishLabel}>
              <input
                type="checkbox"
                name="is_published"
                checked={form.is_published}
                onChange={handleChange}
              />
              Publish story (visible to customers)
            </label>
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={handleClose} disabled={saving}>Cancel</button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Publish Story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DELETE CONFIRMATION MODAL
═══════════════════════════════════════════════════════════ */

function DeleteModal({ item, itemType, onClose, onDeleted }) {
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
      const endpoint = itemType === 'recipe' ? '/recipes' : '/farm-stories';
      await apiClient.delete(`${endpoint}/${item.id}/`);
      onDeleted(item.id);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete.');
      setDeleting(false);
    }
  }

  return (
    <div className={`${styles.overlay} ${closing ? styles.overlayClosing : ''}`} onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className={`${styles.modal} ${styles.deleteModal}`}>
        <h3>Delete {itemType === 'recipe' ? 'Recipe' : 'Farm Story'}</h3>
        <p>
          Are you sure you want to delete <strong>{item.title}</strong>?
          This cannot be undone.
        </p>
        {error && <p className={styles.errorBanner}>{error}</p>}
        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={handleClose} disabled={deleting}>Cancel</button>
          <button className={styles.deleteBtn} onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RECIPES TAB
═══════════════════════════════════════════════════════════ */

function RecipesTab({ producerId }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    if (!producerId) return;
    setLoading(true);
    apiClient.get('/recipes/', { params: { producer: producerId } })
      .then(res => setRecipes(res.data.results ?? res.data))
      .catch(err => setError(err.response?.data?.detail || 'Failed to load recipes.'))
      .finally(() => setLoading(false));
  }, [producerId]);

  function handleSaved(recipe, mode) {
    setRecipes(prev =>
      mode === 'edit'
        ? prev.map(r => (r.id === recipe.id ? recipe : r))
        : [recipe, ...prev]
    );
    setEditTarget(null);
  }

  function handleDeleted(id) {
    setRecipes(prev => prev.filter(r => r.id !== id));
    setDeleteTarget(null);
  }

  if (loading) {
    return <div className={styles.centred}><span className={styles.spinner} /> Loading recipes...</div>;
  }

  if (error) {
    return <div className={styles.centred}><p className={styles.errorText}>{error}</p></div>;
  }

  return (
    <>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.subtitle}>{recipes.length} recipe{recipes.length !== 1 ? 's' : ''}</p>
        </div>
        <button className={styles.addBtn} onClick={() => setEditTarget('new')}>+ Add New Recipe</button>
      </div>

      {recipes.length === 0 ? (
        <div className={styles.empty}>
          <FiBookOpen size={32} />
          <p>No recipes yet. Share recipes featuring your products!</p>
          <button className={styles.addBtn} onClick={() => setEditTarget('new')}>Add your first recipe</button>
        </div>
      ) : (
        <div className={styles.contentGrid}>
          {recipes.map(r => (
            <div key={r.id} className={styles.contentCard}>
              {r.image && (
                <div className={styles.cardImage}>
                  <img src={r.image} alt={r.title} />
                </div>
              )}
              <div className={styles.cardBody}>
                <div className={styles.cardTop}>
                  <h4 className={styles.cardTitle}>{r.title}</h4>
                  <div className={styles.cardBadges}>
                    <span className={`${styles.badge} ${r.is_published ? styles.badgeGreen : styles.badgeGrey}`}>
                      {r.is_published ? 'Published' : 'Draft'}
                    </span>
                    <span className={`${styles.badge} ${styles.badgePurple}`}>
                      {SEASONAL_OPTIONS.find(o => o.value === r.seasonal_tag)?.label || r.seasonal_tag}
                    </span>
                  </div>
                </div>
                {r.description && <p className={styles.cardDesc}>{r.description}</p>}
                {r.product_names?.length > 0 && (
                  <div className={styles.linkedProducts}>
                    <span className={styles.linkedLabel}>Linked products:</span>
                    {r.product_names.map((name, i) => (
                      <span key={i} className={`${styles.badge} ${styles.badgeBlue}`}>{name}</span>
                    ))}
                  </div>
                )}
                <div className={styles.cardActions}>
                  <button className={styles.editBtn} onClick={() => setEditTarget(r)}>
                    <FiEdit2 size={14} /> Edit
                  </button>
                  <button className={styles.deleteRowBtn} onClick={() => setDeleteTarget(r)}>
                    <FiTrash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editTarget !== null && (
        <RecipeModal
          recipe={editTarget === 'new' ? null : editTarget}
          producerId={producerId}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget !== null && (
        <DeleteModal
          item={deleteTarget}
          itemType="recipe"
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   FARM STORIES TAB
═══════════════════════════════════════════════════════════ */

function StoriesTab({ producerId }) {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    if (!producerId) return;
    setLoading(true);
    apiClient.get('/farm-stories/', { params: { producer: producerId } })
      .then(res => setStories(res.data.results ?? res.data))
      .catch(err => setError(err.response?.data?.detail || 'Failed to load stories.'))
      .finally(() => setLoading(false));
  }, [producerId]);

  function handleSaved(story, mode) {
    setStories(prev =>
      mode === 'edit'
        ? prev.map(s => (s.id === story.id ? story : s))
        : [story, ...prev]
    );
    setEditTarget(null);
  }

  function handleDeleted(id) {
    setStories(prev => prev.filter(s => s.id !== id));
    setDeleteTarget(null);
  }

  if (loading) {
    return <div className={styles.centred}><span className={styles.spinner} /> Loading stories...</div>;
  }

  if (error) {
    return <div className={styles.centred}><p className={styles.errorText}>{error}</p></div>;
  }

  return (
    <>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.subtitle}>{stories.length} stor{stories.length !== 1 ? 'ies' : 'y'}</p>
        </div>
        <button className={styles.addBtn} onClick={() => setEditTarget('new')}>+ Create Farm Story</button>
      </div>

      {stories.length === 0 ? (
        <div className={styles.empty}>
          <FiImage size={32} />
          <p>No farm stories yet. Share updates from your farm!</p>
          <button className={styles.addBtn} onClick={() => setEditTarget('new')}>Create your first story</button>
        </div>
      ) : (
        <div className={styles.contentGrid}>
          {stories.map(s => (
            <div key={s.id} className={styles.contentCard}>
              {s.image && (
                <div className={styles.cardImage}>
                  <img src={s.image} alt={s.title} />
                </div>
              )}
              <div className={styles.cardBody}>
                <div className={styles.cardTop}>
                  <h4 className={styles.cardTitle}>{s.title}</h4>
                  <span className={`${styles.badge} ${s.is_published ? styles.badgeGreen : styles.badgeGrey}`}>
                    {s.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className={styles.cardDesc}>
                  {s.content.length > 150 ? s.content.slice(0, 150) + '...' : s.content}
                </p>
                <p className={styles.cardDate}>
                  {new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <div className={styles.cardActions}>
                  <button className={styles.editBtn} onClick={() => setEditTarget(s)}>
                    <FiEdit2 size={14} /> Edit
                  </button>
                  <button className={styles.deleteRowBtn} onClick={() => setDeleteTarget(s)}>
                    <FiTrash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editTarget !== null && (
        <StoryModal
          story={editTarget === 'new' ? null : editTarget}
          producerId={producerId}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget !== null && (
        <DeleteModal
          item={deleteTarget}
          itemType="story"
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */

export default function ProducerProfile({ producerId, producerName }) {
  const [activeTab, setActiveTab] = useState('profile');

  if (!producerId) {
    return (
      <div className={styles.centred}>
        <p>Choose a producer above to view their profile.</p>
      </div>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>
            {producerName ? `${producerName} — Profile & Content` : 'Profile & Content'}
          </h2>
          <p className={styles.subtitle}>Manage your profile, recipes, and farm stories</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className={styles.filterTabs}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`${styles.filterTab} ${activeTab === tab.key ? styles.filterTabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'profile' && <ProfileSettings producerId={producerId} />}
      {activeTab === 'recipes' && <RecipesTab producerId={producerId} />}
      {activeTab === 'stories' && <StoriesTab producerId={producerId} />}
    </section>
  );
}
