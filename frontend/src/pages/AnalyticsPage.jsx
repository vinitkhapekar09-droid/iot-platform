import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
  ReferenceLine,
} from 'recharts'
import {
  getSensorReadings,
  getStats,
  exportCSV,
} from '../api/projects'

const COLORS = {
  temperature: '#f97316',
  humidity: '#38bdf8',
  pressure: '#a78bfa',
  light: '#fbbf24',
  co2: '#34d399',
  default: '#34d399',
}

const formatLocalDateTime = (date) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function StatCard({ label, value, unit, color }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statValue, color }}>
        {value}
        <span style={styles.statUnit}> {unit}</span>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const { id: projectId, deviceId, metric } = useParams()
  const navigate = useNavigate()

  const [readings, setReadings] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  // Date range state
  const now = new Date()
  const yesterday = new Date(now - 24 * 60 * 60 * 1000)

  const [startDate, setStartDate] = useState(
    formatLocalDateTime(yesterday)
  )
  const [endDate, setEndDate] = useState(
    formatLocalDateTime(now)
  )
  const [preset, setPreset] = useState('24h')

  const color = COLORS[metric] || COLORS.default

  useEffect(() => {
    fetchData()
  }, [projectId, deviceId, metric, startDate, endDate])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [readingsRes, statsRes] = await Promise.all([
        getSensorReadings(projectId, {
          device_id: deviceId,
          metric_name: metric,
          start_date: new Date(startDate).toISOString(),
          end_date: new Date(endDate).toISOString(),
          limit: 500,
        }),
        getStats(projectId, deviceId, metric, {
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
        }),
      ])

      const formatted = readingsRes.data.reverse().map((r) => ({
        time: new Date(r.timestamp).toLocaleString(),
        value: parseFloat(r.metric_value.toFixed(2)),
        timestamp: r.timestamp,
      }))

      setReadings(formatted)
      setStats(statsRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const applyPreset = (p) => {
    setPreset(p)
    const now = new Date()
    let start
    switch (p) {
      case '1h':  start = new Date(now - 1 * 60 * 60 * 1000); break
      case '6h':  start = new Date(now - 6 * 60 * 60 * 1000); break
      case '24h': start = new Date(now - 24 * 60 * 60 * 1000); break
      case '7d':  start = new Date(now - 7 * 24 * 60 * 60 * 1000); break
      case '30d': start = new Date(now - 30 * 24 * 60 * 60 * 1000); break
      default: start = new Date(now - 24 * 60 * 60 * 1000)
    }
    setStartDate(formatLocalDateTime(start))
    setEndDate(formatLocalDateTime(now))
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await exportCSV(projectId, {
        deviceId,
        metricName: metric,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      })

      // Trigger download
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute(
        'download',
        `${deviceId}_${metric}_${preset}.csv`
      )
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed', err)
    } finally {
      setExporting(false)
    }
  }

  // Build distribution data
  const buildDistribution = () => {
    if (!readings.length || !stats) return []
    const { min, max } = stats
    const bucketCount = 10
    const bucketSize = (max - min) / bucketCount || 1
    const buckets = Array.from({ length: bucketCount }, (_, i) => ({
      range: `${(min + i * bucketSize).toFixed(1)}`,
      count: 0,
    }))
    readings.forEach(({ value }) => {
      const idx = Math.min(
        Math.floor((value - min) / bucketSize),
        bucketCount - 1
      )
      if (idx >= 0) buckets[idx].count++
    })
    return buckets
  }

  const distribution = buildDistribution()

  return (
    <div style={styles.page}>
      {/* Navbar */}
      <div style={styles.navbar}>
        <button
          style={styles.back}
          onClick={() => navigate(`/projects/${projectId}/devices/${deviceId}`)}
        >
          ← Back to Device
        </button>
        <span style={styles.navLogo}>⚡ IoT Platform</span>
      </div>

      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>
              📊 {deviceId}
              <span style={{ color, marginLeft: '0.5rem' }}>
                — {metric}
              </span>
            </h1>
            <p style={styles.subtitle}>
              {readings.length} readings in selected range
            </p>
          </div>
          <button
            style={styles.exportBtn}
            onClick={handleExport}
            disabled={exporting || readings.length === 0}
          >
            {exporting ? '⏳ Exporting...' : '⬇️ Export CSV'}
          </button>
        </div>

        {/* Date Range Controls */}
        <div style={styles.controls}>
          {/* Preset buttons */}
          <div style={styles.presets}>
            {['1h', '6h', '24h', '7d', '30d'].map((p) => (
              <button
                key={p}
                style={{
                  ...styles.presetBtn,
                  ...(preset === p ? styles.presetActive : {}),
                }}
                onClick={() => applyPreset(p)}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          <div style={styles.dateRange}>
            <div style={styles.dateField}>
              <label style={styles.dateLabel}>From</label>
              <input
                type="datetime-local"
                style={styles.dateInput}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setPreset('custom')
                }}
              />
            </div>
            <div style={styles.dateField}>
              <label style={styles.dateLabel}>To</label>
              <input
                type="datetime-local"
                style={styles.dateInput}
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setPreset('custom')
                }}
              />
            </div>
            <button
              style={styles.applyBtn}
              onClick={fetchData}
            >
              Apply
            </button>
          </div>
        </div>

        {loading ? (
          <div style={styles.loading}>Loading data...</div>
        ) : readings.length === 0 ? (
          <div style={styles.empty}>
            No data found for selected time range
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            {stats && (
              <div style={styles.statsGrid}>
                <StatCard
                  label="Average"
                  value={stats.avg}
                  unit={metric === 'temperature' ? '°C' : ''}
                  color={color}
                />
                <StatCard
                  label="Minimum"
                  value={stats.min}
                  unit=""
                  color="#38bdf8"
                />
                <StatCard
                  label="Maximum"
                  value={stats.max}
                  unit=""
                  color="#f97316"
                />
                <StatCard
                  label="Std Dev"
                  value={stats.stddev}
                  unit=""
                  color="#a78bfa"
                />
                <StatCard
                  label="Readings"
                  value={stats.count}
                  unit=""
                  color="#4ade80"
                />
              </div>
            )}

            {/* Time Series Chart */}
            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>
                📈 Time Series
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={readings}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                  />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: '#475569', fontSize: 10 }}
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
                  {stats && (
                    <ReferenceLine
                      y={stats.avg}
                      stroke="#475569"
                      strokeDasharray="5 5"
                      label={{
                        value: `Avg: ${stats.avg}`,
                        fill: '#475569',
                        fontSize: 11,
                      }}
                    />
                  )}
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
            </div>

            {/* Distribution Chart */}
            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>
                📊 Value Distribution
              </h3>
              <p style={styles.chartSubtitle}>
                How often each value range occurred
              </p>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={distribution}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                  />
                  <XAxis
                    dataKey="range"
                    tick={{ fill: '#475569', fontSize: 10 }}
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
                  <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Summary Insights */}
            {stats && (
              <div style={styles.insightsCard}>
                <h3 style={styles.chartTitle}>
                  💡 Quick Insights
                </h3>
                <div style={styles.insightsList}>
                  <div style={styles.insightItem}>
                    <span style={styles.insightDot}>●</span>
                    <span style={styles.insightText}>
                      Average {metric} was{' '}
                      <strong style={{ color }}>
                        {stats.avg}
                      </strong>{' '}
                      over this period
                    </span>
                  </div>
                  <div style={styles.insightItem}>
                    <span style={styles.insightDot}>●</span>
                    <span style={styles.insightText}>
                      Range: {stats.min} to {stats.max}{' '}
                      (spread of {(stats.max - stats.min).toFixed(2)})
                    </span>
                  </div>
                  <div style={styles.insightItem}>
                    <span style={styles.insightDot}>●</span>
                    <span style={styles.insightText}>
                      Standard deviation of {stats.stddev} —{' '}
                      {stats.stddev < 2
                        ? 'very stable readings'
                        : stats.stddev < 5
                        ? 'moderate variation'
                        : 'high variation detected'}
                    </span>
                  </div>
                  <div style={styles.insightItem}>
                    <span style={styles.insightDot}>●</span>
                    <span style={styles.insightText}>
                      {stats.count} readings collected in this period
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#0f172a' },
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
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '1.5rem',
  },
  title: { fontSize: '1.5rem', fontWeight: '700', color: '#f1f5f9' },
  subtitle: { color: '#94a3b8', marginTop: '0.25rem', fontSize: '0.875rem' },
  exportBtn: {
    padding: '0.65rem 1.25rem', background: '#4ade80',
    border: 'none', borderRadius: '8px',
    color: '#0f172a', fontWeight: '600', cursor: 'pointer',
  },
  controls: {
    background: '#1e293b', borderRadius: '12px',
    border: '1px solid #334155', padding: '1.25rem',
    marginBottom: '1.5rem',
    display: 'flex', flexWrap: 'wrap',
    gap: '1rem', alignItems: 'flex-end',
  },
  presets: { display: 'flex', gap: '0.5rem' },
  presetBtn: {
    padding: '0.4rem 0.85rem', background: '#0f172a',
    border: '1px solid #334155', borderRadius: '6px',
    color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem',
  },
  presetActive: {
    background: '#1e3a5f', borderColor: '#38bdf8', color: '#38bdf8',
  },
  dateRange: { display: 'flex', gap: '0.75rem', alignItems: 'flex-end' },
  dateField: {},
  dateLabel: {
    display: 'block', color: '#94a3b8',
    fontSize: '0.75rem', marginBottom: '0.3rem',
  },
  dateInput: {
    padding: '0.5rem 0.75rem', background: '#0f172a',
    border: '1px solid #334155', borderRadius: '6px',
    color: '#f1f5f9', fontSize: '0.85rem',
  },
  applyBtn: {
    padding: '0.5rem 1rem', background: '#38bdf8',
    border: 'none', borderRadius: '6px',
    color: '#0f172a', fontWeight: '600', cursor: 'pointer',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '1rem', marginBottom: '1.5rem',
  },
  statCard: {
    background: '#1e293b', borderRadius: '10px',
    border: '1px solid #334155', padding: '1.25rem',
    textAlign: 'center',
  },
  statLabel: {
    color: '#94a3b8', fontSize: '0.8rem',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    marginBottom: '0.5rem',
  },
  statValue: { fontSize: '1.75rem', fontWeight: '700' },
  statUnit: { fontSize: '0.9rem', fontWeight: '400', color: '#94a3b8' },
  chartCard: {
    background: '#1e293b', borderRadius: '12px',
    border: '1px solid #334155', padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  chartTitle: {
    color: '#f1f5f9', fontSize: '1rem',
    fontWeight: '600', marginBottom: '0.25rem',
  },
  chartSubtitle: {
    color: '#94a3b8', fontSize: '0.8rem', marginBottom: '1rem',
  },
  insightsCard: {
    background: '#1e293b', borderRadius: '12px',
    border: '1px solid #334155', padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  insightsList: { marginTop: '1rem' },
  insightItem: {
    display: 'flex', gap: '0.75rem',
    alignItems: 'flex-start', padding: '0.5rem 0',
    borderBottom: '1px solid #0f172a',
  },
  insightDot: { color: '#38bdf8', fontSize: '0.6rem', marginTop: '5px' },
  insightText: { color: '#94a3b8', fontSize: '0.875rem', lineHeight: '1.5' },
  loading: { color: '#94a3b8', textAlign: 'center', padding: '3rem' },
  empty: { color: '#94a3b8', textAlign: 'center', padding: '3rem' },
}
