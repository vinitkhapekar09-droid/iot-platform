import { useState } from 'react'
import { askChatbot } from '../api/projects'

const SUGGESTIONS = [
  "What is the latest temperature?",
  "What was the average humidity today?",
  "Is any reading abnormally high?",
  "What are the min and max values today?",
]

export default function ChatPanel({ projectId }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hi! I can answer questions about your sensor data. Try asking about temperature, humidity, or pressure!",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const sendMessage = async (question) => {
    const q = question || input.trim()
    if (!q) return

    setMessages((prev) => [...prev, { role: 'user', text: q }])
    setInput('')
    setLoading(true)

    try {
      const res = await askChatbot(projectId, q)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: res.data.answer },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: '❌ Sorry, I could not process that. Check your GROQ_API_KEY in .env',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>🤖 AI Assistant</h3>
      <p style={styles.subtitle}>
        Ask questions about your sensor data (powered by Groq)
      </p>

      {/* Suggestion chips */}
      <div style={styles.suggestions}>
        {SUGGESTIONS.map((s) => (
          <button key={s} style={styles.chip} onClick={() => sendMessage(s)}>
            {s}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={styles.messages}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              ...styles.message,
              ...(msg.role === 'user' ? styles.userMsg : styles.botMsg),
            }}
          >
            <span style={styles.msgRole}>
              {msg.role === 'user' ? '👤' : '🤖'}
            </span>
            <span style={styles.msgText}>{msg.text}</span>
          </div>
        ))}
        {loading && (
          <div style={{ ...styles.message, ...styles.botMsg }}>
            <span style={styles.msgRole}>🤖</span>
            <span style={styles.thinking}>Thinking...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={styles.inputRow}>
        <input
          style={styles.input}
          placeholder="Ask about your sensor data..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={loading}
        />
        <button
          style={styles.sendBtn}
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
        >
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    background: '#1e293b', borderRadius: '12px',
    border: '1px solid #334155', padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  title: { color: '#f1f5f9', fontSize: '1rem', fontWeight: '600' },
  subtitle: {
    color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem',
  },
  suggestions: {
    display: 'flex', flexWrap: 'wrap',
    gap: '0.5rem', marginBottom: '1.25rem',
  },
  chip: {
    padding: '0.35rem 0.75rem', background: '#0f172a',
    border: '1px solid #334155', borderRadius: '20px',
    color: '#94a3b8', fontSize: '0.78rem', cursor: 'pointer',
  },
  messages: {
    minHeight: '200px', maxHeight: '350px', overflowY: 'auto',
    marginBottom: '1rem', display: 'flex',
    flexDirection: 'column', gap: '0.75rem',
  },
  message: {
    display: 'flex', gap: '0.75rem',
    alignItems: 'flex-start', padding: '0.75rem', borderRadius: '8px',
  },
  userMsg: { background: '#1e3a5f', flexDirection: 'row-reverse' },
  botMsg: { background: '#0f172a' },
  msgRole: { fontSize: '1.1rem', flexShrink: 0 },
  msgText: { color: '#e2e8f0', fontSize: '0.9rem', lineHeight: '1.5' },
  thinking: { color: '#475569', fontSize: '0.9rem', fontStyle: 'italic' },
  inputRow: { display: 'flex', gap: '0.75rem' },
  input: {
    flex: 1, padding: '0.65rem 0.85rem', background: '#0f172a',
    border: '1px solid #334155', borderRadius: '8px',
    color: '#f1f5f9', fontSize: '0.9rem',
  },
  sendBtn: {
    padding: '0.65rem 1.25rem', background: '#38bdf8',
    border: 'none', borderRadius: '8px',
    color: '#0f172a', fontWeight: '600', fontSize: '0.9rem',
  },
}