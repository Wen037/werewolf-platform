import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

const app = express();

// --- Middleware ---
app.use(helmet()); // Security Headers
app.use(cors());   // Allow React Client
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parse JSON bodies

// --- Health Check Route ---
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

export { app };