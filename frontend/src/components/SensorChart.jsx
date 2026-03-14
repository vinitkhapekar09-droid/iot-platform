import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { useState, useEffect } from 'react'
import { getSensorReadings } from '../api/projects'

const COLORS = {
  temperature: '#f97316',
  humidity: '#38bdf8',
  pressure: '#a78bfa',
  default: '#34d399',
}

export default function SensorChart({ projectId, metricName }) {
  const [data, setData] = useState([])
  const color = COLORS[metricName] || COLORS.default

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [projectId, metricName])

  const fetchData = async () => {
    try {
      const res = await getSensorReadings(projectId, {
        metric_name: metricName,
        limit: 30,
      })
      // Reverse so oldest is on left
      const formatted = res.data.reverse().map((r) => ({
        time: new Date(r.timestamp).toLocaleTimeString(),
        value: parseFloat(r.metric_value.toFixed(2)),
        device: r.device_id,
      }))
      setData(formatted)
    } catch (err) {
      console.error('Chart fetch error', err)
    }
  }

  return (
    <div style={styles.container}>
      <h4 style={styles.title}>
        {metricName.charAt(0).toUpperCase() + metricName.slice(1)}
      </h4>
      {data.length === 0 ? (
        <div style={styles.empty}>No data yet</div>
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

const styles = {
  container: {
    background: '#1e293b', borderRadius: '12px',
    border: '1px solid #334155', padding: '1.25rem',
  },
  title: {
    color: '#f1f5f9', fontSize: '0.95rem',
    fontWeight: '600', marginBottom: '1rem',
    textTransform: 'capitalize',
  },
  empty: {
    color: '#475569', textAlign: 'center',
    padding: '3rem 0', fontSize: '0.875rem',
  },
}