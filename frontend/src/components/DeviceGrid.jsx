import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDevices } from '../api/projects'

const METRIC_ICONS = {
  temperature: '🌡️',
  humidity: '💧',
  pressure: '🔵',
  light: '💡',
  co2: '💨',
  motion: '🚶',
  default: '📊',
}

function timeAgo(isoString) {
  const diff = Math.floor(
    (new Date() - new Date(isoString + 'Z')) / 1000
  )
  if (diff < 5)  return 'just now'
  if (diff < 60) return `${diff} seconds ago`
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function isOnline(isoString) {
  const diff = Math.floor(
    (new Date() - new Date(isoString + 'Z')) / 1000
  )
  return diff <= 30
}

export default function DeviceGrid({ projectId }) {
  const [devices, setDevices] = useState([])
  const [tick, setTick]       = useState(0)
  const navigate              = useNavigate()

  useEffect(() => {
    fetchDevices()
    const dataInterval = setInterval(fetchDevices, 5000)
    // tick every second to update "X seconds ago" live
    const tickInterval = setInterval(() => setTick(t => t + 1), 1000)
    return () => {
      clearInterval(dataInterval)
      clearInterval(tickInterval)
    }
  }, [projectId])

  const fetchDevices = async () => {
    try {
      const res = await getDevices(projectId)
      setDevices(res.data)
    } catch (err) {
      console.error('Failed to fetch devices', err)
    }
  }

  if (devices.length === 0) {
    return (
      <div style={styles.empty}>
        <p style={styles.emptyIcon}>📡</p>
        <p style={styles.emptyText}>No devices connected yet</p>
        <p style={styles.emptyHint}>
          Start your device simulator or flash your M5Stamp
        </p>
      </div>
    )
  }

  return (
    <div style={styles.grid}>
      {devices.map((device) => {
        const online = isOnline(device.last_seen)
        return (
          <div
            key={device.device_id}
            style={{
              ...styles.card,
              ...(online ? styles.cardOnline : styles.cardOffline),
            }}
            onClick={() =>
              navigate(`/projects/${projectId}/devices/${device.device_id}`)
            }
          >
            {/* Header */}
            <div style={styles.cardHeader}>
              <div style={styles.deviceName}>
                <span style={styles.deviceIcon}>📟</span>
                <span style={online ? styles.nameOnline : styles.nameOffline}>
                  {device.device_id}
                </span>
              </div>
              <span style={{
                ...styles.badge,
                ...(online ? styles.badgeOnline : styles.badgeOffline),
              }}>
                {online ? '🟢 ONLINE' : '⚫ OFFLINE'}
              </span>
            </div>

            {/* Metrics */}
            <div style={styles.metrics}>
              {device.metrics.map((m) => (
                <div key={m.metric_name} style={styles.metricRow}>
                  <span style={styles.metricIcon}>
                    {METRIC_ICONS[m.metric_name] || METRIC_ICONS.default}
                  </span>
                  <span style={online ? styles.metricName : styles.metricNameOffline}>
                    {m.metric_name}
                  </span>
                  <span style={online ? styles.metricValue : styles.metricValueOffline}>
                    {m.metric_value.toFixed(1)}
                    <span style={styles.unit}> {m.unit}</span>
                  </span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={styles.cardFooter}>
              <span style={online ? styles.timeOnline : styles.timeOffline}>
                🕐 {timeAgo(device.last_seen)}
              </span>
              <span style={styles.viewBtn}>
                View Charts →
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.25rem',
  },
  empty: {
    textAlign: 'center',
    padding: '3rem 0',
    background: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  emptyIcon: { fontSize: '3rem', marginBottom: '0.5rem' },
  emptyText: {
    color: '#f1f5f9', fontSize: '1rem',
    fontWeight: '600', marginBottom: '0.25rem',
  },
  emptyHint: { color: '#475569', fontSize: '0.85rem' },
  card: {
    borderRadius: '12px', padding: '1.25rem',
    cursor: 'pointer', transition: 'transform 0.15s',
    border: '1px solid',
  },
  cardOnline: {
    background: '#1e293b',
    borderColor: '#38bdf8',
    boxShadow: '0 0 12px rgba(56,189,248,0.15)',
  },
  cardOffline: {
    background: '#141e2e',
    borderColor: '#334155',
    opacity: 0.7,
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '1rem',
  },
  deviceName: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  deviceIcon: { fontSize: '1.25rem' },
  nameOnline: {
    color: '#f1f5f9', fontWeight: '600',
    fontSize: '0.95rem', wordBreak: 'break-all',
  },
  nameOffline: {
    color: '#475569', fontWeight: '600',
    fontSize: '0.95rem', wordBreak: 'break-all',
  },
  badge: {
    padding: '0.2rem 0.6rem', borderRadius: '20px',
    fontSize: '0.7rem', fontWeight: '700',
    whiteSpace: 'nowrap',
  },
  badgeOnline: { background: '#052e16', color: '#4ade80' },
  badgeOffline: { background: '#1c1917', color: '#57534e' },
  metrics: { marginBottom: '1rem' },
  metricRow: {
    display: 'flex', alignItems: 'center',
    gap: '0.5rem', padding: '0.35rem 0',
    borderBottom: '1px solid #1e293b',
  },
  metricIcon: { fontSize: '1rem', width: '1.5rem' },
  metricName: {
    color: '#94a3b8', fontSize: '0.82rem',
    textTransform: 'capitalize', flex: 1,
  },
  metricNameOffline: {
    color: '#475569', fontSize: '0.82rem',
    textTransform: 'capitalize', flex: 1,
  },
  metricValue: { color: '#38bdf8', fontWeight: '700', fontSize: '0.95rem' },
  metricValueOffline: { color: '#475569', fontWeight: '700', fontSize: '0.95rem' },
  unit: { fontSize: '0.75rem', fontWeight: '400', color: '#64748b' },
  cardFooter: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginTop: '0.75rem',
  },
  timeOnline: { color: '#4ade80', fontSize: '0.78rem' },
  timeOffline: { color: '#475569', fontSize: '0.78rem' },
  viewBtn: { color: '#38bdf8', fontSize: '0.78rem' },
}