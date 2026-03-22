import { useState, useEffect } from 'react'
import {
  getAlertRules,
  createAlertRule,
  deleteAlertRule,
  toggleAlertRule,
  getAlertHistory,
} from '../api/projects'

const CONDITIONS = [
  { value: 'gt', label: 'Greater than (>)' },
  { value: 'lt', label: 'Less than (<)' },
  { value: 'offline', label: 'Device offline' },
]

const SEVERITY_COLOR = {
  gt: '#f97316',
  lt: '#38bdf8',
  offline: '#ef4444',
  anomaly: '#a78bfa',
  anomaly_score_gt: '#a78bfa',
}

function timeAgo(isoString) {
  const diff = Math.floor(
    (new Date() - new Date(isoString + 'Z')) / 1000
  )
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function AlertPanel({ projectId }) {
  const [rules, setRules] = useState([])
  const [history, setHistory] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState('history')
  const [form, setForm] = useState({
    device_id: '',
    metric_name: '',
    condition: 'gt',
    threshold_value: '',
    cooldown_minutes: 30,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchHistory, 30000)
    return () => clearInterval(interval)
  }, [projectId])

  const fetchAll = async () => {
    await Promise.all([fetchRules(), fetchHistory()])
  }

  const fetchRules = async () => {
    try {
      const res = await getAlertRules(projectId)
      setRules(res.data)
    } catch (err) {
      console.error('Failed to fetch rules', err)
    }
  }

  const fetchHistory = async () => {
    try {
      const res = await getAlertHistory(projectId)
      setHistory(res.data)
    } catch (err) {
      console.error('Failed to fetch history', err)
    }
  }

  const handleCreate = async () => {
    if (!form.device_id || !form.metric_name) return
    setLoading(true)
    try {
      await createAlertRule(projectId, {
        ...form,
        threshold_value: form.condition === 'offline'
          ? null
          : parseFloat(form.threshold_value),
      })
      setForm({
        device_id: '',
        metric_name: '',
        condition: 'gt',
        threshold_value: '',
        cooldown_minutes: 30,
      })
      setShowForm(false)
      fetchRules()
    } catch (err) {
      console.error('Failed to create rule', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (ruleId) => {
    if (!confirm('Delete this alert rule?')) return
    await deleteAlertRule(projectId, ruleId)
    fetchRules()
  }

  const handleToggle = async (ruleId) => {
    await toggleAlertRule(projectId, ruleId)
    fetchRules()
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>🚨 Alerts</h3>
        <button
          style={styles.addBtn}
          onClick={() => setShowForm(!showForm)}
        >
          + New Rule
        </button>
      </div>

      {/* Create Rule Form */}
      {showForm && (
        <div style={styles.form}>
          <h4 style={styles.formTitle}>Create Alert Rule</h4>
          <div style={styles.formGrid}>
            <div style={styles.formField}>
              <label style={styles.label}>Device ID</label>
              <input
                style={styles.input}
                placeholder="esp32-bedroom-01"
                value={form.device_id}
                onChange={(e) => setForm({ ...form, device_id: e.target.value })}
              />
            </div>
            <div style={styles.formField}>
              <label style={styles.label}>Metric</label>
              <input
                style={styles.input}
                placeholder="temperature"
                value={form.metric_name}
                onChange={(e) => setForm({ ...form, metric_name: e.target.value })}
              />
            </div>
            <div style={styles.formField}>
              <label style={styles.label}>Condition</label>
              <select
                style={styles.input}
                value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value })}
              >
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            {form.condition !== 'offline' && (
              <div style={styles.formField}>
                <label style={styles.label}>Threshold Value</label>
                <input
                  style={styles.input}
                  type="number"
                  placeholder="30"
                  value={form.threshold_value}
                  onChange={(e) => setForm({ ...form, threshold_value: e.target.value })}
                />
              </div>
            )}
            <div style={styles.formField}>
              <label style={styles.label}>Cooldown (minutes)</label>
              <input
                style={styles.input}
                type="number"
                value={form.cooldown_minutes}
                onChange={(e) => setForm({
                  ...form,
                  cooldown_minutes: parseInt(e.target.value)
                })}
              />
            </div>
          </div>
          <div style={styles.formButtons}>
            <button
              style={styles.cancelBtn}
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
            <button
              style={styles.createBtn}
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Rule'}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'history' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('history')}
        >
          History ({history.length})
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'rules' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('rules')}
        >
          Rules ({rules.length})
        </button>
      </div>

      {/* Alert History Tab */}
      {activeTab === 'history' && (
        <div>
          {history.length === 0 ? (
            <div style={styles.empty}>
              <p>No alerts triggered yet</p>
              <p style={styles.emptyHint}>
                Create a rule above to start monitoring
              </p>
            </div>
          ) : (
            history.map((h) => (
              <div key={h.id} style={styles.historyItem}>
                <div style={styles.historyLeft}>
                  <span style={{
                    ...styles.dot,
                    background: h.email_sent ? '#4ade80' : '#ef4444',
                  }} />
                  <div>
                    <div style={styles.historyDevice}>
                      📟 {h.device_id}
                    </div>
                    <div style={styles.historyMessage}>
                      {h.message}
                    </div>
                  </div>
                </div>
                <div style={styles.historyRight}>
                  <div style={styles.historyTime}>
                    {timeAgo(h.sent_at)}
                  </div>
                  <div style={{
                    ...styles.emailBadge,
                    background: h.email_sent ? '#052e16' : '#1c1917',
                    color: h.email_sent ? '#4ade80' : '#78716c',
                  }}>
                    {h.email_sent ? '📧 Sent' : '📧 Failed'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div>
          {rules.length === 0 ? (
            <div style={styles.empty}>
              <p>No alert rules yet</p>
              <p style={styles.emptyHint}>
                Click "+ New Rule" to create one
              </p>
            </div>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} style={styles.ruleItem}>
                <div style={styles.ruleLeft}>
                  <span style={{
                    ...styles.conditionBadge,
                    background: (SEVERITY_COLOR[rule.condition] || '#475569') + '20',
                    color: SEVERITY_COLOR[rule.condition] || '#475569',
                  }}>
                    {rule.condition}
                  </span>
                  <div>
                    <div style={styles.ruleDevice}>
                      📟 {rule.device_id}
                    </div>
                    <div style={styles.ruleDetail}>
                      {rule.metric_name}
                      {rule.threshold_value != null && (
                        <span> → {rule.condition === 'gt' ? '>' : '<'} {rule.threshold_value}</span>
                      )}
                      <span style={styles.cooldown}>
                        · {rule.cooldown_minutes}m cooldown
                      </span>
                    </div>
                  </div>
                </div>
                <div style={styles.ruleRight}>
                  <button
                    style={{
                      ...styles.toggleBtn,
                      background: rule.is_active ? '#052e16' : '#1c1917',
                      color: rule.is_active ? '#4ade80' : '#78716c',
                    }}
                    onClick={() => handleToggle(rule.id)}
                  >
                    {rule.is_active ? '● ON' : '○ OFF'}
                  </button>
                  <button
                    style={styles.deleteBtn}
                    onClick={() => handleDelete(rule.id)}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    background: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  title: { color: '#f1f5f9', fontSize: '1rem', fontWeight: '600' },
  addBtn: {
    padding: '0.4rem 0.85rem',
    background: '#1e3a5f',
    border: '1px solid #38bdf8',
    borderRadius: '6px',
    color: '#38bdf8',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  form: {
    background: '#0f172a',
    borderRadius: '8px',
    padding: '1.25rem',
    marginBottom: '1rem',
    border: '1px solid #334155',
  },
  formTitle: {
    color: '#f1f5f9',
    fontSize: '0.9rem',
    fontWeight: '600',
    marginBottom: '1rem',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  formField: {},
  label: {
    display: 'block',
    color: '#94a3b8',
    fontSize: '0.78rem',
    marginBottom: '0.3rem',
  },
  input: {
    width: '100%',
    padding: '0.55rem 0.75rem',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#f1f5f9',
    fontSize: '0.875rem',
  },
  formButtons: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    padding: '0.5rem 1rem',
    background: 'transparent',
    border: '1px solid #475569',
    borderRadius: '6px',
    color: '#94a3b8',
    cursor: 'pointer',
  },
  createBtn: {
    padding: '0.5rem 1.25rem',
    background: '#38bdf8',
    border: 'none',
    borderRadius: '6px',
    color: '#0f172a',
    fontWeight: '600',
    cursor: 'pointer',
  },
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
    borderBottom: '1px solid #334155',
    paddingBottom: '0.5rem',
  },
  tab: {
    padding: '0.4rem 0.85rem',
    background: 'transparent',
    border: 'none',
    borderRadius: '6px',
    color: '#94a3b8',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  tabActive: {
    background: '#334155',
    color: '#f1f5f9',
  },
  empty: {
    textAlign: 'center',
    padding: '2rem',
    color: '#94a3b8',
    fontSize: '0.875rem',
  },
  emptyHint: {
    color: '#475569',
    fontSize: '0.8rem',
    marginTop: '0.25rem',
  },
  historyItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '0.75rem 0',
    borderBottom: '1px solid #1e293b',
  },
  historyLeft: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-start',
    flex: 1,
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginTop: '5px',
    flexShrink: 0,
  },
  historyDevice: {
    color: '#e2e8f0',
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  historyMessage: {
    color: '#94a3b8',
    fontSize: '0.8rem',
    marginTop: '0.2rem',
  },
  historyRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.25rem',
    flexShrink: 0,
    marginLeft: '1rem',
  },
  historyTime: {
    color: '#475569',
    fontSize: '0.75rem',
  },
  emailBadge: {
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.7rem',
  },
  ruleItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 0',
    borderBottom: '1px solid #1e293b',
  },
  ruleLeft: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
  },
  conditionBadge: {
    padding: '0.2rem 0.6rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  ruleDevice: {
    color: '#e2e8f0',
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  ruleDetail: {
    color: '#94a3b8',
    fontSize: '0.8rem',
    marginTop: '0.2rem',
  },
  cooldown: { color: '#475569' },
  ruleRight: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  toggleBtn: {
    padding: '0.3rem 0.7rem',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.78rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: '0.3rem 0.6rem',
    background: 'transparent',
    border: '1px solid #334155',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
}