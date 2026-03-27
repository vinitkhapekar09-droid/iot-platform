import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getProjects, createProject, deleteProject } from '../api/projects'
import client from '../api/client'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsEmail, setSettingsEmail] = useState(user?.alert_email || '')
  const [settingsMessage, setSettingsMessage] = useState('')
  const [settingsError, setSettingsError] = useState('')

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const res = await getProjects()
      setProjects(res.data)
    } catch {
      setError('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await createProject(form)
      setForm({ name: '', description: '' })
      setShowForm(false)
      fetchProjects()
    } catch {
      setError('Failed to create project')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this project and all its data?')) return
    try {
      await deleteProject(id)
      fetchProjects()
    } catch {
      setError('Failed to delete project')
    }
  }

  const saveSettings = async () => {
    setSettingsError('')
    setSettingsMessage('')
    try {
      console.log('Saving alert email:', settingsEmail)
      const response = await client.patch('/auth/me/alert-email', {
        alert_email: settingsEmail || null,
      })
      console.log('Success response:', response.data)
      setSettingsMessage('Alert email updated successfully!')
      setSettingsError('')
    } catch (err) {
      console.error('Error saving alert email:', err)
      console.error('Error response:', err.response?.data)
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to update alert email'
      setSettingsError(errorMsg)
      setSettingsMessage('')
    }
  }

  return (
    <div style={styles.page}>
      {/* Navbar */}
      <div style={styles.navbar}>
        <span style={styles.navLogo}>⚡ IoT Platform</span>
        <div style={styles.navRight}>
          <span style={styles.navUser}>👤 {user?.email}</span>
          <button 
            style={styles.settingsBtn} 
            onClick={() => setSettingsOpen(true)}
            title="Settings"
          >
            ⚙️
          </button>
          <button style={styles.logoutBtn} onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={styles.content}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>My Projects</h1>
            <p style={styles.subtitle}>
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button style={styles.createBtn} onClick={() => setShowForm(!showForm)}>
            + New Project
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {/* Create project form */}
        {showForm && (
          <div style={styles.formCard}>
            <h3 style={styles.formTitle}>New Project</h3>
            <form onSubmit={handleCreate}>
              <input
                style={styles.input}
                placeholder="Project name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <input
                style={{ ...styles.input, marginTop: '0.75rem' }}
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <div style={styles.formButtons}>
                <button style={styles.cancelBtn} type="button"
                  onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button style={styles.submitBtn} type="submit">
                  Create
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Projects grid */}
        {loading ? (
          <p style={styles.empty}>Loading...</p>
        ) : projects.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyIcon}>📡</p>
            <p style={styles.emptyText}>No projects yet</p>
            <p style={styles.emptySubtext}>
              Create your first project to start collecting sensor data
            </p>
          </div>
        ) : (
          <div style={styles.grid}>
            {projects.map((project) => (
              <div key={project.id} style={styles.projectCard}>
                <div style={styles.projectHeader}>
                  <span style={styles.projectIcon}>📡</span>
                  <span style={styles.projectDate}>
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 style={styles.projectName}>{project.name}</h3>
                <p style={styles.projectDesc}>
                  {project.description || 'No description'}
                </p>
                <div style={styles.projectFooter}>
                  <button
                    style={styles.viewBtn}
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    View Dashboard →
                  </button>
                  <button
                    style={styles.deleteBtn}
                    onClick={() => handleDelete(project.id)}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {settingsOpen && (
        <> 
          <div
            style={styles.drawerBackdrop}
            onClick={() => setSettingsOpen(false)}
          />
          <div style={styles.drawer}>
            {/* Drawer Header */}
            <div style={styles.drawerHeader}>
              <h2 style={styles.drawerTitle}>Settings</h2>
              <button
                style={styles.closeBtn}
                onClick={() => setSettingsOpen(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div style={styles.drawerContent}>
              {/* Notifications Section */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>📧 Notifications</h3>
                <p style={styles.sectionDesc}>
                  Configure how you receive alerts from your IoT devices
                </p>
                
                <div style={styles.settingItem}>
                  <label style={styles.settingLabel}>Alert Email Address</label>
                  <p style={styles.settingHint}>
                    Where alerts will be sent (leave empty to use {user?.email})
                  </p>
                  <input
                    style={styles.drawerInput}
                    type="email"
                    placeholder="alerts@example.com"
                    value={settingsEmail}
                    onChange={(e) => setSettingsEmail(e.target.value)}
                  />
                </div>

                {settingsMessage && (
                  <div style={styles.alertSuccess}>{settingsMessage}</div>
                )}
                {settingsError && (
                  <div style={styles.alertError}>{settingsError}</div>
                )}

                <div style={styles.actionButtons}>
                  <button style={styles.submitBtn} onClick={saveSettings}>
                    Save Changes
                  </button>
                  <button style={styles.cancelBtn} onClick={() => setSettingsOpen(false)}>
                    Close
                  </button>
                </div>
              </div>

              {/* Account Section */}
              <div style={styles.divider} />
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>👤 Account</h3>
                <div style={styles.settingItem}>
                  <label style={styles.settingLabel}>Email Address</label>
                  <p style={styles.settingValue}>{user?.email}</p>
                </div>
                <div style={styles.settingItem}>
                  <label style={styles.settingLabel}>Account Created</label>
                  <p style={styles.settingValue}>
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#0f172a' },
  navbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '1rem 2rem', background: '#1e293b',
    borderBottom: '1px solid #334155',
  },
  navLogo: { fontSize: '1.25rem', fontWeight: '700', color: '#38bdf8' },
  navRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
  navUser: { color: '#94a3b8', fontSize: '0.875rem' },
  settingsBtn: {
    padding: '0.4rem 0.6rem', background: 'transparent',
    border: '1px solid #475569', borderRadius: '6px',
    color: '#94a3b8', fontSize: '1rem', cursor: 'pointer',
  },
  logoutBtn: {
    padding: '0.4rem 0.9rem', background: 'transparent',
    border: '1px solid #475569', borderRadius: '6px',
    color: '#94a3b8', fontSize: '0.875rem',
  },
  content: { maxWidth: '1100px', margin: '0 auto', padding: '2rem' },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '2rem',
  },
  title: { fontSize: '1.75rem', fontWeight: '700', color: '#f1f5f9' },
  subtitle: { color: '#94a3b8', marginTop: '0.25rem', fontSize: '0.9rem' },
  createBtn: {
    padding: '0.65rem 1.25rem', background: '#38bdf8',
    color: '#0f172a', border: 'none', borderRadius: '8px',
    fontWeight: '600', fontSize: '0.95rem',
  },
  error: {
    background: '#450a0a', color: '#fca5a5', padding: '0.75rem',
    borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem',
  },
  formCard: {
    background: '#1e293b', padding: '1.5rem', borderRadius: '12px',
    border: '1px solid #334155', marginBottom: '2rem',
  },
  formTitle: { color: '#f1f5f9', marginBottom: '1rem', fontSize: '1rem' },
  input: {
    width: '100%', padding: '0.65rem 0.85rem', background: '#0f172a',
    border: '1px solid #334155', borderRadius: '8px',
    color: '#f1f5f9', fontSize: '0.95rem',
  },
  formButtons: {
    display: 'flex', gap: '0.75rem',
    justifyContent: 'flex-end', marginTop: '1rem',
  },
  cancelBtn: {
    flex: 1,
    padding: '0.65rem 1rem',
    background: 'transparent',
    border: '1px solid #475569',
    borderRadius: '6px',
    color: '#94a3b8',
    fontWeight: '500',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  submitBtn: {
    flex: 1,
    padding: '0.65rem 1rem',
    background: '#38bdf8',
    border: 'none',
    borderRadius: '6px',
    color: '#0f172a',
    fontWeight: '600',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.25rem',
  },
  projectCard: {
    background: '#1e293b', padding: '1.5rem', borderRadius: '12px',
    border: '1px solid #334155',
  },
  projectHeader: {
    display: 'flex', justifyContent: 'space-between',
    marginBottom: '0.75rem',
  },
  projectIcon: { fontSize: '1.5rem' },
  projectDate: { color: '#475569', fontSize: '0.8rem' },
  projectName: { color: '#f1f5f9', fontSize: '1.1rem', fontWeight: '600' },
  projectDesc: {
    color: '#94a3b8', fontSize: '0.875rem',
    margin: '0.4rem 0 1rem', lineHeight: '1.4',
  },
  projectFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  viewBtn: {
    padding: '0.5rem 1rem', background: '#0f172a',
    border: '1px solid #38bdf8', borderRadius: '6px',
    color: '#38bdf8', fontSize: '0.875rem',
  },
  deleteBtn: {
    padding: '0.5rem', background: 'transparent',
    border: '1px solid #334155', borderRadius: '6px', fontSize: '1rem',
  },
  emptyState: { textAlign: 'center', padding: '4rem 0' },
  emptyIcon: { fontSize: '3rem', marginBottom: '1rem' },
  emptyText: { color: '#f1f5f9', fontSize: '1.1rem', fontWeight: '600' },
  drawerBackdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 },
  drawer: {
    position: 'fixed',
    right: 0,
    top: 0,
    bottom: 0,
    width: '420px',
    background: '#0f172a',
    zIndex: 101,
    borderLeft: '1px solid #334155',
    boxShadow: '-8px 0 24px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  drawerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.5rem',
    borderBottom: '1px solid #334155',
    flexShrink: 0,
  },
  drawerTitle: {
    color: '#f1f5f9',
    fontSize: '1.5rem',
    fontWeight: '700',
    margin: 0,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: '1.25rem',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.5rem',
  },
  section: {
    marginBottom: '1.5rem',
  },
  sectionTitle: {
    color: '#f1f5f9',
    fontSize: '1rem',
    fontWeight: '700',
    margin: '0 0 0.5rem 0',
  },
  sectionDesc: {
    color: '#94a3b8',
    fontSize: '0.85rem',
    marginBottom: '1rem',
  },
  settingItem: {
    marginBottom: '1.25rem',
  },
  settingLabel: {
    color: '#f1f5f9',
    fontSize: '0.9rem',
    fontWeight: '600',
    display: 'block',
    marginBottom: '0.5rem',
  },
  settingHint: {
    color: '#64748b',
    fontSize: '0.8rem',
    margin: '0.3rem 0 0.75rem 0',
  },
  settingValue: {
    color: '#cbd5e1',
    fontSize: '0.9rem',
    margin: 0,
    padding: '0.75rem',
    background: '#1e293b',
    borderRadius: '6px',
    border: '1px solid #334155',
  },
  drawerLabel: { color: '#94a3b8', marginBottom: '0.3rem', display: 'block' },
  drawerInput: {
    width: '100%',
    padding: '0.75rem',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#f1f5f9',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
  },
  alertSuccess: {
    background: '#052e16',
    color: '#4ade80',
    border: '1px solid #22c55e',
    padding: '0.75rem',
    borderRadius: '6px',
    marginTop: '0.75rem',
    fontSize: '0.85rem',
  },
  alertError: {
    background: '#450a0a',
    color: '#fca5a5',
    border: '1px solid #dc2626',
    padding: '0.75rem',
    borderRadius: '6px',
    marginTop: '0.75rem',
    fontSize: '0.85rem',
  },
  actionButtons: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '1.25rem',
  },
  divider: {
    height: '1px',
    background: '#334155',
    margin: '1.5rem 0',
  },
  success: { background: '#052e16', color: '#4ade80', border: '1px solid #22c55e', padding: '0.6rem 0.75rem', borderRadius: '6px', marginTop: '0.5rem' },
  emptySubtext: { color: '#94a3b8', marginTop: '0.5rem', fontSize: '0.9rem' },
  empty: { color: '#94a3b8', textAlign: 'center', padding: '2rem' },
}