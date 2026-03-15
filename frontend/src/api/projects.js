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