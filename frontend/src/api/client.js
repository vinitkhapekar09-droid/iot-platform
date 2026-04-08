import axios from 'axios'

const defaultApiBase =
  window.location.hostname === 'localhost'
    ? 'http://127.0.0.1:8000'
    : window.location.origin

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultApiBase,
  headers: {
    'Content-Type': 'application/json',
  },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default client