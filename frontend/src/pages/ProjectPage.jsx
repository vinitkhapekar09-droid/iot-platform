import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProject } from '../api/projects'
import LiveReadings from '../components/LiveReadings'
import SensorChart from '../components/SensorChart'
import ApiKeyManager from '../components/ApiKeyManager'
import ChatPanel from '../components/ChatPanel'

const METRICS = ['temperature', 'humidity', 'pressure']

export default function ProjectPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getProject(id)
      .then((res) => setProject(res.data))
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={styles.loading}>Loading project...</div>
  )

  return (
    <div style={styles.page}>
      <div style={styles.navbar}>
        <button style={styles.back} onClick={() => navigate('/dashboard')}>
          ← Dashboard
        </button>
        <span style={styles.navLogo}>⚡ IoT Platform</span>
      </div>

      <div style={styles.content}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>📡 {project?.name}</h1>
            <p style={styles.subtitle}>
              {project?.description || 'No description'}
            </p>
          </div>
        </div>

        <LiveReadings projectId={id} />

        <h3 style={styles.sectionTitle}>📈 Historical Charts</h3>
        <div style={styles.chartsGrid}>
          {METRICS.map((metric) => (
            <SensorChart key={metric} projectId={id} metricName={metric} />
          ))}
        </div>
        {/* AI Chatbot */}
        <h3 style={styles.sectionTitle}>🤖 AI Assistant</h3>
        <ChatPanel projectId={id} />


        <h3 style={styles.sectionTitle}>🔑 Device Keys</h3>
        <ApiKeyManager projectId={id} />
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#0f172a' },
  loading: { padding: '2rem', color: '#94a3b8' },
  navbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '1rem 2rem', background: '#1e293b',
    borderBottom: '1px solid #334155',
  },
  back: {
    background: 'transparent', border: 'none',
    color: '#38bdf8', fontSize: '0.9rem', cursor: 'pointer',
  },
  navLogo: { fontSize: '1.1rem', fontWeight: '700', color: '#38bdf8' },
  content: { maxWidth: '1100px', margin: '0 auto', padding: '2rem' },
  header: { marginBottom: '2rem' },
  title: { fontSize: '1.75rem', fontWeight: '700', color: '#f1f5f9' },
  subtitle: { color: '#94a3b8', marginTop: '0.25rem' },
  sectionTitle: {
    color: '#f1f5f9', fontSize: '1rem',
    fontWeight: '600', margin: '2rem 0 1rem',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1.25rem',
  },
}