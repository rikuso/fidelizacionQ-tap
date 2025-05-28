// Carga variables de entorno
require('dotenv').config();

const express       = require('express');
const helmet        = require('helmet');
const cors          = require('cors');
const morgan        = require('morgan');
const rateLimit     = require('express-rate-limit');
const NodeCache     = require('node-cache');

// Importar rutas
const tagRoutes           = require('./routes/tagRoutes');
const eventRoutes         = require('./routes/eventRoutes');
const statsRoutes         = require('./routes/statsRoutes');
const userRoutes          = require('./routes/userRoutes');
const clientesRoutes      = require('./routes/clientesRoutes');
const advancedStatsRoutes = require('./routes/advancedStatsRoutes');

const app         = express();
const PORT        = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['*'];

// 🔁 Cache en memoria con TTL de 60 segundos
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });
app.set('cache', cache);

// Middlwares de seguridad
app.use(helmet({
  contentSecurityPolicy: false // Ajustar según tus necesidades
}));

// Límite de peticiones para evitar abuso
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // máximo 100 peticiones por IP
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// CORS configurado
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','x-api-key','Authorization']
}));

// Parseo de body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging en desarrollo
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Rutas con versionado
app.use('/api/v1/tags',           tagRoutes);//implemetando esp32
app.use('/api/v1/events',         eventRoutes);//implementado en el front
app.use('/api/v1/stats',          statsRoutes);
app.use('/api/v1/users',          userRoutes);//implementado en el front
app.use('/api/v1/clientes',       clientesRoutes);//implementado en el front
app.use('/api/v1/advanced-stats', advancedStatsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({ error: err.message });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor escuchando en http://0.0.0.0:${PORT}`);
});
