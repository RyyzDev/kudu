import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ELETTER_URL, DEFAULT_HEADERS, loginELetter, getEletterCookies } from './eletterAuthService';
import { Platform } from 'react-native';

export const eletterApi = axios.create({
  baseURL: ELETTER_URL,
  headers: { ...DEFAULT_HEADERS },
  // withCredentials: false — cookies dikelola manual lewat request interceptor,
  // bukan via native cookie jar (tidak reliable di React Native untuk axios + fetch).
  withCredentials: false,
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

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST INTERCEPTOR: Sisipkan laravel_session + X-XSRF-TOKEN ke setiap request
// Ini padanan dari request interceptor academicApi yang inject PHPSESSID.
// ─────────────────────────────────────────────────────────────────────────────
eletterApi.interceptors.request.use(config => {
  const cookies = getEletterCookies();

  if (cookies) {
    config.headers['Cookie'] = cookies;

    // Laravel AJAX/JSON requests membutuhkan X-XSRF-TOKEN header (decoded)
    const xsrfMatch = cookies.match(/XSRF-TOKEN=([^;]+)/);
    if (xsrfMatch) {
      config.headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrfMatch[1]);
    }
  }

  return config;
});

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE INTERCEPTOR: Deteksi sesi habis → silent login → retry
// ─────────────────────────────────────────────────────────────────────────────
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

        console.log('[ELETTER-INTERCEPTOR] Sesi habis. Melakukan silent login...');
        await loginELetter(username, password);
        // loginELetter memperbarui _eletterCookies di eletterAuthService secara internal.
        // Request interceptor akan otomatis inject cookies baru saat retry.

        processQueue(null);
        isRefreshing = false; // Reset di sini, BUKAN di finally (lihat academicApi.ts)

        return eletterApi(originalRequest);
      } catch (err) {
        isRefreshing = false;
        processQueue(err);
        return Promise.reject(err);
      }
    }

    return response;
  },
  error => Promise.reject(error)
);
