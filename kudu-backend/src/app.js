import express from 'express';
import authRoutes from './routes/akademik/authRoutes.js';
import akademikRoutes from './routes/akademik/akademikRoutes.js';

const app = express();
app.use(express.json());

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/akademik', akademikRoutes);

export default app;
