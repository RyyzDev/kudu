import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { HTTP_CONFIG } from './httpConfig';
import { authenticateAcademicSystem, performSilentLogin } from './authService';

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
  const phpSessId =
    (await SecureStore.getItemAsync('akademik_phpSessId')) ||
    (await SecureStore.getItemAsync('phpSessId'));
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
       response.data.includes('login-pf-page') ||
       response.data.includes('Log in to') ||
       response.data.includes('Anda tidak diijinkan mengakses module ini') ||
       response.data.includes('pModule=xtWmoqk=') ||
       response.data.includes('title="Access Denied"') ||
       response.data.includes('Kami mengira Anda telah pergi') ||
       response.data.includes('menutup sesi'));

    if (isSessionExpired && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(newSessId => {
          if (newSessId && newSessId !== 'NATIVE_MANAGED') {
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
        console.log('[INTERCEPTOR] Sesi habis. Menjalankan silent login...');
        let newPhpSessId: string;
        try {
          newPhpSessId = await performSilentLogin(response.data, originalRequest.url);
        } catch (silentErr) {
          console.warn('[INTERCEPTOR] Silent login gagal, mencoba fallback authenticateAcademicSystem...', silentErr);
          const username =
            (await SecureStore.getItemAsync('akademik_nim')) || (await SecureStore.getItemAsync('nim'));
          const password =
            (await SecureStore.getItemAsync('akademik_password')) || (await SecureStore.getItemAsync('password'));
          if (!username || !password) throw silentErr;
          newPhpSessId = await authenticateAcademicSystem(username, password);
        }

        await SecureStore.setItemAsync('akademik_phpSessId', newPhpSessId);
        await SecureStore.setItemAsync('phpSessId', newPhpSessId);
        processQueue(null, newPhpSessId);
        isRefreshing = false;

        if (newPhpSessId !== 'NATIVE_MANAGED') {
          originalRequest.headers['Cookie'] = newPhpSessId;
        } else {
          delete originalRequest.headers['Cookie'];
        }

        return academicApi(originalRequest);
      } catch (err) {
        isRefreshing = false;
        processQueue(err, null);
        return Promise.reject(err);
      }
    }

    return response;
  },
  error => Promise.reject(error)
);
