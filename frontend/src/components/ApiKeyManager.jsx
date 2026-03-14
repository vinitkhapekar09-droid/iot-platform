import { useState, useEffect } from 'react'
import { getProjectKeys, createApiKey, deleteApiKey } from '../api/projects'

export default function ApiKeyManager({ projectId }) {
  const [keys, setKeys] = useState([])
  const [label, setLabel] = useState('')
  const [newKey, setNewKey] = useState(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { fetchKeys() }, [projectId])

  const fetchKeys = async () => {
    const res = await getProjectKeys(projectId)
    setKeys(res.data)
  }

  const handleCreate = async () => {
    if (!label.trim()) return
    const res = await createApiKey(projectId, { label })
    setNewKey(res.data.plain_key)
    setLabel('')
    setShowForm(false)
    fetchKeys()
  }

  const handleDelete = async (keyId) => {
    if (!confirm('Revoke this API key?')) return
    await deleteApiKey(projectId, keyId)
    fetchKeys()
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>🔑 API Keys</h3>
        <button style={styles.addBtn} onClick={() => setShowForm(!showForm)}>
          + New Key
        </button>
      </div>

      {/* One-time key display */}
      {newKey && (
        <div style={styles.newKeyBox}>
          <p style={styles.newKeyLabel}>
            ⚠️ Copy this key now — it won't be shown again!
          </p>
          <code style={styles.newKeyValue}>{newKey}</code>
          <button style={styles.dismissBtn} onClick={() => setNewKey(null)}>
            I've copied it
          </button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div style={styles.form}>
          <input
            style={styles.input}
            placeholder="Key label (e.g. ESP32 bedroom)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <button style={styles.createBtn} onClick={handleCreate}>
            Generate
          </button>
        </div>
      )}

      {/* Keys list */}
      {keys.length === 0 ? (
        <p style={styles.empty}>No API keys yet</p>
      ) : (
        keys.map((k) => (
          <div key={k.id} style={styles.keyRow}>
            <div>
              <span style={styles.keyLabel}>{k.label}</span>
              <span style={styles.keyDate}>
                Created {new Date(k.created_at).toLocaleDateString()}
              </span>
            </div>
            <button style={styles.revokeBtn} onClick={() => handleDelete(k.id)}>
              Revoke
            </button>
          </div>
        ))
      )}
    </div>
  )
}

const styles = {
  container: {
    background: '#1e293b', borderRadius: '12px',
    border: '1px solid #334155', padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: '1rem',
  },
  title: { color: '#f1f5f9', fontSize: '1rem', fontWeight: '600' },
  addBtn: {
    padding: '0.4rem 0.85rem', background: '#1e3a5f',
    border: '1px solid #38bdf8', borderRadius: '6px',
    color: '#38bdf8', fontSize: '0.85rem',
  },
  newKeyBox: {
    background: '#1c1917', border: '1px solid #f97316',
    borderRadius: '8px', padding: '1rem', marginBottom: '1rem',
  },
  newKeyLabel: { color: '#fb923c', fontSize: '0.85rem', marginBottom: '0.5rem' },
  newKeyValue: {
    display: 'block', color: '#fde68a', fontSize: '0.85rem',
    wordBreak: 'break-all', marginBottom: '0.75rem',
    background: '#0f172a', padding: '0.5rem', borderRadius: '6px',
  },
  dismissBtn: {
    padding: '0.35rem 0.75rem', background: '#f97316',
    border: 'none', borderRadius: '6px',
    color: 'white', fontSize: '0.8rem',
  },
  form: { display: 'flex', gap: '0.75rem', marginBottom: '1rem' },
  input: {
    flex: 1, padding: '0.55rem 0.85rem', background: '#0f172a',
    border: '1px solid #334155', borderRadius: '8px',
    color: '#f1f5f9', fontSize: '0.9rem',
  },
  createBtn: {
    padding: '0.55rem 1rem', background: '#38bdf8',
    border: 'none', borderRadius: '8px',
    color: '#0f172a', fontWeight: '600',
  },
  keyRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '0.75rem 0',
    borderTop: '1px solid #334155',
  },
  keyLabel: { color: '#e2e8f0', fontSize: '0.9rem', display: 'block' },
  keyDate: { color: '#475569', fontSize: '0.78rem' },
  revokeBtn: {
    padding: '0.3rem 0.7rem', background: 'transparent',
    border: '1px solid #ef4444', borderRadius: '6px',
    color: '#ef4444', fontSize: '0.8rem',
  },
  empty: { color: '#475569', fontSize: '0.875rem', padding: '0.5rem 0' },
}