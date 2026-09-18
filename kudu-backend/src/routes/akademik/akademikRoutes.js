import { Router } from 'express';
import getDataKRS from '../../services/akademik/krsService.js';

const router = Router();

router.get('/krs', async (req, res) => {
  const phpSessId = req.headers['phpsessid'] || req.headers['authorization-cookie'];
  const userAgent = req.headers['user-agent'];

  if (!phpSessId) return res.status(401).json({ success: false, message: 'Header PHPSESSID kosong.' });

  try {
    const dataKRS = await getDataKRS(phpSessId, userAgent);
    return res.json({ success: true, message: 'Data KRS Berhasil Diambil', data: dataKRS });
  } catch (error) {
    console.error('[Error KRS]:', error.message);
    if (error.message === 'SESSION_EXPIRED') return res.status(401).json({ success: false, message: 'Sesi Mati.', code: 'SESSION_EXPIRED' });
    if (error.message === 'ACCESS_DENIED') return res.status(403).json({ success: false, message: 'Access Denied dari server kampus.' });
    return res.status(500).json({ success: false, message: 'Scraping Gagal.' });
  }
});

router.get('/presensi', async (req, res) => {
    const phpSessId = req.headers['phpsessid'] || req.headers['authorization-cookie'];
    const userAgent = req.headers['user-agent'];

    if (!phpSessId) return res.status(401).json({ success: false, message: 'Header PHPSESSID kosong.' });
});

export default router;
