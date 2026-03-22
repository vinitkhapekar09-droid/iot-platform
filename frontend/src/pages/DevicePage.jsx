import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAnomalies, getSensorReadings } from '../api/projects'
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const COLORS = {
  temperature: '#f97316',
  humidity: '#38bdf8',
  pressure: '#a78bfa',
  light: '#fbbf24',
  co2: '#34d399',
  default: '#34d399',
}

function DeviceChart({ projectId, deviceId, metricName }) {
  const [data, setData] = useState([])
  const color = COLORS[metricName] || COLORS.default

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [projectId, deviceId, metricName])

  const fetchData = async () => {
    try {
      const res = await getSensorReadings(projectId, {
        metric_name: metricName,
        device_id: deviceId,
        limit: 30,
      })
      const formatted = res.data.reverse().map((r) => ({
        time: new Date(r.timestamp).toLocaleTimeString(),
        value: parseFloat(r.metric_value.toFixed(2)),
      }))
      setData(formatted)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div style={styles.chartCard}>
      <h4 style={styles.chartTitle}>{metricName}</h4>
      {data.length === 0 ? (
        <div style={styles.chartEmpty}>No data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#475569', fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fill: '#475569', fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f1f5f9',
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export default function DevicePage() {
  const { id: projectId, deviceId } = useParams()
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState([])
  const [latestAnomalyByMetric, setLatestAnomalyByMetric] = useState({})
  const [recentAnomalies, setRecentAnomalies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchAnomalies, 10000)
    return () => clearInterval(interval)
  }, [projectId, deviceId])

  const fetchMetrics = async () => {
    try {
      const res = await getSensorReadings(projectId, {
        device_id: deviceId,
        limit: 50,
      })
      const uniqueMetrics = [...new Set(res.data.map((r) => r.metric_name))]
      setMetrics(uniqueMetrics)
      await fetchAnomalies()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAnomalies = async () => {
    try {
      const res = await getAnomalies(projectId, {
        device_id: deviceId,
        only_flagged: true,
        limit: 100,
      })
      const byMetric = {}
      res.data.forEach((event) => {
        const existing = byMetric[event.metric_name]
        if (!existing || new Date(event.created_at) > new Date(existing.created_at)) {
          byMetric[event.metric_name] = event
        }
      })
      setLatestAnomalyByMetric(byMetric)
      setRecentAnomalies(res.data.slice(0, 8))
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return (
    <div style={styles.loading}>Loading device...</div>
  )

  return (
    <div style={styles.page}>
      <div style={styles.navbar}>
        <button
          style={styles.back}
          onClick={() => navigate(`/projects/${projectId}`)}
        >
          ← Back to Project
        </button>
        <span style={styles.navLogo}>⚡ IoT Platform</span>
      </div>

      <div style={styles.content}>
        <div style={styles.header}>
          <span style={styles.deviceIcon}>📟</span>
          <div>
            <h1 style={styles.title}>{deviceId}</h1>
            <p style={styles.subtitle}>Device sensor history</p>
          </div>
        </div>

        {metrics.length === 0 ? (
          <p style={styles.empty}>No data found for this device.</p>
        ) : (
          <>
            <h3 style={styles.sectionTitle}>📈 Sensor Charts</h3>
            <div style={styles.chartsGrid}>
              {metrics.map((metric) => (
                <div key={metric}>
                  {latestAnomalyByMetric[metric] && (
                    <div style={styles.metricAlert}>
                      AI anomaly detected: score{' '}
                      {latestAnomalyByMetric[metric].anomaly_score.toFixed(3)}
                    </div>
                  )}
                  <DeviceChart
                    projectId={projectId}
                    deviceId={deviceId}
                    metricName={metric}
                  />
                </div>
              ))}
            </div>

            <h3 style={styles.sectionTitle}>AI Insights (Recent Anomalies)</h3>
            <div style={styles.anomalyList}>
              {recentAnomalies.length === 0 ? (
                <p style={styles.empty}>No anomalies detected recently.</p>
              ) : (
                recentAnomalies.map((event) => (
                  <div key={event.id} style={styles.anomalyItem}>
                    <span style={styles.anomalyMetric}>{event.metric_name}</span>
                    <span style={styles.anomalyReason}>{event.reason}</span>
                    <span style={styles.anomalyScore}>
                      score {event.anomaly_score.toFixed(3)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#0f172a' },
  loading: { padding: '2rem', color: '#94a3b8' },
  navbar: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', padding: '1rem 2rem',
    background: '#1e293b', borderBottom: '1px solid #334155',
  },
  back: {
    background: 'transparent', border: 'none',
    color: '#38bdf8', fontSize: '0.9rem', cursor: 'pointer',
  },
  navLogo: { fontSize: '1.1rem', fontWeight: '700', color: '#38bdf8' },
  content: { maxWidth: '1100px', margin: '0 auto', padding: '2rem' },
  header: {
    display: 'flex', alignItems: 'center',
    gap: '1rem', marginBottom: '2rem',
  },
  deviceIcon: { fontSize: '2.5rem' },
  title: { fontSize: '1.75rem', fontWeight: '700', color: '#f1f5f9' },
  subtitle: { color: '#94a3b8', marginTop: '0.25rem' },
  sectionTitle: {
    color: '#f1f5f9', fontSize: '1rem',
    fontWeight: '600', margin: '0 0 1rem',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1.25rem',
  },
  chartCard: {
    background: '#1e293b', borderRadius: '12px',
    border: '1px solid #334155', padding: '1.25rem',
  },
  chartTitle: {
    color: '#f1f5f9', fontSize: '0.95rem',
    fontWeight: '600', marginBottom: '1rem',
    textTransform: 'capitalize',
  },
  chartEmpty: {
    color: '#475569', textAlign: 'center',
    padding: '3rem 0', fontSize: '0.875rem',
  },
  metricAlert: {
    marginBottom: '0.5rem',
    padding: '0.45rem 0.7rem',
    borderRadius: '8px',
    background: '#3f1d2e',
    color: '#fecdd3',
    fontSize: '0.78rem',
    fontWeight: 600,
  },
  anomalyList: {
    marginTop: '0.25rem',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '1rem',
  },
  anomalyItem: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr auto',
    gap: '0.75rem',
    padding: '0.55rem 0',
    borderBottom: '1px solid #334155',
    color: '#cbd5e1',
    fontSize: '0.85rem',
  },
  anomalyMetric: { color: '#fda4af', textTransform: 'capitalize', fontWeight: 600 },
  anomalyReason: { color: '#cbd5e1' },
  anomalyScore: { color: '#fecdd3', fontWeight: 700 },
  empty: { color: '#94a3b8', textAlign: 'center', padding: '2rem' },
}