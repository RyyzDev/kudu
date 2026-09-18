import request from 'supertest';
import axios from 'axios';
import app from '../../src/app.js';
import { jest } from '@jest/globals';

describe('Auth Routes API Tests', () => {
    beforeAll(() => {
        process.env.AKADEMIK_ORIGIN_URL = 'https://mock.akademik.uinjkt.ac.id';
        process.env.SSO_ORIGIN_URL = 'https://mock.sso.uinjkt.ac.id';
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('POST /api/auth/login - Empty credentials', async () => {
        const res = await request(app).post('/api/auth/login').send({});
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Username/Password kosong.');
    });

    it('POST /api/auth/login - Invalid credentials', async () => {
        // Mock get metadata
        jest.spyOn(axios, 'get').mockResolvedValue({
            headers: { 'set-cookie': [] },
            data: '<html><body><form id="kc-form-login" action="mock-action-url"></form></body></html>'
        });

        // Mock post credentials to fail (no location header/status 302)
        jest.spyOn(axios, 'post').mockResolvedValue({
            status: 200, headers: {}, data: 'Login Gagal'
        });

        const res = await request(app).post('/api/auth/login').send({ username: 'test', password: '123' });
        
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Login Gagal. Username/Password salah.');
    });

    it('POST /api/auth/login - Success (Quarantine Pipeline)', async () => {
        // Mock GET for metadata and quarantine redirects
        jest.spyOn(axios, 'get')
            .mockResolvedValueOnce({
                // Return metadata
                headers: { 'set-cookie': ['initial=1'] },
                data: '<html><body><form id="kc-form-login" action="mock-action-url"></form></body></html>'
            })
            .mockResolvedValueOnce({
                // First redirect returning new location
                status: 302,
                headers: { location: '/redirect2', 'set-cookie': ['PHPSESSID=temp'] },
                data: ''
            })
            .mockResolvedValueOnce({
                // Final success landing
                status: 200,
                headers: { 'set-cookie': ['PHPSESSID=final-token'] },
                data: 'Dashboard'
            });

        // Mock POST for login success (returns 302 with redirect location)
        jest.spyOn(axios, 'post').mockResolvedValue({
            status: 302,
            headers: { location: 'mock-redirect-1', 'set-cookie': ['KEYCLOAK_SESSION=123'] },
            data: ''
        });

        const res = await request(app).post('/api/auth/login').send({ username: 'test', password: '123' });
        
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.sessionCookies).toBe('PHPSESSID=final-token');
    });
});
