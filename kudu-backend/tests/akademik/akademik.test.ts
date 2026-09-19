import request from 'supertest';
import axios from 'axios';
import app from '../../src/app.js';
import { jest } from '@jest/globals';

describe('Akademik Routes API Tests', () => {
    beforeAll(() => {
        process.env.AKADEMIK_ORIGIN_URL = 'https://mock.akademik.uinjkt.ac.id';
        process.env.SSO_ORIGIN_URL = 'https://mock.sso.uinjkt.ac.id';
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('GET /api/akademik/krs - No PHPSESSID header', async () => {
        const res = await request(app).get('/api/akademik/krs');
        
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Header PHPSESSID kosong.');
    });

    it('GET /api/akademik/krs - SESSION_EXPIRED', async () => {
        jest.spyOn(axios, 'get').mockResolvedValue({
            data: '<html><body><form id="kc-form-login"></form></body></html>'
        });

        const res = await request(app).get('/api/akademik/krs').set('phpsessid', 'dummy-session');
        
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Sesi Mati.');
        expect(res.body.code).toBe('SESSION_EXPIRED');
    });

    it('GET /api/akademik/krs - ACCESS_DENIED', async () => {
        jest.spyOn(axios, 'get')
            .mockResolvedValueOnce({ data: '<html><body><a href="krs.php">Kartu Rencana Studi</a></body></html>' })
            .mockResolvedValueOnce({ data: '<html><body>Anda tidak diijinkan mengakses halaman ini.</body></html>' });

        const res = await request(app).get('/api/akademik/krs').set('phpsessid', 'dummy-session');
        
        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Access Denied dari server kampus.');
    });

    it('GET /api/akademik/krs - SUCCESS', async () => {
        jest.spyOn(axios, 'get')
            .mockResolvedValueOnce({ data: '<html><body><a href="krs.php">Kartu Rencana Studi</a></body></html>' })
            .mockResolvedValueOnce({ 
                data: `
                <table>
                    <tr><th>Nama</th><td>John Doe</td></tr>
                    <tr><th>NIM</th><td>123456</td></tr>
                </table>
                <table>
                    <tr>
                        <td>1</td>
                        <td>TIF101</td>
                        <td>A</td>
                        <td>Pemrograman</td>
                        <td>Senin<br/>Ruang 1</td>
                        <td>3</td>
                    </tr>
                    <tr>
                        <td colspan="5">Total SKS diambil</td>
                        <td>3</td>
                    </tr>
                </table>
                ` 
            });

        const res = await request(app).get('/api/akademik/krs').set('phpsessid', 'valid-session');
        
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.studentProfile.nama).toBe('John Doe');
        expect(res.body.data.studentProfile.nim).toBe('123456');
        expect(res.body.data.krsList.length).toBe(1);
        expect(res.body.data.krsList[0].matakuliah).toBe('Pemrograman');
        expect(res.body.data.totalSks).toBe(3);
    });

    it('GET /api/akademik/presensi - No PHPSESSID header', async () => {
        const res = await request(app).get('/api/akademik/presensi');
        
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Header PHPSESSID kosong.');
    });
});
