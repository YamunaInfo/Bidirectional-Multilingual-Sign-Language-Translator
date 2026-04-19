import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const signService = {
  // Detection/Translation
  signToText: (data) => api.post('/sign-to-text', data),
  textToSign: (data) => api.post('/text-to-sign', data),
  detectEmotion: (formData) => api.post('/emotion-detect', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadFile: (formData) => api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  translateText: (data) => api.post('/translate', data),
  
  // Auth
  login: (data) => api.post('/login', data),
  signup: (data) => api.post('/signup', data),
  
  // User Data
  getHistory: (userId) => api.get(`/history?user_id=${userId}`),
};

export default api;
