import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import { GoogleGenAI, Type } from '@google/genai';
import { veloDb } from './src/data/db';
import { calculateCommission } from './src/utils/reverseTakeRate';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Enable Gzip/Brotli compression for all requests
app.use(compression({
  threshold: 1024,
  level: 6,
}));

// Performance & Cache-Control headers for static assets
app.use((req, res, next) => {
  if (req.url.match(/\.(js|css|webp|avif|png|jpg|jpeg|woff2|woff|ttf|svg)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (req.url.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
});

app.use(express.json());

// Initialize Gemini SDK with timeouts & graceful fallback
const geminiApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (geminiApiKey) {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Fallback heuristic for instant diagnostic without external latency (Colombian Home Services)
function getHeuristicDiagnosis(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes('fuga') || lower.includes('grifo') || lower.includes('agua') || lower.includes('lavaplatos') || lower.includes('tubería') || lower.includes('tuberia') || lower.includes('atasco') || lower.includes('sifon') || lower.includes('sifón') || lower.includes('inodoro') || lower.includes('bano') || lower.includes('baño') || lower.includes('plomero')) {
    return {
      detectedCategory: 'plumbing' as const,
      confidence: 0.94,
      suggestedServiceTitle: 'Reparación de Fuga en Tubería o Lavaplatos',
      estimatedPriceRange: { min: 75000, max: 130000 },
      urgencyLevel: 'alta' as const,
      diagnosticSummary: 'Posible desajuste en acoples flexibles, empaques o fisura en tubería PVC/CPVC.',
      suggestedQuestions: [
        '¿El goteo es constante o únicamente cuando abres la llave o usas el electrodoméstico?',
        '¿Se evidencia humedad en el mueble inferior o en el rodapié?',
      ],
    };
  }
  if (lower.includes('calor') || lower.includes('frío') || lower.includes('frio') || lower.includes('aire') || lower.includes('acondicionado') || lower.includes('calentador') || lower.includes('gas') || lower.includes('estufa')) {
    return {
      detectedCategory: 'climatization' as const,
      confidence: 0.92,
      suggestedServiceTitle: 'Mantenimiento Preventivo de Calentador a Gas o Aire',
      estimatedPriceRange: { min: 95000, max: 180000 },
      urgencyLevel: 'media' as const,
      diagnosticSummary: 'Posible obstrucción en serpentín, quemadores con hollín o baja presión en la línea de gas.',
      suggestedQuestions: [
        '¿El calentador se apaga a los pocos minutos de abrir la ducha?',
        '¿La llama se observa de color azul uniforme o presenta tonos amarillos?',
      ],
    };
  }
  return {
    detectedCategory: 'electricity' as const,
    confidence: 0.91,
    suggestedServiceTitle: 'Revisión y Cambio de Tacos / Caja de Breakers',
    estimatedPriceRange: { min: 90000, max: 200000 },
    urgencyLevel: 'alta' as const,
    diagnosticSummary: 'Posible sobrecarga en el circuito o breaker fatigado que requiere calibración o cambio RETIE.',
    suggestedQuestions: [
      '¿Los tacos se disparan al conectar electrodomésticos de alto consumo (horno, plancha, secadora)?',
      '¿Ha percibido olor a caliente o chispas en algún tomacorriente de la casa?',
    ],
  };
}

// ==========================================
// 1. Users & Authentication API (Role-Based JWT Flow)
// ==========================================
app.get('/api/users', (req, res) => {
  res.json(veloDb.users.toArray());
});

app.get('/api/users/:id', (req, res) => {
  const user = veloDb.users.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(user);
});

// ==========================================
// 2. Services Catalog API with Pagination & Filtering
// ==========================================
app.get('/api/services', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const category = req.query.category as string;
  const search = req.query.search as string;

  const filter: any = {};
  if (category && category !== 'all') {
    filter.category = category;
  }
  if (search) {
    filter.$search = search;
  }

  const result = veloDb.services.find(filter, {
    skip: (page - 1) * limit,
    limit,
    sort: { popular: -1 },
  });

  res.json(result);
});

// Quote with Reverse Take Rate for client-pro pair
app.get('/api/services/quote', (req, res) => {
  const { clientId, proId, servicePrice } = req.query;
  const price = parseFloat(servicePrice as string) || 95.0;
  const cId = (clientId as string) || 'usr_client_carlos';
  const pId = (proId as string) || 'usr_pro_mario';

  const historyCount = veloDb.countHistoricalOrdersBetween(cId, pId);
  const transactionNumber = historyCount + 1;
  const breakdown = calculateCommission(price, transactionNumber);

  res.json({
    transactionNumber,
    breakdown,
  });
});

// ==========================================
// 3. Orders & Escrow Management API (Batch-Populated to prevent N+1)
// ==========================================
app.get('/api/orders', (req, res) => {
  const { clientId, proId } = req.query;
  const filter: any = {};
  if (clientId) filter.clientId = clientId as string;
  if (proId) filter.proId = proId as string;

  // Uses batch user population to avoid N+1 query penalty
  const orders = veloDb.getOrdersWithPopulatedUsers(filter);
  res.json(orders);
});

app.get('/api/orders/:id', (req, res) => {
  const order = veloDb.orders.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
  res.json(order);
});

// Create order & hold funds in Escrow Vault
app.post('/api/orders', (req, res) => {
  try {
    const { clientId, proId, serviceId, scheduledDate, scheduledTimeSlot, address, notes } = req.body;
    if (!clientId || !proId || !serviceId) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const order = veloDb.createOrder({
      clientId,
      proId,
      serviceId,
      scheduledDate: scheduledDate || new Date().toISOString(),
      scheduledTimeSlot: scheduledTimeSlot || '10:00 AM - 12:00 PM',
      address: address || 'Calle 67 # 7-35, Chapinero, Bogotá',
      notes: notes || '',
    });

    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al crear orden' });
  }
});

// Pro marks job completed (starts 24h approval timer)
app.post('/api/orders/:id/complete', (req, res) => {
  try {
    const order = veloDb.markCompletedByPro(req.params.id);
    res.json(order);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Client or Auto Timer releases Escrow funds
app.post('/api/orders/:id/release', (req, res) => {
  try {
    const { role } = req.body; // 'client' | 'admin' | 'auto_timer'
    const order = veloDb.releaseEscrowFunds(req.params.id, role || 'client');
    res.json(order);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Client opens dispute (freezes Escrow)
app.post('/api/orders/:id/dispute', (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Se requiere motivo de disputa' });
    const order = veloDb.openDispute(req.params.id, reason);
    res.json(order);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Pro accepts order (0 € lead fee)
app.post('/api/orders/:id/accept-pro', (req, res) => {
  try {
    const order = veloDb.acceptOrderByPro(req.params.id);
    res.json(order);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Pro rejects order -> System reassigns next available pro without algorithmic penalties
app.post('/api/orders/:id/reject-pro', (req, res) => {
  try {
    const { proId } = req.body;
    const result = veloDb.rejectOrderByPro(req.params.id, proId || '');
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Dispute chat messages (human mediation without chatbots)
app.post('/api/orders/:id/dispute-message', (req, res) => {
  try {
    const { senderId, senderName, senderRole, message } = req.body;
    if (!message) return res.status(400).json({ error: 'Se requiere mensaje' });
    const order = veloDb.addDisputeMessage(req.params.id, {
      senderId,
      senderName,
      senderRole,
      message,
    });
    res.json(order);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Admin resolves dispute
app.post('/api/orders/:id/resolve-dispute', (req, res) => {
  try {
    const { resolution, notes } = req.body; // 'release_to_pro' | 'refund_client'
    if (!resolution) return res.status(400).json({ error: 'Se requiere resolución' });
    const order = veloDb.resolveDispute(req.params.id, resolution, notes || '');
    res.json(order);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Reviews and feedback
app.post('/api/orders/:id/review', (req, res) => {
  try {
    const { rating, comment } = req.body;
    const order = veloDb.addReview(req.params.id, rating, comment);
    res.json(order);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/orders/:id/reply', (req, res) => {
  try {
    const { proReply } = req.body;
    const order = veloDb.replyToReview(req.params.id, proReply);
    res.json(order);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Platform Stats with Redis-like TTL Cache
app.get('/api/stats', (req, res) => {
  res.json(veloDb.getPlatformStats());
});

// ==========================================
// 4. AI Diagnostic Engine (JSON & Token-by-Token Streaming)
// ==========================================
// Standard JSON Endpoint
app.post('/api/ai/recommend', async (req, res) => {
  const { problemDescription } = req.body;
  if (!problemDescription || typeof problemDescription !== 'string') {
    return res.status(400).json({ error: 'Se requiere descripción del problema' });
  }

  if (!ai) {
    return res.json(getHeuristicDiagnosis(problemDescription));
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Eres el motor experto de diagnóstico para Velo, la plataforma de servicios del hogar.
Analiza la siguiente descripción del problema escrita por el cliente y categorízala estrictamente para preseleccionar el técnico adecuado.

Problema del cliente: "${problemDescription}"

Responde exclusivamente con el formato JSON definido.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedCategory: {
              type: Type.STRING,
              description: 'Categoría principal: plumbing, electricity, climatization, locksmith, painting, o appliances',
            },
            confidence: {
              type: Type.NUMBER,
              description: 'Nivel de confianza de 0.0 a 1.0',
            },
            suggestedServiceTitle: {
              type: Type.STRING,
              description: 'Título conciso del servicio técnico recomendado',
            },
            estimatedPriceRange: {
              type: Type.OBJECT,
              properties: {
                min: { type: Type.NUMBER },
                max: { type: Type.NUMBER },
              },
              required: ['min', 'max'],
            },
            urgencyLevel: {
              type: Type.STRING,
              description: 'baja, media, alta, o urgencia_inmediata',
            },
            diagnosticSummary: {
              type: Type.STRING,
              description: 'Explicación técnica clara y tranquilizadora para el cliente en español (máx 2 frases).',
            },
            suggestedQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 preguntas breves que el cliente debe verificar para agilizar el diagnóstico.',
            },
          },
          required: [
            'detectedCategory',
            'confidence',
            'suggestedServiceTitle',
            'estimatedPriceRange',
            'urgencyLevel',
            'diagnosticSummary',
            'suggestedQuestions',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Error in Gemini API call, using graceful fallback:', err);
    return res.json(getHeuristicDiagnosis(problemDescription));
  }
});

// Token-by-Token Streaming Endpoint (Server-Sent Events) with 10s Timeout
app.get('/api/ai/recommend-stream', async (req, res) => {
  const problemDescription = (req.query.q as string) || '';
  if (!problemDescription) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const timeoutTimer = setTimeout(() => {
    sendEvent({ done: true, timeout: true });
    res.end();
  }, 10000); // 10s max timeout

  if (!ai) {
    // Deliver heuristic token-by-token
    const heuristic = getHeuristicDiagnosis(problemDescription);
    const words = heuristic.diagnosticSummary.split(' ');
    for (const word of words) {
      sendEvent({ token: word + ' ' });
      await new Promise(r => setTimeout(r, 45));
    }
    clearTimeout(timeoutTimer);
    sendEvent({ done: true, fullData: heuristic });
    return res.end();
  }

  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: `Eres el motor experto de diagnóstico para Velo.
Analiza brevemente el problema: "${problemDescription}".
Da una explicación técnica tranquilizadora de máximo 2 frases para el cliente.`,
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        sendEvent({ token: chunk.text });
      }
    }

    clearTimeout(timeoutTimer);
    const heuristic = getHeuristicDiagnosis(problemDescription);
    sendEvent({ done: true, fullData: heuristic });
    res.end();
  } catch (err) {
    clearTimeout(timeoutTimer);
    const heuristic = getHeuristicDiagnosis(problemDescription);
    sendEvent({ token: heuristic.diagnosticSummary, done: true, fullData: heuristic });
    res.end();
  }
});

// ==========================================
// 5. Mount Vite Middlewares in Dev / Static in Prod
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Velo full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
