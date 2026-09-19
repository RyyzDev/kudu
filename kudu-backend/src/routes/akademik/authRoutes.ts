import { Router } from 'express';
import authenticateAcademicSystem from '../../services/akademik/authService.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const userAgent = req.headers['user-agent'];

  if (!username || !password) return res.status(400).json({ success: false, message: 'Username/Password kosong.' });

  try {
    const finalPhpSessId = await authenticateAcademicSystem(username, password, userAgent);
    return res.json({
      success: true,
      message: 'Login dan Karantina berhasil dilewati.',
      data: { sessionCookies: finalPhpSessId }
    });
  } catch (error: any) {
    console.error('[Error Login]:', error.message);
    return res.status(error.message.includes('Login Gagal') ? 401 : 500).json({ success: false, message: error.message });
  }
});

export default router;
