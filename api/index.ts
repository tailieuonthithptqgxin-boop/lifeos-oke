import express from 'express';
import cookieParser from 'cookie-parser';
import { authRouter } from '../src/backend/routes/auth.js';
import { apiRouter } from '../src/backend/routes/api.js';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api', apiRouter);

app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint '${req.originalUrl}' không tồn tại.`
  });
});

export default app;
