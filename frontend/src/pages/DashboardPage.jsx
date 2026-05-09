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
      // Ensure we always store an array in state (API may return an object)
      const data = res?.data
      if (Array.isArray(data)) setProjects(data)
      else if (data && Array.isArray(data.projects)) setProjects(data.projects)
      else setProjects([])
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
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarLogo}>
          <span>⚡</span>
          <span style={styles.logoText}>IoT Platform</span>
        </div>
        
        <nav style={styles.sidebarNav}>
          <div
            style={{...styles.navItem, background: 'rgba(56, 189, 248, 0.1)', borderLeft: '3px solid #38bdf8'}}
            onClick={() => navigate('/dashboard')}
          >
            📊 Dashboard
          </div>
          <div style={styles.navItem} onClick={() => navigate('/settings')}>
            ⚙️ Settings
          </div>
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userCard}>
            <div style={styles.userAvatar}>👤</div>
            <div style={styles.userInfo}>
              <div style={styles.userEmailContainer}>
                <div style={styles.userEmail}>{user?.email}</div>
                {user?.is_demo && (
                  <span style={styles.demoBadgeSmall}>DEMO</span>
                )}
              </div>
              <button style={styles.logoutBtnSmall} onClick={() => {
                logout()
                navigate('/')
              }}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navbar */}
      <div style={styles.navbar}>
        <div style={styles.navbarLeft}>
          <span style={styles.navTitle}>Dashboard</span>
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
            {(Array.isArray(projects) ? projects : []).map((project) => (
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
              {/* Demo Mode Info Section */}
              {user?.is_demo && (
                <div style={styles.demoInfoSection}>
                  <h3 style={styles.sectionTitle}>🎯 Demo Mode</h3>
                  <div style={styles.demoInfoBox}>
                    <p style={styles.demoInfoText}>
                      You're using the demo account to explore IoT Platform features.
                    </p>
                    <ul style={styles.demoInfoList}>
                      <li>📊 Data stored for 7 days only</li>
                      <li>💬 Chat limit: 10 messages per session</li>
                      <li>🔒 Read-only mode for alerts</li>
                      <li>❌ No email configuration</li>
                    </ul>
                    <p style={styles.demoCallToAction}>
                      <strong>Want to keep your data?</strong> Create a real account to save unlimited data.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Notifications Section */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>📧 Notifications</h3>
                <p style={styles.sectionDesc}>
                  Configure how you receive alerts from your IoT devices
                </p>
                
                {user?.is_demo ? (
                  <div style={styles.alertInfo}>
                    Email configuration is not available in demo mode. Create a real account to enable alerts.
                  </div>
                ) : (
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
                )}

                {settingsMessage && (
                  <div style={styles.alertSuccess}>{settingsMessage}</div>
                )}
                {settingsError && (
                  <div style={styles.alertError}>{settingsError}</div>
                )}

                <div style={styles.actionButtons}>
                  {!user?.is_demo && (
                    <button style={styles.submitBtn} onClick={saveSettings}>
                      Save Changes
                    </button>
                  )}
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
  page: { 
    minHeight: '100vh', 
    background: '#0f172a',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebar: {
    width: '220px',
    background: '#1e293b',
    borderRight: '1px solid #334155',
    flexDirection: 'column',
    padding: '1.5rem 0',
    position: 'fixed',
    height: '100vh',
    left: 0,
    top: 0,
    overflowY: 'auto',
    zIndex: 50,
  },
  sidebarLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0 1.5rem',
    marginBottom: '2rem',
    fontSize: '1.5rem',
  },
  logoText: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  sidebarNav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  navItem: {
    padding: '0.75rem 1.5rem',
    color: '#cbd5e1',
    cursor: 'pointer',
    transition: 'all 0.3s',
    userSelect: 'none',
  },
  sidebarFooter: {
    padding: '1.5rem',
    borderTop: '1px solid #334155',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  userAvatar: {
    fontSize: '1.5rem',
  },
  userInfo: {
    flex: 1,
  },
  userEmailContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  userEmail: {
    color: '#e2e8f0',
    fontSize: '0.875rem',
    fontWeight: '500',
    wordBreak: 'break-word',
  },
  demoBadgeSmall: {
    background: '#6366f1',
    color: '#f1f5f9',
    padding: '0.2rem 0.5rem',
    borderRadius: '3px',
    fontSize: '0.7rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  logoutBtnSmall: {
    background: 'transparent',
    border: '1px solid #475569',
    color: '#94a3b8',
    borderRadius: '4px',
    padding: '0.25rem 0.75rem',
    fontSize: '0.75rem',
    cursor: 'pointer',
    width: '100%',
  },
  navbar: {
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    padding: '1rem 2rem', 
    background: '#1e293b',
    borderBottom: '1px solid #334155',
    marginLeft: '220px',
  },
  navbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  navTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#f1f5f9',
  },
  navRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
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
  content: { 
    flex: 1,
    maxWidth: '1200px', 
    margin: '0 auto', 
    padding: '2rem',
    width: '100%',
    marginLeft: '220px',
  },
  header: {
    display: 'flex', 
    justifyContent: 'space-between',
    alignItems: 'flex-start', 
    marginBottom: '2rem',
    gap: '2rem',
  },
  title: { 
    fontSize: '2rem', 
    fontWeight: '700', 
    color: '#f1f5f9',
    margin: 0,
  },
  subtitle: { 
    color: '#94a3b8', 
    marginTop: '0.5rem', 
    fontSize: '0.95rem' 
  },
  createBtn: {
    padding: '0.75rem 1.5rem', 
    background: '#38bdf8',
    color: '#0f172a', 
    border: 'none', 
    borderRadius: '8px',
    fontWeight: '600', 
    fontSize: '0.95rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
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
    background: '#1e293b', 
    padding: '1.5rem', 
    borderRadius: '12px',
    border: '1px solid #334155',
    transition: 'all 0.3s',
    cursor: 'pointer',
    '&:hover': {
      borderColor: '#38bdf8',
      boxShadow: '0 0 20px rgba(56, 189, 248, 0.1)',
    },
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
    padding: '0.5rem 1rem', 
    background: '#0f172a',
    border: '1px solid #38bdf8', 
    borderRadius: '6px',
    color: '#38bdf8',
    fontSize: '0.875rem',
  },
  deleteBtn: {
    padding: '0.5rem', 
    background: 'transparent',
    border: '1px solid #334155', 
    borderRadius: '6px', 
    fontSize: '1rem',
  },
  emptyState: { 
    textAlign: 'center', 
    padding: '4rem 0' 
  },
  emptyIcon: { 
    fontSize: '3rem', 
    marginBottom: '1rem' 
  },
  emptyText: { 
    color: '#f1f5f9', 
    fontSize: '1.1rem', 
    fontWeight: '600' 
  },
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
  demoInfoSection: {
    marginBottom: '1.5rem',
    padding: '1rem',
    background: '#334155',
    borderRadius: '8px',
    border: '1px solid #475569',
  },
  demoInfoBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  demoInfoText: {
    color: '#cbd5e1',
    fontSize: '0.875rem',
    margin: 0,
  },
  demoInfoList: {
    color: '#cbd5e1',
    fontSize: '0.875rem',
    margin: '0.5rem 0',
    paddingLeft: '1.25rem',
  },
  demoCallToAction: {
    color: '#38bdf8',
    fontSize: '0.875rem',
    margin: '0.5rem 0 0 0',
  },
  alertInfo: {
    padding: '0.75rem 1rem',
    background: '#475569',
    border: '1px solid #64748b',
    borderRadius: '6px',
    color: '#cbd5e1',
    fontSize: '0.875rem',
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