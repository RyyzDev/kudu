import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { HTTP_CONFIG } from './httpConfig';
import { authenticateAcademicSystem } from './authService';

// Instance axios khusus untuk Portal Akademik
export const academicApi = axios.create({
  baseURL: HTTP_CONFIG.AKADEMIK_ORIGIN_URL,
  headers: { ...HTTP_CONFIG.DEFAULT_HEADERS },
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];

const processQueue = (error: any, phpSessId: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(phpSessId);
  });
  failedQueue = [];
};

// Request Interceptor: sisipkan PHPSESSID ke setiap request
academicApi.interceptors.request.use(async config => {
  const phpSessId = await SecureStore.getItemAsync('phpSessId');
  if (phpSessId && phpSessId !== 'NATIVE_MANAGED') {
    config.headers['Cookie'] = phpSessId;
  }
  return config;
});

// Response Interceptor: deteksi sesi mati, lakukan silent login
academicApi.interceptors.response.use(
  async response => {
    const originalRequest = response.config as any;

    const isSessionExpired =
      typeof response.data === 'string' &&
      (response.data.includes('kc-form-login') || 
       response.data.includes('Log in to') ||
       response.data.includes('Anda tidak diijinkan mengakses module ini'));

    if (isSessionExpired && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(newSessId => {
          if (newSessId !== 'NATIVE_MANAGED') {
            originalRequest.headers['Cookie'] = newSessId;
          } else {
            delete originalRequest.headers['Cookie'];
          }
          return academicApi(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const username = await SecureStore.getItemAsync('nim');
        const password = await SecureStore.getItemAsync('password');

        if (!username || !password) throw new Error('Kredensial kosong. Silakan login ulang.');

        console.log('[INTERCEPTOR] Sesi habis. Melakukan silent quarantine login...');
        const newPhpSessId = await authenticateAcademicSystem(username, password);
        await SecureStore.setItemAsync('phpSessId', newPhpSessId);

        processQueue(null, newPhpSessId);
        
        if (newPhpSessId !== 'NATIVE_MANAGED') {
          originalRequest.headers['Cookie'] = newPhpSessId;
        } else {
          delete originalRequest.headers['Cookie'];
        }
        
        return academicApi(originalRequest);
      } catch (err) {
        processQueue(err, null);
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return response;
  },
  error => Promise.reject(error)
);
