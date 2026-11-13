import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import { GoogleGenAI, Type } from '@google/genai';
import { veloDb } from './src/data/db';
import { calculateCommission } from './src/utils/reverseTakeRate';
import { Order, User, UserRole, ServiceCategory, DirectMessage, WorkerAd } from './src/types';

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

// Performance & Cache-Control headers (never cache Vite dev modules/CSS in development)
app.use((req, res, next) => {
  const isProd = process.env.NODE_ENV === 'production';
  if (req.url.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  } else if (isProd && req.url.match(/^\/assets\/.*\.(js|css|webp|avif|png|jpg|jpeg|woff2|woff|ttf|svg)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (!isProd && req.url.match(/\.(css|js|ts|tsx)(\?.*)?$/)) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
});

app.use(express.json({ limit: '5mb' }));

// ==========================================
// Privacy & Role Sanitization Helpers
// ==========================================
function sanitizeUser(u: User): User {
  const { password, ...safe } = u;
  return safe;
}

function sanitizeOrderForRole(order: Order, role?: string | null): Order {
  if (role === 'professional') {
    const { arrivalCode, ...safeOrder } = order;
    return safeOrder;
  }
  return order;
}

function getRequesterContext(req: express.Request): { userId?: string; role?: UserRole } {
  const headerId = req.headers['x-user-id'] as string | undefined;
  const headerRole = req.headers['x-user-role'] as UserRole | undefined;
  const queryId = (req.query.requesterId || req.query.userId) as string | undefined;
  const queryRole = (req.query.requesterRole || req.query.role) as UserRole | undefined;
  return {
    userId: headerId || queryId,
    role: headerRole || queryRole,
  };
}

// ==========================================
// Real-Time WebSocket Hub (/ws)
// ==========================================
interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  role: UserRole;
}

const wsClients = new Set<ConnectedClient>();

function broadcastToUsers(
  targetUserIds: string[],
  buildPayload: (role: UserRole, userId: string) => any
) {
  const idSet = new Set(targetUserIds.filter(Boolean));
  for (const client of wsClients) {
    if (client.ws.readyState === WebSocket.OPEN && idSet.has(client.userId)) {
      try {
        const payload = buildPayload(client.role, client.userId);
        client.ws.send(JSON.stringify(payload));
      } catch (err) {
        console.error('WS broadcast error:', err);
      }
    }
  }
}

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
  if (
    lower.includes('fuga') ||
    lower.includes('grifo') ||
    lower.includes('agua') ||
    lower.includes('lavaplatos') ||
    lower.includes('tubería') ||
    lower.includes('tuberia') ||
    lower.includes('atasco') ||
    lower.includes('sifon') ||
    lower.includes('sifón') ||
    lower.includes('inodoro') ||
    lower.includes('bano') ||
    lower.includes('baño') ||
    lower.includes('plomero')
  ) {
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
  if (
    lower.includes('calor') ||
    lower.includes('frío') ||
    lower.includes('frio') ||
    lower.includes('aire') ||
    lower.includes('acondicionado') ||
    lower.includes('calentador') ||
    lower.includes('gas') ||
    lower.includes('estufa')
  ) {
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
  if (lower.includes('chapa') || lower.includes('llave') || lower.includes('cerradura') || lower.includes('puerta')) {
    return {
      detectedCategory: 'locksmith' as const,
      confidence: 0.93,
      suggestedServiceTitle: 'Instalación o Cambio de Chapa de Seguridad',
      estimatedPriceRange: { min: 80000, max: 150000 },
      urgencyLevel: 'alta' as const,
      diagnosticSummary: 'Posible desgaste en cilindro, pestillo desalineado o necesidad de cerradura de alta seguridad.',
      suggestedQuestions: [
        '¿La puerta es de madera, metálica o blindada?',
        '¿Necesitas apertura de emergencia o cambio completo de chapa?',
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
// 1. Users & Authentication API (Role-Separated Login & Registration)
// ==========================================
app.get('/api/users', (req, res) => {
  const roleFilter = req.query.role as string | undefined;
  const list = veloDb.users.toArray().map(sanitizeUser);
  if (roleFilter) {
    return res.json(list.filter(u => u.role === roleFilter));
  }
  res.json(list);
});

app.get('/api/users/:id', (req, res) => {
  const user = veloDb.users.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(sanitizeUser(user));
});

app.post('/api/auth/login', (req, res) => {
  const { email, password, role, quickDemoUserId } = req.body;

  if (quickDemoUserId) {
    const found = veloDb.users.findById(quickDemoUserId);
    if (!found) {
      return res.status(404).json({ error: 'Cuenta demo no encontrada' });
    }
    if (role && found.role !== role) {
      return res.status(403).json({ error: 'Esta cuenta pertenece a otro rol privado.' });
    }
    return res.json(sanitizeUser(found));
  }

  if (!email) {
    return res.status(400).json({ error: 'Ingresa tu correo electrónico' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const allUsers = veloDb.users.toArray();
  const existingForRole = role
    ? allUsers.find(u => u.email.toLowerCase() === normalizedEmail && u.role === role)
    : undefined;
  const existing =
    existingForRole || allUsers.find(u => u.email.toLowerCase() === normalizedEmail);

  if (!existing) {
    return res.status(404).json({ error: 'No existe una cuenta registrada con ese correo. Regístrate primero.' });
  }

  if (role && existing.role !== role) {
    return res.status(403).json({
      error: `Este correo está registrado como ${existing.role === 'client' ? 'Cliente' : existing.role === 'professional' ? 'Trabajador' : 'Administrador'}. Inicia sesión en su portal correspondiente.`,
    });
  }

  if (existing.password && password && existing.password !== password) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  return res.json(sanitizeUser(existing));
});

app.post('/api/auth/register', (req, res) => {
  try {
    const {
      role,
      email,
      password,
      phone,
      city,
      name,
      firstName,
      middleName,
      lastName,
      secondLastName,
      cedula,
      faceVerified,
      verificationSkipped,
      trade,
      bio,
      hourlyRate,
      category,
    } = req.body;

    if (!role || (role !== 'client' && role !== 'professional')) {
      return res.status(400).json({ error: 'Rol inválido para registro' });
    }
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'El correo electrónico es obligatorio' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const duplicate = veloDb.users
      .toArray()
      .find(u => u.email.toLowerCase() === normalizedEmail && u.role === role);
    if (duplicate) {
      return res.status(409).json({
        error: `Ya existe una cuenta de ${role === 'professional' ? 'Trabajador' : 'Cliente'} registrada con este correo electrónico.`,
      });
    }

    if (role === 'client') {
      const fullName = (name || [firstName, lastName].filter(Boolean).join(' ')).trim();
      if (!fullName) {
        return res.status(400).json({ error: 'Tu nombre completo es obligatorio' });
      }
      const newClient: User = {
        id: `usr_client_${Date.now().toString().slice(-6)}`,
        name: fullName,
        firstName: firstName?.trim() || fullName.split(' ')[0],
        lastName: lastName?.trim() || fullName.split(' ').slice(1).join(' ') || '',
        email: normalizedEmail,
        password: password || 'velo123',
        role: 'client',
        phone: phone?.trim() || '+57 300 000 0000',
        city: city?.trim() || 'Bogotá',
      };
      veloDb.users.insertOne(newClient);
      return res.status(201).json(sanitizeUser(newClient));
    }

    // Worker / Professional registration rules
    const fName = String(firstName || '').trim();
    const lName = String(lastName || '').trim();
    const mName = String(middleName || '').trim();
    const slName = String(secondLastName || '').trim();

    if (!fName || !lName) {
      return res.status(400).json({
        error: 'Para trabajadores, el Primer Nombre y el Primer Apellido son obligatorios.',
      });
    }

    const isSkipped = Boolean(verificationSkipped);
    const hasCedula = Boolean(cedula && String(cedula).trim().length >= 5);
    const hasFace = Boolean(faceVerified);

    if (!isSkipped && (!hasCedula || !hasFace)) {
      return res.status(400).json({
        error: 'Debes completar la Cédula y el Reconocimiento Facial, o presionar "Omitir verificación (modo prueba)".',
      });
    }

    const fullName = [fName, mName, lName, slName].filter(Boolean).join(' ');
    const workerTrade = (trade || 'Técnico Especialista del Hogar').trim();
    const workerCity = (city || 'Bogotá').trim();
    const workerRate = Number(hourlyRate) || 95000;
    const workerCategory: ServiceCategory = category || 'plumbing';

    const categoryLabels: Record<ServiceCategory, string> = {
      plumbing: 'Plomería',
      electricity: 'Electricidad',
      climatization: 'Gasodomésticos & Clima',
      locksmith: 'Cerrajería',
      painting: 'Pintura & Acabados',
      appliances: 'Electrodomésticos',
    };

    const newPro: User = {
      id: `usr_pro_${Date.now().toString().slice(-6)}`,
      name: fullName,
      firstName: fName,
      middleName: mName || undefined,
      lastName: lName,
      secondLastName: slName || undefined,
      email: normalizedEmail,
      password: password || 'velo123',
      role: 'professional',
      phone: phone?.trim() || '+57 310 000 0000',
      city: workerCity,
      cedula: hasCedula ? String(cedula).trim() : isSkipped ? 'OMITIDA (PRUEBA)' : undefined,
      faceVerified: hasFace,
      verificationSkipped: isSkipped,
      trade: workerTrade,
      bio: bio?.trim() || `Especialista verificado en ${workerTrade} atendiendo hogares y oficinas en ${workerCity}.`,
      rating: 5.0,
      completedJobsCount: 0,
      repeatClientsCount: 0,
      verifiedIdentity: hasCedula && hasFace,
      insuranceActive: true,
      hourlyRate: workerRate,
      availableDays: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
      stripeConnected: true,
      escrowBalancePending: 0,
      escrowBalanceAvailable: 0,
      skills: [workerTrade],
      responseTime: '< 15 min',
    };

    veloDb.users.insertOne(newPro);

    // Auto-create an initial ad so clients can find the newly registered worker right away
    const newAd: WorkerAd = {
      id: `ad_${Date.now().toString().slice(-6)}`,
      proId: newPro.id,
      proName: newPro.name,
      proTrade: workerTrade,
      city: workerCity,
      title: `Servicio profesional de ${workerTrade} en ${workerCity}`,
      description: newPro.bio || `Atención garantizada con pago protegido en custodia Velo.`,
      category: workerCategory,
      categoryLabel: categoryLabels[workerCategory] || 'Servicios',
      priceFrom: workerRate,
      rating: 5.0,
      verifiedCedula: hasCedula && !isSkipped,
      verifiedFace: hasFace && !isSkipped,
      verificationSkipped: isSkipped,
      imageUrl: '/src/assets/images/service_plumbing_1794317977369.jpg',
      createdAt: new Date().toISOString(),
      active: true,
    };
    veloDb.workerAds.insertOne(newAd);

    return res.status(201).json(sanitizeUser(newPro));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error en registro' });
  }
});

// Switch from Client -> Worker (requires Worker login/registration, preserves all Client info)
app.post('/api/auth/switch-to-worker', (req, res) => {
  try {
    const {
      clientId,
      mode,
      email,
      password,
      phone,
      city,
      firstName,
      middleName,
      lastName,
      secondLastName,
      cedula,
      faceVerified,
      verificationSkipped,
      trade,
      hourlyRate,
      category,
    } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: 'clientId es obligatorio' });
    }

    const clientUser = veloDb.users.findById(clientId);
    if (!clientUser || clientUser.role !== 'client') {
      return res.status(404).json({ error: 'Cuenta de cliente no encontrada' });
    }

    const allUsers = veloDb.users.toArray();
    const normalizedEmail = String(email || clientUser.email).trim().toLowerCase();

    if (mode === 'login') {
      // Find linked worker first, or worker matching provided email
      let worker =
        (clientUser.linkedProId ? veloDb.users.findById(clientUser.linkedProId) : null) ||
        allUsers.find(u => u.role === 'professional' && u.email.toLowerCase() === normalizedEmail) ||
        null;

      if (!worker || worker.role !== 'professional') {
        return res.status(404).json({
          error:
            'Aún no tienes una cuenta de Trabajador con este correo. Cambia a la pestaña de registro/verificación (con tu info de cliente prellenada) para activarla.',
        });
      }

      if (worker.password && password && worker.password !== password) {
        return res.status(401).json({ error: 'Contraseña incorrecta para la cuenta de Trabajador.' });
      }

      veloDb.users.updateOne(clientUser.id, { linkedProId: worker.id });
      const updatedWorker = veloDb.users.updateOne(worker.id, { linkedClientId: clientUser.id }) || worker;
      return res.json(sanitizeUser(updatedWorker));
    }

    // Mode 'register' (or first-time Worker onboarding using pre-filled Client info)
    const fName = String(firstName || clientUser.firstName || clientUser.name.split(' ')[0] || '').trim();
    const lName = String(
      lastName || clientUser.lastName || clientUser.name.split(' ').slice(1).join(' ') || ''
    ).trim();
    const mName = String(middleName || '').trim();
    const slName = String(secondLastName || '').trim();

    if (!fName || !lName) {
      return res.status(400).json({
        error: 'Para activar tu rol de Trabajador, el Primer Nombre y el Primer Apellido son obligatorios.',
      });
    }

    const isSkipped = Boolean(verificationSkipped);
    const hasCedula = Boolean(cedula && String(cedula).trim().length >= 5);
    const hasFace = Boolean(faceVerified);

    if (!isSkipped && (!hasCedula || !hasFace)) {
      return res.status(400).json({
        error: 'Completa la Cédula y el Reconocimiento Facial, o presiona "Omitir verificación (modo prueba)".',
      });
    }

    // If this client already had a linked worker, update/preserve it cleanly instead of duplicating
    const existingWorker =
      (clientUser.linkedProId ? veloDb.users.findById(clientUser.linkedProId) : null) ||
      allUsers.find(u => u.role === 'professional' && u.email.toLowerCase() === normalizedEmail) ||
      null;

    const fullName = [fName, mName, lName, slName].filter(Boolean).join(' ');
    const workerTrade = (trade || 'Técnico Especialista del Hogar').trim();
    const workerCity = (city || clientUser.city || 'Bogotá').trim();
    const workerRate = Number(hourlyRate) || 95000;
    const workerCategory: ServiceCategory = category || 'plumbing';

    const categoryLabels: Record<ServiceCategory, string> = {
      plumbing: 'Plomería',
      electricity: 'Electricidad',
      climatization: 'Gasodomésticos & Clima',
      locksmith: 'Cerrajería',
      painting: 'Pintura & Acabados',
      appliances: 'Electrodomésticos',
    };

    if (existingWorker) {
      const updated = veloDb.users.updateOne(existingWorker.id, {
        name: fullName,
        firstName: fName,
        middleName: mName || undefined,
        lastName: lName,
        secondLastName: slName || undefined,
        password: password || existingWorker.password || clientUser.password || 'velo123',
        phone: (phone || clientUser.phone || existingWorker.phone || '+57 300 000 0000').trim(),
        city: workerCity,
        cedula: hasCedula ? String(cedula).trim() : existingWorker.cedula || 'OMITIDA (PRUEBA)',
        faceVerified: hasFace || existingWorker.faceVerified,
        verificationSkipped: isSkipped,
        verifiedIdentity: (hasCedula && hasFace) || Boolean(existingWorker.verifiedIdentity),
        trade: workerTrade,
        hourlyRate: workerRate,
        linkedClientId: clientUser.id,
      })!;
      veloDb.users.updateOne(clientUser.id, { linkedProId: updated.id });
      return res.json(sanitizeUser(updated));
    }

    const newPro: User = {
      id: `usr_pro_${Date.now().toString().slice(-6)}`,
      name: fullName,
      firstName: fName,
      middleName: mName || undefined,
      lastName: lName,
      secondLastName: slName || undefined,
      email: normalizedEmail,
      password: password || clientUser.password || 'velo123',
      role: 'professional',
      phone: (phone || clientUser.phone || '+57 300 000 0000').trim(),
      city: workerCity,
      cedula: hasCedula ? String(cedula).trim() : isSkipped ? 'OMITIDA (PRUEBA)' : undefined,
      faceVerified: hasFace,
      verificationSkipped: isSkipped,
      trade: workerTrade,
      bio: `Especialista en ${workerTrade} atendiendo hogares y oficinas en ${workerCity}.`,
      rating: 5.0,
      completedJobsCount: 0,
      repeatClientsCount: 0,
      verifiedIdentity: hasCedula && hasFace,
      insuranceActive: true,
      hourlyRate: workerRate,
      availableDays: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
      stripeConnected: true,
      escrowBalancePending: 0,
      escrowBalanceAvailable: 0,
      skills: [workerTrade],
      responseTime: '< 15 min',
      linkedClientId: clientUser.id,
    };

    veloDb.users.insertOne(newPro);
    veloDb.users.updateOne(clientUser.id, { linkedProId: newPro.id });

    const newAd: WorkerAd = {
      id: `ad_${Date.now().toString().slice(-6)}`,
      proId: newPro.id,
      proName: newPro.name,
      proTrade: workerTrade,
      city: workerCity,
      title: `Servicio profesional de ${workerTrade} en ${workerCity}`,
      description: newPro.bio || `Atención garantizada con pago protegido en custodia Velo.`,
      category: workerCategory,
      categoryLabel: categoryLabels[workerCategory] || 'Servicios',
      priceFrom: workerRate,
      rating: 5.0,
      verifiedCedula: hasCedula && !isSkipped,
      verifiedFace: hasFace && !isSkipped,
      verificationSkipped: isSkipped,
      imageUrl: '/src/assets/images/service_plumbing_1794317977369.jpg',
      createdAt: new Date().toISOString(),
      active: true,
    };
    veloDb.workerAds.insertOne(newAd);

    return res.status(201).json(sanitizeUser(newPro));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error al cambiar al rol de Trabajador' });
  }
});

// Switch from Worker -> Client (NO login required; preserves all Worker data, ads, sales, and identity verification)
app.post('/api/auth/switch-to-client', (req, res) => {
  try {
    const { proId } = req.body;
    if (!proId) {
      return res.status(400).json({ error: 'proId es obligatorio' });
    }

    const proUser = veloDb.users.findById(proId);
    if (!proUser || proUser.role !== 'professional') {
      return res.status(404).json({ error: 'Cuenta de trabajador no encontrada' });
    }

    const allUsers = veloDb.users.toArray();
    const proEmail = proUser.email.toLowerCase();

    let clientUser =
      (proUser.linkedClientId ? veloDb.users.findById(proUser.linkedClientId) : null) ||
      allUsers.find(u => u.role === 'client' && u.linkedProId === proUser.id) ||
      allUsers.find(u => u.role === 'client' && u.email.toLowerCase() === proEmail) ||
      null;

    if (!clientUser) {
      clientUser = {
        id: `usr_client_${Date.now().toString().slice(-6)}`,
        name: proUser.name,
        firstName: proUser.firstName || proUser.name.split(' ')[0],
        lastName: proUser.lastName || proUser.name.split(' ').slice(1).join(' ') || '',
        email: proUser.email,
        password: proUser.password || 'velo123',
        role: 'client',
        phone: proUser.phone || '+57 300 000 0000',
        city: proUser.city || 'Bogotá',
        linkedProId: proUser.id,
      };
      veloDb.users.insertOne(clientUser);
    } else if (!clientUser.linkedProId) {
      clientUser = veloDb.users.updateOne(clientUser.id, { linkedProId: proUser.id }) || clientUser;
    }

    if (proUser.linkedClientId !== clientUser.id) {
      veloDb.users.updateOne(proUser.id, { linkedClientId: clientUser.id });
    }

    return res.json(sanitizeUser(clientUser));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error al cambiar al rol de Cliente' });
  }
});

// ==========================================
// 2. Services & Worker Ads Marketplace API
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

app.get('/api/worker-ads', (req, res) => {
  const { category, city, maxPrice, minRating, verifiedOnly, search, proId, includeInactive } = req.query;
  let ads = veloDb.workerAds.toArray();

  if (includeInactive !== 'true') {
    ads = ads.filter(a => a.active);
  }
  if (proId && typeof proId === 'string') {
    ads = ads.filter(a => a.proId === proId);
  }
  if (category && category !== 'all') {
    ads = ads.filter(a => a.category === category);
  }
  if (city && city !== 'all' && typeof city === 'string') {
    const cLower = city.toLowerCase();
    ads = ads.filter(a => a.city.toLowerCase().includes(cLower));
  }
  if (maxPrice) {
    const maxP = Number(maxPrice);
    if (!Number.isNaN(maxP) && maxP > 0) {
      ads = ads.filter(a => a.priceFrom <= maxP);
    }
  }
  if (minRating) {
    const minR = Number(minRating);
    if (!Number.isNaN(minR) && minR > 0) {
      ads = ads.filter(a => a.rating >= minR);
    }
  }
  if (verifiedOnly === 'true') {
    ads = ads.filter(a => a.verifiedCedula && a.verifiedFace);
  }
  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    ads = ads.filter(
      a =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.proName.toLowerCase().includes(q) ||
        a.proTrade.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.categoryLabel.toLowerCase().includes(q)
    );
  }

  ads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(ads);
});

app.post('/api/worker-ads', (req, res) => {
  try {
    const { proId, title, description, category, priceFrom, city } = req.body;
    if (!proId || !title || !priceFrom) {
      return res.status(400).json({ error: 'Título, precio y trabajador son obligatorios' });
    }
    const pro = veloDb.users.findById(proId);
    if (!pro || pro.role !== 'professional') {
      return res.status(403).json({ error: 'Solo trabajadores registrados pueden publicar anuncios' });
    }

    const cat: ServiceCategory = category || 'plumbing';
    const categoryLabels: Record<ServiceCategory, string> = {
      plumbing: 'Plomería',
      electricity: 'Electricidad',
      climatization: 'Gasodomésticos & Clima',
      locksmith: 'Cerrajería',
      painting: 'Pintura & Acabados',
      appliances: 'Electrodomésticos',
    };

    const imageByCat: Record<string, string> = {
      plumbing: '/src/assets/images/service_plumbing_1794317977369.jpg',
      electricity: '/src/assets/images/service_electrical_1794317978309.jpg',
      climatization: '/src/assets/images/service_climatization_1794317978104.jpg',
      locksmith: '/src/assets/images/service_electrical_1794317978309.jpg',
    };

    const ad: WorkerAd = {
      id: `ad_${Date.now().toString().slice(-6)}`,
      proId: pro.id,
      proName: pro.name,
      proTrade: pro.trade || 'Profesional Velo',
      city: (city || pro.city || 'Bogotá').split('(')[0].trim(),
      title: String(title).trim(),
      description: String(description || 'Servicio garantizado con custodia segura Velo.').trim(),
      category: cat,
      categoryLabel: categoryLabels[cat] || 'Servicios',
      priceFrom: Number(priceFrom),
      rating: pro.rating || 5.0,
      verifiedCedula: Boolean(pro.cedula && !pro.verificationSkipped),
      verifiedFace: Boolean(pro.faceVerified && !pro.verificationSkipped),
      verificationSkipped: Boolean(pro.verificationSkipped),
      imageUrl: imageByCat[cat] || '/src/assets/images/service_plumbing_1794317977369.jpg',
      createdAt: new Date().toISOString(),
      active: true,
    };

    veloDb.workerAds.insertOne(ad);
    res.status(201).json(ad);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al publicar anuncio' });
  }
});

app.patch('/api/worker-ads/:id', (req, res) => {
  const existing = veloDb.workerAds.findById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Anuncio no encontrado' });
  const updated = veloDb.workerAds.updateOne(req.params.id, req.body);
  res.json(updated);
});

// Quote with Reverse Take Rate for client-pro pair
app.get('/api/services/quote', (req, res) => {
  const { clientId, proId, servicePrice } = req.query;
  const price = parseFloat(servicePrice as string) || 95000;
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
// 3. Direct Real-Time Chat & Email API (Strictly Scoped to Thread Participants)
// ==========================================
app.get('/api/messages', (req, res) => {
  const ctx = getRequesterContext(req);
  const { userId, partnerId, threadId } = req.query;
  const effectiveUserId = ctx.userId || (userId as string);

  if (!effectiveUserId) {
    return res.status(401).json({ error: 'Se requiere sesión activa para ver mensajes privados' });
  }

  let msgs = veloDb.messages
    .toArray()
    .filter(m => m.clientId === effectiveUserId || m.proId === effectiveUserId);

  if (threadId && typeof threadId === 'string') {
    msgs = msgs.filter(m => m.threadId === threadId);
  } else if (partnerId && typeof partnerId === 'string') {
    msgs = msgs.filter(m => m.clientId === partnerId || m.proId === partnerId);
  }

  msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  res.json(msgs);
});

app.post('/api/messages/chat', (req, res) => {
  try {
    const { clientId, proId, senderId, senderName, senderRole, text } = req.body;
    if (!clientId || !proId || !senderId || !text || !String(text).trim()) {
      return res.status(400).json({ error: 'Faltan campos del mensaje' });
    }
    const client = veloDb.users.findById(clientId);
    const pro = veloDb.users.findById(proId);

    const msg: DirectMessage = {
      id: `dmsg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      threadId: `${clientId}__${proId}`,
      clientId,
      clientName: client?.name || 'Cliente',
      proId,
      proName: pro?.name || 'Trabajador',
      senderId,
      senderName: senderName || (senderRole === 'client' ? client?.name : pro?.name) || 'Usuario',
      senderRole: senderRole || 'client',
      text: String(text).trim(),
      timestamp: new Date().toISOString(),
      type: 'chat',
    };

    veloDb.messages.insertOne(msg);

    broadcastToUsers([clientId, proId], () => ({
      type: 'chat:message',
      message: msg,
    }));

    res.status(201).json(msg);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error enviando mensaje' });
  }
});

app.post('/api/messages/email', (req, res) => {
  try {
    const { clientId, proId, senderId, senderName, senderRole, subject, body } = req.body;
    if (!clientId || !proId || !senderId || !subject || !body) {
      return res.status(400).json({ error: 'Asunto y cuerpo del correo son obligatorios' });
    }
    const client = veloDb.users.findById(clientId);
    const pro = veloDb.users.findById(proId);

    const msg: DirectMessage = {
      id: `email_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      threadId: `${clientId}__${proId}`,
      clientId,
      clientName: client?.name || 'Cliente',
      proId,
      proName: pro?.name || 'Trabajador',
      senderId,
      senderName: senderName || 'Usuario',
      senderRole: senderRole || 'client',
      subject: String(subject).trim(),
      text: String(body).trim(),
      timestamp: new Date().toISOString(),
      type: 'email',
    };

    veloDb.messages.insertOne(msg);

    broadcastToUsers([clientId, proId], () => ({
      type: 'chat:message',
      message: msg,
    }));

    res.status(201).json({
      success: true,
      deliveredTo: senderRole === 'client' ? pro?.email : client?.email,
      message: msg,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error enviando correo' });
  }
});

// ==========================================
// 4. Orders, Escrow & Rappi Arrival Verification API (Role-Private)
// ==========================================
app.get('/api/orders', (req, res) => {
  const ctx = getRequesterContext(req);
  const { clientId, proId } = req.query;
  const filter: any = {};

  if (ctx.role === 'client' && ctx.userId) {
    filter.clientId = ctx.userId;
  } else if (ctx.role === 'professional' && ctx.userId) {
    filter.proId = ctx.userId;
  } else {
    if (clientId) filter.clientId = clientId as string;
    if (proId) filter.proId = proId as string;
  }

  const orders = veloDb
    .getOrdersWithPopulatedUsers(filter)
    .map(o => sanitizeOrderForRole(o, ctx.role || (proId ? 'professional' : undefined)));

  res.json(orders);
});

app.get('/api/orders/:id', (req, res) => {
  const ctx = getRequesterContext(req);
  const order = veloDb.orders.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Orden no encontrada' });

  if (ctx.role === 'client' && ctx.userId && order.clientId !== ctx.userId) {
    return res.status(403).json({ error: 'Acceso denegado a este contrato' });
  }
  if (ctx.role === 'professional' && ctx.userId && order.proId !== ctx.userId) {
    return res.status(403).json({ error: 'Acceso denegado a este contrato' });
  }

  res.json(sanitizeOrderForRole(order, ctx.role));
});

// Create order & hold funds in Escrow Vault + generate Rappi 4-digit arrivalCode
app.post('/api/orders', (req, res) => {
  try {
    const {
      clientId,
      proId,
      serviceId,
      workerAdId,
      customTitle,
      customPrice,
      category,
      scheduledDate,
      scheduledTimeSlot,
      address,
      notes,
    } = req.body;

    if (!clientId || !proId || (!serviceId && !workerAdId)) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const order = veloDb.createOrder({
      clientId,
      proId,
      serviceId,
      workerAdId,
      customTitle,
      customPrice: customPrice ? Number(customPrice) : undefined,
      category,
      scheduledDate: scheduledDate || new Date().toISOString(),
      scheduledTimeSlot: scheduledTimeSlot || '10:00 AM - 12:00 PM',
      address: address || 'Calle 67 # 7-35, Chapinero, Bogotá',
      notes: notes || '',
    });

    broadcastToUsers([order.clientId, order.proId], role => ({
      type: 'order:created',
      order: sanitizeOrderForRole(order, role),
    }));

    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al crear orden' });
  }
});

// Rappi-style Arrival Code Verification (Submitted by Worker using code given by Client)
app.post('/api/orders/:id/verify-arrival', (req, res) => {
  try {
    const ctx = getRequesterContext(req);
    const { code, proId } = req.body;
    const effectiveProId = ctx.role === 'professional' ? ctx.userId : proId;

    const updated = veloDb.verifyArrivalCode(req.params.id, code, effectiveProId);

    broadcastToUsers([updated.clientId, updated.proId], role => ({
      type: 'order:arrival_verified',
      order: sanitizeOrderForRole(updated, role),
    }));

    res.json(sanitizeOrderForRole(updated, 'professional'));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Pro marks job completed (starts 24h approval timer)
app.post('/api/orders/:id/complete', (req, res) => {
  try {
    const ctx = getRequesterContext(req);
    const order = veloDb.markCompletedByPro(req.params.id);
    broadcastToUsers([order.clientId, order.proId], role => ({
      type: 'order:updated',
      order: sanitizeOrderForRole(order, role),
    }));
    res.json(sanitizeOrderForRole(order, ctx.role));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Client or Auto Timer releases Escrow funds
app.post('/api/orders/:id/release', (req, res) => {
  try {
    const { role } = req.body;
    const order = veloDb.releaseEscrowFunds(req.params.id, role || 'client');
    broadcastToUsers([order.clientId, order.proId], targetRole => ({
      type: 'order:updated',
      order: sanitizeOrderForRole(order, targetRole),
    }));
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
    broadcastToUsers([order.clientId, order.proId], targetRole => ({
      type: 'order:updated',
      order: sanitizeOrderForRole(order, targetRole),
    }));
    res.json(order);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Pro accepts order (0 $ lead fee)
app.post('/api/orders/:id/accept-pro', (req, res) => {
  try {
    const ctx = getRequesterContext(req);
    const order = veloDb.acceptOrderByPro(req.params.id);
    broadcastToUsers([order.clientId, order.proId], targetRole => ({
      type: 'order:updated',
      order: sanitizeOrderForRole(order, targetRole),
    }));
    res.json(sanitizeOrderForRole(order, ctx.role));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Pro rejects order -> System reassigns next available pro without algorithmic penalties
app.post('/api/orders/:id/reject-pro', (req, res) => {
  try {
    const { proId } = req.body;
    const result = veloDb.rejectOrderByPro(req.params.id, proId || '');
    res.json({
      ...result,
      order: sanitizeOrderForRole(result.order, 'professional'),
    });
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
    const { resolution, notes } = req.body;
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
// 3b. Client Purchases Management API (Gestión de Compras - Solo Clientes)
// ==========================================
app.get('/api/purchases', (req, res) => {
  const ctx = getRequesterContext(req);
  if (ctx.role === 'professional') {
    return res.status(403).json({ error: 'Módulo exclusivo para clientes' });
  }

  const { clientId, status, search } = req.query;
  const filter: any = {};
  if (ctx.role === 'client' && ctx.userId) {
    filter.clientId = ctx.userId;
  } else if (clientId) {
    filter.clientId = clientId as string;
  }
  if (status && status !== 'all') filter.status = status as string;

  let list = veloDb.purchases.find(filter, { sort: { date: -1 } }).items;
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    list = list.filter(
      p =>
        p.supplier.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }
  res.json(list);
});

app.post('/api/purchases', (req, res) => {
  try {
    const ctx = getRequesterContext(req);
    if (ctx.role === 'professional') {
      return res.status(403).json({ error: 'Módulo exclusivo para clientes' });
    }
    const { clientId, clientName, supplier, deliveryDate, amount, items, priority, description, paymentMethod } = req.body;
    if (!supplier || !amount) {
      return res.status(400).json({ error: 'Proveedor y monto son obligatorios' });
    }
    const existingCount = veloDb.purchases.count() + 1;
    const id = `OC-${String(existingCount).padStart(3, '0')}-${Date.now().toString().slice(-3)}`;
    const newPurchase = veloDb.purchases.insertOne({
      id,
      clientId: ctx.userId || clientId || 'usr_client_carlos',
      clientName: clientName || 'Carlos Méndez',
      supplier,
      date: new Date().toISOString().split('T')[0],
      deliveryDate: deliveryDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      amount: Number(amount),
      items: Number(items) || 1,
      priority: priority || 'medium',
      status: 'pending',
      description: description || 'Orden de compra generada en Velo Colombia',
      paymentMethod: paymentMethod || 'Custodia Velo / PSE',
    });
    res.status(201).json(newPurchase);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al crear orden de compra' });
  }
});

app.patch('/api/purchases/:id', (req, res) => {
  try {
    const updated = veloDb.purchases.updateOne(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Orden de compra no encontrada' });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/purchases/:id', (req, res) => {
  const deleted = veloDb.purchases.deleteOne(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Orden de compra no encontrada' });
  res.json({ success: true });
});

// ==========================================
// 3c. Worker Sales Management API (Gestión de Ventas - Solo Trabajadores)
// ==========================================
app.get('/api/sales', (req, res) => {
  const ctx = getRequesterContext(req);
  if (ctx.role === 'client') {
    return res.status(403).json({ error: 'Módulo exclusivo para trabajadores' });
  }

  const { proId, status, search } = req.query;
  const filter: any = {};
  if (ctx.role === 'professional' && ctx.userId) {
    filter.proId = ctx.userId;
  } else if (proId) {
    filter.proId = proId as string;
  }
  if (status && status !== 'all') filter.status = status as string;

  let list = veloDb.sales.find(filter, { sort: { date: -1 } }).items;
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    list = list.filter(
      s =>
        s.customer.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q)
    );
  }
  res.json(list);
});

app.post('/api/sales', (req, res) => {
  try {
    const ctx = getRequesterContext(req);
    if (ctx.role === 'client') {
      return res.status(403).json({ error: 'Módulo exclusivo para trabajadores' });
    }
    const { proId, customer, dueDate, amount, items, paymentTerms, salesRep, description } = req.body;
    if (!customer || !amount) {
      return res.status(400).json({ error: 'Cliente y monto son obligatorios' });
    }
    const existingCount = veloDb.sales.count() + 1;
    const id = `VT-${String(existingCount).padStart(3, '0')}-${Date.now().toString().slice(-3)}`;
    const newSale = veloDb.sales.insertOne({
      id,
      proId: ctx.userId || proId || 'usr_pro_mario',
      customer,
      date: new Date().toISOString().split('T')[0],
      dueDate: dueDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      amount: Number(amount),
      items: Number(items) || 1,
      status: 'pending',
      paymentStatus: paymentTerms === 'immediate' ? 'paid' : 'pending',
      paymentTerms: paymentTerms || 'net15',
      salesRep: salesRep || 'Mario Restrepo',
      description: description || 'Servicio y suministro facturado en Velo Colombia',
    });
    res.status(201).json(newSale);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al crear orden de venta' });
  }
});

app.patch('/api/sales/:id', (req, res) => {
  try {
    const updated = veloDb.sales.updateOne(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Orden de venta no encontrada' });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/sales/:id', (req, res) => {
  const deleted = veloDb.sales.deleteOne(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Orden de venta no encontrada' });
  res.json({ success: true });
});

// ==========================================
// 4. AI Diagnostic Engine (JSON & Token-by-Token Streaming)
// ==========================================
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
      contents: `Eres el motor experto de diagnóstico para Velo, la plataforma de servicios del hogar en Colombia.
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
  }, 10000);

  if (!ai) {
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
// 5. Mount Vite Middlewares & HTTP + WebSocket Server on Port 3000
// ==========================================
async function startServer() {
  const httpServer = http.createServer(app);

  // Real-time WebSocket server attached on /ws
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '/ws', `http://${req.headers.host || 'localhost'}`);
    const userId = url.searchParams.get('userId') || '';
    const role = (url.searchParams.get('role') as UserRole) || 'client';

    const clientRef: ConnectedClient = { ws, userId, role };
    wsClients.add(clientRef);

    ws.on('message', raw => {
      try {
        const parsed = JSON.parse(raw.toString());
        if (parsed.type === 'auth' && parsed.userId) {
          clientRef.userId = parsed.userId;
          clientRef.role = parsed.role || 'client';
        }
      } catch {
        // Ignore malformed non-JSON messages
      }
    });

    ws.on('close', () => {
      wsClients.delete(clientRef);
    });
  });

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

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Velo full-stack server + WebSocket running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
