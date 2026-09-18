import 'dotenv/config';
import app from './app.js';

app.listen(3000, () => {
  console.log('🚀 Server Berjalan di http://localhost:3000');
  console.log('1. Test Login: POST http://localhost:3000/api/auth/login (Body: username & password)');
  console.log('2. Test KRS  : GET http://localhost:3000/api/akademik/krs (Header: phpsessid)');
});