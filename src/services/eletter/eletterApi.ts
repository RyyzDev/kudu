import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ELETTER_URL, DEFAULT_HEADERS, loginELetter } from './eletterAuthService';
import { Platform } from 'react-native';

export const eletterApi = axios.create({
  baseURL: ELETTER_URL,
  headers: { ...DEFAULT_HEADERS },
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];

const processQueue = (error: any) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(null);
  });
  failedQueue = [];
};

// Response Interceptor: deteksi sesi mati, lakukan silent login
eletterApi.interceptors.response.use(
  async response => {
    const originalRequest = response.config as any;

    // Deteksi jika HTML merender form login (menandakan sesi habis)
    const isSessionExpired =
      typeof response.data === 'string' &&
      response.data.includes('id="loginform"');

    if (isSessionExpired && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => eletterApi(originalRequest))
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        let username = null;
        let password = null;
        
        if (Platform.OS !== 'web') {
          username = await SecureStore.getItemAsync('nim');
          password = await SecureStore.getItemAsync('password');
        }

        if (!username || !password) throw new Error('Kredensial kosong. Silakan login ulang.');

        console.log('[ELETTER-INTERCEPTOR] Sesi habis. Melakukan silent login E-Letter...');
        await loginELetter(username, password);
        
        processQueue(null);
        return eletterApi(originalRequest);
      } catch (err) {
        processQueue(err);
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return response;
  },
  error => Promise.reject(error)
);
