import client from './client'

export const getProjects = () => client.get('/projects')
export const createProject = (data) => client.post('/projects', data)
export const getProject = (id) => client.get(`/projects/${id}`)
export const deleteProject = (id) => client.delete(`/projects/${id}`)
export const getProjectKeys = (id) => client.get(`/projects/${id}/keys`)
export const createApiKey = (id, data) => client.post(`/projects/${id}/keys`, data)
export const deleteApiKey = (projectId, keyId) =>
  client.delete(`/projects/${projectId}/keys/${keyId}`)

export const getSensorReadings = (projectId, params) =>
  client.get(`/data/${projectId}/readings`, { params })


export const getLatestReadings = (projectId) =>
  client.get(`/data/${projectId}/latest`)

export const askChatbot = (projectId, question) =>
  client.post(`/chat/${projectId}`, { question })

export const getDevices = (projectId) =>
  client.get(`/data/${projectId}/devices`)

export const getMLReadiness = (projectId, params) =>
  client.get(`/data/${projectId}/ml-readiness`, { params })

export const getAnomalies = (projectId, params) =>
  client.get(`/data/${projectId}/anomalies`, { params })


// Alert Rules
export const getAlertRules = (projectId) =>
  client.get(`/alerts/${projectId}/rules`)

export const createAlertRule = (projectId, data) =>
  client.post(`/alerts/${projectId}/rules`, data)

export const deleteAlertRule = (projectId, ruleId) =>
  client.delete(`/alerts/${projectId}/rules/${ruleId}`)

export const toggleAlertRule = (projectId, ruleId) =>
  client.patch(`/alerts/${projectId}/rules/${ruleId}/toggle`)

// Alert History
export const getAlertHistory = (projectId) =>
  client.get(`/alerts/${projectId}/history`)

// Anomaly
export const getAnomalyReadiness = (projectId) =>
  client.get(`/alerts/${projectId}/anomaly/readiness`)

export const trainAnomalyModel = (projectId, deviceId, metricName) =>
  client.post(`/alerts/${projectId}/anomaly/train/${deviceId}/${metricName}`)

export const exportCSV = (projectId, params) => {
  const query = new URLSearchParams()
  if (params.deviceId) query.append('device_id', params.deviceId)
  if (params.metricName) query.append('metric_name', params.metricName)
  if (params.startDate) query.append('start_date', params.startDate)
  if (params.endDate) query.append('end_date', params.endDate)

  return client.get(
    `/data/${projectId}/export/csv?${query.toString()}`,
    { responseType: 'blob' }
  )
}

export const getStats = (projectId, deviceId, metricName, params = {}) => {
  const query = new URLSearchParams()
  if (params.startDate) query.append('start_date', params.startDate)
  if (params.endDate) query.append('end_date', params.endDate)
  return client.get(
    `/data/${projectId}/stats/${deviceId}/${metricName}?${query.toString()}`
  )
}