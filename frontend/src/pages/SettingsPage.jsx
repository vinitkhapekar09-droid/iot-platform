import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const [alertEmail, setAlertEmail] = useState(user?.alert_email || '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')

  useEffect(() => {
    if (user) {
      setAlertEmail(user.alert_email || '')
    }
  }, [user])

  const handleSave = async () => {
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/auth/me/alert-email`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ alert_email: alertEmail || null }),
        }
      )

      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(err?.detail || err?.message || 'Failed to update alert email')
      }

      setMessageType('success')
      setMessage('Alert email updated successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessageType('error')
      setMessage(err.message || 'Error updating alert email')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      {/* Navbar */}
      <div style={styles.navbar}>
        <button
          style={styles.back}
          onClick={() => navigate('/')}
        >
          ← Back to Dashboard
        </button>
        <span style={styles.navLogo}>⚡ IoT Platform</span>
      </div>

      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>⚙️ Settings</h1>
          <p style={styles.subtitle}>Manage your alert preferences</p>
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>🚨 Alert Email</h2>
          <p style={styles.description}>
            Choose where you'd like to receive alert notifications. Leave blank to use your account email.
          </p>

          <div style={styles.formGroup}>
            <label style={styles.label}>Alert Email Address</label>
            <input
              type="email"
              style={styles.input}
              placeholder="your-email@example.com"
              value={alertEmail}
              onChange={(e) => setAlertEmail(e.target.value)}
            />
            <p style={styles.hint}>
              {alertEmail
                ? `Alerts will be sent to ${alertEmail}`
                : `Alerts will be sent to your account email: ${user?.email}`}
            </p>
          </div>

          {message && (
            <div
              style={{
                ...styles.message,
                ...(messageType === 'success' ? styles.messageSuccess : styles.messageError),
              }}
            >
              {messageType === 'success' ? '✅' : '❌'} {message}
            </div>
          )}

          <div style={styles.buttonGroup}>
            <button
              style={styles.saveBtn}
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? '💾 Saving...' : '💾 Save Settings'}
            </button>
            <button
              style={styles.clearBtn}
              onClick={() => setAlertEmail('')}
              disabled={loading || !alertEmail}
            >
              Clear
            </button>
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>📋 Account Information</h2>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Full Name:</span>
            <span style={styles.infoValue}>{user?.full_name || 'Not set'}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Email:</span>
            <span style={styles.infoValue}>{user?.email}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Member Since:</span>
            <span style={styles.infoValue}>
              {new Date(user?.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0f172a',
    color: '#e2e8f0',
  },
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#1e293b',
    padding: '1rem 2rem',
    borderBottom: '1px solid #334155',
  },
  back: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.95rem',
  },
  navLogo: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#38bdf8',
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
  },
  header: {
    marginBottom: '2rem',
  },
  title: {
    color: '#f1f5f9',
    fontSize: '2rem',
    fontWeight: '700',
    margin: '0 0 0.5rem 0',
  },
  subtitle: {
    color: '#94a3b8',
    margin: '0',
  },
  card: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '2rem',
    marginBottom: '1.5rem',
  },
  sectionTitle: {
    color: '#f1f5f9',
    fontSize: '1.1rem',
    fontWeight: '600',
    margin: '0 0 1rem 0',
  },
  description: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    margin: '0 0 1.5rem 0',
  },
  formGroup: {
    marginBottom: '1.5rem',
  },
  label: {
    display: 'block',
    color: '#cbd5e1',
    fontSize: '0.95rem',
    fontWeight: '500',
    marginBottom: '0.5rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#f1f5f9',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },
  hint: {
    color: '#64748b',
    fontSize: '0.85rem',
    margin: '0.5rem 0 0 0',
  },
  message: {
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontSize: '0.95rem',
  },
  messageSuccess: {
    background: '#052e16',
    color: '#4ade80',
    border: '1px solid #22c55e',
  },
  messageError: {
    background: '#4c0519',
    color: '#f87171',
    border: '1px solid #ef4444',
  },
  buttonGroup: {
    display: 'flex',
    gap: '1rem',
  },
  saveBtn: {
    flex: 1,
    padding: '0.75rem 1.5rem',
    background: '#38bdf8',
    border: 'none',
    borderRadius: '8px',
    color: '#0f172a',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '0.95rem',
  },
  clearBtn: {
    padding: '0.75rem 1.5rem',
    background: 'transparent',
    border: '1px solid #475569',
    borderRadius: '8px',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.95rem',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 0',
    borderBottom: '1px solid #334155',
  },
  infoLabel: {
    color: '#94a3b8',
    fontWeight: '500',
  },
  infoValue: {
    color: '#e2e8f0',
  },
}
