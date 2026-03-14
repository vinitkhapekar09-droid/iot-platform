import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getProjects, createProject, deleteProject } from '../api/projects'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  return (
    <div style={styles.page}>
      {/* Navbar */}
      <div style={styles.navbar}>
        <span style={styles.navLogo}>⚡ IoT Platform</span>
        <div style={styles.navRight}>
          <span style={styles.navUser}>👤 {user?.email}</span>
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
    padding: '0.5rem 1rem', background: 'transparent',
    border: '1px solid #475569', borderRadius: '6px', color: '#94a3b8',
  },
  submitBtn: {
    padding: '0.5rem 1.25rem', background: '#38bdf8',
    border: 'none', borderRadius: '6px',
    color: '#0f172a', fontWeight: '600',
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
  emptySubtext: { color: '#94a3b8', marginTop: '0.5rem', fontSize: '0.9rem' },
  empty: { color: '#94a3b8', textAlign: 'center', padding: '2rem' },
}