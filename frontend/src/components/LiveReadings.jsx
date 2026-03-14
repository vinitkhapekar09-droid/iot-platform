import { useState, useEffect } from 'react'
import { getLatestReadings } from '../api/projects'

const METRIC_ICONS = {
  temperature: '🌡️',
  humidity: '💧',
  pressure: '🔵',
  default: '📊',
}

const METRIC_COLORS = {
  temperature: '#f97316',
  humidity: '#38bdf8',
  pressure: '#a78bfa',
  default: '#34d399',
}

export default function LiveReadings({ projectId }) {
  const [readings, setReadings] = useState([])
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    fetchLatest()
    const interval = setInterval(fetchLatest, 3000)
    return () => clearInterval(interval)
  }, [projectId])

  const fetchLatest = async () => {
    try {
      const res = await getLatestReadings(projectId)
      setReadings(res.data)
      setLastUpdate(new Date())
    } catch (err) {
      console.error('Failed to fetch latest readings', err)
    }
  }

  // Deduplicate — keep latest per metric+device combo
  const latestMap = {}
  readings.forEach((r) => {
    const key = `${r.device_id}_${r.metric_name}`
    if (!latestMap[key]) latestMap[key] = r
  })
  const latest = Object.values(latestMap)

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>🔴 Live Readings</h3>
        {lastUpdate && (
          <span style={styles.updated}>
            Updated {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>

      {latest.length === 0 ? (
        <div style={styles.empty}>
          <p>No data yet. Start your device simulator!</p>
          <code style={styles.code}>python simulate.py</code>
        </div>
      ) : (
        <div style={styles.grid}>
          {latest.map((r) => {
            const color = METRIC_COLORS[r.metric_name] || METRIC_COLORS.default
            const icon = METRIC_ICONS[r.metric_name] || METRIC_ICONS.default
            return (
              <div key={`${r.device_id}_${r.metric_name}`} style={styles.card}>
                <div style={styles.cardTop}>
                  <span style={styles.icon}>{icon}</span>
                  <span style={{ ...styles.dot, background: color }} />
                </div>
                <div style={{ ...styles.value, color }}>
                  {r.metric_value.toFixed(1)}
                  <span style={styles.unit}> {r.unit}</span>
                </div>
                <div style={styles.metric}>{r.metric_name}</div>
                <div style={styles.device}>📟 {r.device_id}</div>
              </div>
            )
          })}
        </div>
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
    alignItems: 'center', marginBottom: '1.25rem',
  },
  title: { color: '#f1f5f9', fontSize: '1rem', fontWeight: '600' },
  updated: { color: '#475569', fontSize: '0.8rem' },
  empty: { color: '#94a3b8', textAlign: 'center', padding: '2rem' },
  code: {
    display: 'block', marginTop: '0.5rem', background: '#0f172a',
    padding: '0.5rem 1rem', borderRadius: '6px',
    color: '#38bdf8', fontSize: '0.85rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '1rem',
  },
  card: {
    background: '#0f172a', padding: '1.25rem',
    borderRadius: '10px', border: '1px solid #334155',
  },
  cardTop: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: '0.75rem',
  },
  icon: { fontSize: '1.5rem' },
  dot: {
    width: '8px', height: '8px',
    borderRadius: '50%', animation: 'pulse 2s infinite',
  },
  value: { fontSize: '1.75rem', fontWeight: '700', lineHeight: 1 },
  unit: { fontSize: '0.9rem', fontWeight: '400', color: '#94a3b8' },
  metric: {
    color: '#94a3b8', fontSize: '0.8rem',
    textTransform: 'capitalize', marginTop: '0.4rem',
  },
  device: { color: '#475569', fontSize: '0.75rem', marginTop: '0.25rem' },
}