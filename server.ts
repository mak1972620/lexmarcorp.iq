import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import Stripe from "stripe";
import mammoth from "mammoth";

import fs from "fs";
import { GoogleGenAI } from "@google/genai";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

dotenv.config();

const GEMINI_FLASH = process.env.GEMINI_FLASH_MODEL || "gemini-2.5-flash";
const GEMINI_PRO = process.env.GEMINI_PRO_MODEL || "gemini-2.5-pro";
const GEMINI_FALLBACK = "gemini-2.0-flash";

let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbPathStr = process.env.DATABASE_PATH || "legal.db";
if (dbPathStr.trim() === "Secret value" || dbPathStr.trim() === "") {
  dbPathStr = "legal.db";
}
const dbPath = dbPathStr;

let db: any;

try {
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.prepare("SELECT 1").get();
} catch (err: any) {
  console.error("Database initialization failed, recreating database due to corruption:", err);
  try {
    if (db) db.close();
  } catch (closeErr) {}
  
  try {
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    if (fs.existsSync(`${dbPath}-wal`)) fs.unlinkSync(`${dbPath}-wal`);
    if (fs.existsSync(`${dbPath}-shm`)) fs.unlinkSync(`${dbPath}-shm`);
  } catch (rmErr) {
    console.error("Failed to delete database files:", rmErr);
  }
  
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
}

const JWT_SECRET = process.env.JWT_SECRET === "Secret value" || !process.env.JWT_SECRET ? "lexmarcorp-secret-key-2024" : process.env.JWT_SECRET;


// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'cliente',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    rfc TEXT,
    type TEXT CHECK(type IN ('fisica', 'moral')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    client_id INTEGER,
    lawyer_id INTEGER,
    type TEXT,
    court TEXT,
    case_number TEXT,
    status TEXT DEFAULT 'abierto',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES clients(id),
    FOREIGN KEY(lawyer_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    case_id INTEGER,
    assigned_to INTEGER,
    priority TEXT CHECK(priority IN ('Alta', 'Media', 'Baja')),
    due_date DATETIME,
    status TEXT DEFAULT 'pendiente',
    creation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(case_id) REFERENCES cases(id),
    FOREIGN KEY(assigned_to) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    size INTEGER,
    case_id INTEGER,
    tags TEXT,
    author_id INTEGER,
    file_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(case_id) REFERENCES cases(id),
    FOREIGN KEY(author_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER,
    sender_id INTEGER,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(case_id) REFERENCES cases(id),
    FOREIGN KEY(sender_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS case_milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL,
    stage TEXT NOT NULL,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT DEFAULT 'completado',
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    user_id INTEGER,
    entity TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER,
    client_id INTEGER,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'MXN',
    concept TEXT,
    type TEXT CHECK(type IN ('manual', 'stripe')),
    status TEXT DEFAULT 'pendiente',
    method TEXT,
    reference TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_expense BOOLEAN DEFAULT 0,
    FOREIGN KEY(case_id) REFERENCES cases(id),
    FOREIGN KEY(client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS document_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    placeholders TEXT,
    materia TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed Admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE LOWER(email) = ?").get("marco@lexmarcorp.com");
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync("LexmarCorp!2026", 10);
  db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(
    "CEO. LIC. MARCO PERALES",
    "marco@lexmarcorp.com",
    hashedPassword,
    "admin"
  );
} else {
  db.prepare("UPDATE users SET name = ? WHERE id = 1").run(
    "CEO. LIC. MARCO PERALES"
  );
}

// Seed Demo Lawyer User for testing / client sharing
const demoUserExists = db.prepare("SELECT * FROM users WHERE LOWER(email) = ?").get("invitada@lexmarcorp.com");
if (!demoUserExists) {
  const demoHashedPassword = bcrypt.hashSync("Invitada2026!", 10);
  db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(
    "Lic. Invitada Especial",
    "invitada@lexmarcorp.com",
    demoHashedPassword,
    "abogado"
  );
}

// Ensure system goals are established
try {
  db.prepare("INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run("goal_cases", "50");
  db.prepare("INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run("goal_tasks", "100");
} catch (settingError) {
  console.error("Error setting system goals:", settingError);
}

// Ensure legal document templates are seeded if empty
try {
  const templatesCount = db.prepare("SELECT COUNT(*) as count FROM document_templates").get().count;
  if (templatesCount === 0) {
    const defaultTemplates = [
      {
        title: "Contrato de Arrendamiento Habitacional (Coahuila)",
        description: "Contrato estándar para rentar casas habitación, locales o departamentos de conformidad con el Código Civil de Coahuila.",
        materia: "Civil",
        placeholders: JSON.stringify(["arrendador_name", "arrendatario_name", "monto_renta", "ubicacion", "meses_duracion", "fecha_inicio"]),
        content: `CONTRATO DE ARRENDAMIENTO que celebran por una parte, como ARRENDADOR, {{arrendador_name}}, y por la otra parte, como ARRENDATARIO, {{arrendatario_name}}, respecto de la propiedad ubicada en {{ubicacion}}, de conformidad con las siguientes CLÁUSULAS:

PRIMERA: DE LA RENTA. El ARRENDATARIO pagará de manera mensual la cantidad de {{monto_renta}} MXN por concepto de renta de la propiedad señalada. El pago se efectuará dentro de los primeros 5 días hábiles de cada mes.

SEGUNDA: VIGENCIA Y DURACIÓN. Las partes pactan contractualmente que la vigencia forzosa de este arrendamiento será de {{meses_duracion}} meses, comenzando a surtir efectos plenos a partir de la fecha {{fecha_inicio}}.

TERCERA: DEL USO DE SUELO. El inmueble materia del contrato se destinará única y exclusivamente a uso habitacional, quedando prohibido subarrendarlo o traspasarlo sin consentimiento escrito del ARRENDADOR.`
      },
      {
        title: "Demanda de Pensión Alimenticia (Coahuila)",
        description: "Formato de demanda inicial en el juzgado familiar conforme a las reglas procesales de alimentos del Estado de Coahuila.",
        materia: "Familiar",
        placeholders: JSON.stringify(["actor_name", "demandado_name", "juzgado_ciudad", "monto_solicitado", "numero_hijos", "hijos_nombres"]),
        content: `C. JUEZ DE PRIMERA INSTANCIA EN MATERIA FAMILIAR DEL DISTRITO JUDICIAL CON SEDE EN {{juzgado_ciudad}}, COAHUILA DE ZARAGOZA.

{{actor_name}}, promoviendo por mi propio derecho y en representación procesal de mis {{numero_hijos}} menores hijos de nombres {{hijos_nombres}}, señalando como domicilio para recibir notificaciones el ubicado en la calle del proemio de esta demanda, y autorizando al Licenciado en Derecho para intervenir, comparezco ante Usted con el debido respeto para exponer:

Vengo a demandar del señor {{demandado_name}}, con domicilio en la calle de esta localidad, las siguientes PRESTACIONES:

A) El pago de una Pensión Alimenticia Provisional y en su momento Definitiva, solicitando se fije sobre el {{monto_solicitado}} por ciento de las percepciones mensuales que el demandado reciba.
B) El pago de los gastos y costas que el presente juicio familiar llegue a originar.`
      },
      {
        title: "Escrito de Demanda en Juicio Ejecutivo Mercantil",
        description: "Demanda mercantil para exigir el cobro de pagaré en propiedad de conformidad con el Código de Comercio.",
        materia: "Mercantil",
        placeholders: JSON.stringify(["actor_name", "demandado_name", "monto_adeudo", "fecha_pagare", "ciudad_ejecucion"]),
        content: `C. JUEZ DE PRIMERA INSTANCIA EN MATERIA MERCANTIL DE {{ciudad_ejecucion}}, COAHUILA DE ZARAGOZA.

{{actor_name}}, por derecho propio en mi carácter de endosatario en propiedad del Pagaré de fecha {{fecha_pagare}}, señalando domicilio procesal autorizado en autos, comparezco a demandar por la Vía Ejecutiva Mercantil al señor {{demandado_name}} con domicilio formal para emplazamiento, el pago de las siguientes prestaciones:

A) El pago inmediato de la cantidad de {{monto_adeudo}} MXN por concepto de suerte principal amparada por el pagaré de autos.
B) El pago de los intereses moratorios pactados a tasa legal correspondiente desde la fecha de constitución en mora hasta la total liquidación del adeudo, más costas judiciales correspondientes.`
      }
    ];

    const insertTemplate = db.prepare(`
      INSERT INTO document_templates (title, description, content, placeholders, materia)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const t of defaultTemplates) {
      insertTemplate.run(t.title, t.description, t.content, t.placeholders, t.materia);
    }
    console.log("Successfully seeded default document templates into database.");
  }
} catch (templateSeedErr) {
  console.error("Error seeding document templates:", templateSeedErr);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use((req: any, res: any, next: any) => {
    console.log(`[INCOMING] ${req.method} ${req.path}`);
    next();
  });
  app.use(cookieParser());

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    let token = req.cookies.token;
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts[0] === 'Bearer') {
        token = parts[1];
      }
    }
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get((decoded as any).id);
      if (!user) {
        res.clearCookie("token");
        return res.status(401).json({ error: "User not found" });
      }
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // API Routes
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña son requeridos" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const user: any = db.prepare("SELECT * FROM users WHERE LOWER(email) = ?").get(cleanEmail);
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET);
    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none" });
    res.json({ 
      user: { id: user.id, email: user.email, role: user.role, name: user.name },
      token
    });
    
    db.prepare("INSERT INTO audit_logs (action, user_id, entity) VALUES (?, ?, ?)").run("LOGIN", user.id, "auth");
  });

  app.post("/api/auth/register", (req, res) => {
    const { name, email, password, role } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const result = db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(
        name, email, hashedPassword, role || 'cliente'
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: "Email ya registrado" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ success: true });
  });

  app.get("/api/auth/me", authenticate, (req: any, res) => {
    res.json({ user: req.user });
  });

  app.post("/api/ai/chat", authenticate, async (req: any, res) => {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "El historial de mensajes es requerido" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "La clave de API de Gemini no está configurada. Por favor, configúrela en Settings > Secrets." });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const apiMessages = messages.map((m: any) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.text }]
      }));

      const systemInstruction = `Eres LexmarIQ, un asistente jurídico experto integrado en la plataforma LexmarCorp. 
El usuario actual es: ${req.user?.name || 'Colega'} (Rol: ${req.user?.role || 'Desconocido'}).
Ayuda al usuario a redactar escritos, responder dudas jurídicas (enfocado a México y el Estado de Coahuila), e interpretar leyes. 
Usa un tono profesional, claro, empático y objetivo. Responde en Markdown de forma estructurada, usando listas y negritas cuando sea conveniente.`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: GEMINI_FLASH,
          contents: apiMessages,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
      } catch (proError) {
        console.warn(`Fallback to ${GEMINI_FALLBACK} due to flash error:`, proError);
        response = await ai.models.generateContent({
          model: GEMINI_FALLBACK,
          contents: apiMessages,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
      }

      const text = response.text || "No pude generar una respuesta.";
      res.json({ text });
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      res.status(500).json({ error: err.message || "Error al comunicarse con LexmarIQ." });
    }
  });

  console.log("Registering /api/ai/extract-client");
  app.post("/api/ai/extract-client", authenticate, async (req: any, res) => {
    const { images, role = 'actor' } = req.body;
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "Se requiere al menos una imagen en base64" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "La clave de API de Gemini no está configurada." });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const parts: any[] = [];
      const WordExtractor = require("word-extractor");
      
      for (const fileBase64 of images) {
        const mimeTypeMatch = fileBase64.match(/^data:([a-zA-Z0-9+.\-\/]+);base64,/);
        if (mimeTypeMatch) {
          const mimeType = mimeTypeMatch[1];
          const base64Data = fileBase64.split(';base64,')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          
          if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/msword') {
            try {
              const extractor = new WordExtractor();
              const extracted = await extractor.extract(buffer);
              parts.push({ text: extracted.getBody() });
            } catch (err) {
              console.error("Error reading doc format", err);
            }
          } else if (mimeType === 'text/plain') {
            parts.push({ text: buffer.toString('utf-8') });
          } else {
            parts.push({
              inlineData: {
                data: base64Data,
                mimeType
              }
            });
          }
        }
      }

      if (parts.length === 0) {
        return res.status(400).json({ error: "Los archivos deben estar en formato base64 con el prefijo data:.../..." });
      }

      let textInstruction = "";
      
      if (role === 'auto') {
        textInstruction = `Eres un asistente experto en extracción de datos a partir de imágenes de documentos (INE, pasaporte, demandas, pagarés, etc.).
Piensa de manera lógica y analiza el documento para deducir TODAS las partes involucradas. Identifica quién es el actor, demandado, aval, endosatario u otros.

Devuelve ÚNICAMENTE un objeto JSON con la clave "parties" que contenga un arreglo de objetos con los datos de las partes encontradas.
{
  "parties": [
    {
      "role_detected": "Rol detectado (ej: 'Actor / Acreedor', 'Demandado / Deudor', 'Aval', 'Endosatario')",
      "first_name": "Nombre o nombres",
      "last_name": "Apellidos completos",
      "email": "Correo si aparece, o cadena vacía",
      "phone": "Teléfono si aparece, o cadena vacía",
      "rfc": "RFC si aparece, o cadena vacía",
      "type": "Escribe 'fisica' o 'moral'",
      "reasoning": "Breve deducción de por qué se asigna este rol"
    }
  ]
}`;
      } else {
        let roleInstruction = "del cliente principal o titular del documento.";
        if (role === 'actor') {
          roleInstruction = "del ACTOR, ACREEDOR, BENEFICIARIO, TITULAR o persona a favor de quien se emite el documento (quien cobrará o demanda).";
        } else if (role === 'demandado') {
          roleInstruction = "del DEMANDADO, DEUDOR, SUSCRIPTOR, o persona que se obliga en el documento (quien debe pagar o es demandado).";
        } else if (role === 'aval') {
          roleInstruction = "del AVAL, FIADOR, o persona que garantiza el pago en el documento (generalmente indicado como 'Aval' en un pagaré o documento mercantil).";
        } else if (role === 'endosatario') {
          roleInstruction = "del ENDOSATARIO, la persona a la que se le endosó o transmitió el documento (ya sea en procuración o en propiedad).";
        }

        textInstruction = `Eres un asistente experto en extracción de datos a partir de imágenes de documentos (INE, pasaporte, carátulas de expedientes, demandas, pagarés, etc.).
Extrae la información ${roleInstruction}
Tu objetivo es leer el documento e identificar los datos de esta figura legal específicamente.

Devuelve ÚNICAMENTE un objeto JSON con las siguientes claves. No añadas etiquetas markdown (como \`\`\`json).
{
  "first_name": "Nombre o nombres del cliente (ej. Oscar)",
  "last_name": "Apellidos completos (ej. Navarrete)",
  "email": "Correo electrónico, o cadena vacía si no hay",
  "phone": "Teléfono, o cadena vacía si no hay",
  "rfc": "RFC, o cadena vacía si no hay",
  "type": "Escribe 'fisica' si es persona física, 'moral' si es persona moral"
}`;
      }

      parts.push({
        text: textInstruction
      });

      let response;
      try {
        response = await ai.models.generateContent({
          model: GEMINI_FLASH,
          contents: [{ role: 'user', parts }],
          config: {
            temperature: 0.1,
            responseMimeType: "application/json"
          },
        });
      } catch (proError) {
        console.warn(`Fallback to ${GEMINI_FALLBACK}:`, proError);
        response = await ai.models.generateContent({
          model: GEMINI_FALLBACK,
          contents: [{ role: 'user', parts }],
          config: {
            temperature: 0.1,
            responseMimeType: "application/json"
          },
        });
      }

      const textResult = response?.text || "{}";
      const cleanJson = textResult.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const resultData = JSON.parse(cleanJson);
      
      res.json(resultData);
    } catch (err: any) {
      console.error("Gemini API Error (extract client):", err);
      res.status(500).json({ error: err.message || "Error al procesar las imágenes." });
    }
  });

  console.log("Registering /api/ai/extract-case");
  app.post("/api/ai/extract-case", authenticate, async (req: any, res) => {
    const { images, clients, lawyers } = req.body;
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "Se requiere al menos un documento en base64" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "La clave de API de Gemini no está configurada." });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });

      const parts: any[] = [];
      const WordExtractor = require("word-extractor");
      
      for (const fileBase64 of images) {
        const mimeTypeMatch = fileBase64.match(/^data:([a-zA-Z0-9+.\-\/]+);base64,/);
        if (mimeTypeMatch) {
          const mimeType = mimeTypeMatch[1];
          const base64Data = fileBase64.split(';base64,')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          
          if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/msword') {
            try {
              const extractor = new WordExtractor();
              const extracted = await extractor.extract(buffer);
              parts.push({ text: extracted.getBody() });
            } catch (err) {
              console.error("Error reading doc format", err);
            }
          } else if (mimeType === 'text/plain') {
            parts.push({ text: buffer.toString('utf-8') });
          } else {
            parts.push({
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            });
          }
        }
      }

      if (parts.length === 0) {
        return res.status(400).json({ error: "Los archivos deben estar en formato base64 con el prefijo data:.../..." });
      }

      let clientsText = "";
      if (clients && Array.isArray(clients) && clients.length > 0) {
        clientsText = "Clientes del despacho registrados en el sistema (ID y nombre completo):\n" +
          clients.map((c: any) => `- ID: ${c.id}, Nombre: ${c.name}`).join("\n") + "\n\n";
      } else {
        clientsText = "No hay Clientes registrados en el sistema actualmente.\n\n";
      }

      let lawyersText = "";
      if (lawyers && Array.isArray(lawyers) && lawyers.length > 0) {
        lawyersText = "Abogados del despacho registrados en el sistema (ID y nombre completo):\n" +
          lawyers.map((l: any) => `- ID: ${l.id}, Nombre: ${l.name}`).join("\n") + "\n\n";
      } else {
        lawyersText = "No hay Abogados registrados en el sistema actualmente.\n\n";
      }

      let textInstruction = `Eres un asistente experto en extracción de datos a partir de imágenes o textos de documentos judiciales y mercantiles (demandas, escritos, resoluciones, pagarés, etc.).
Piensa de manera lógica y analiza el documento para deducir de qué trata el asunto. TODOS LOS DATOS (TÍTULO, DESCRIPCIÓN, CLIENTE COINCIDENTE, ABOGADO ASIGNADO COINCIDENTE, TIPO DE JUICIO, NÚMERO DE EXPEDIENTE Y JUZGADO) DEBEN DESPRENDERSE EXCLUSIVAMENTE DEL ANÁLISIS DEL DOCUMENTO.

Aquí tienes los datos registrados de clientes y abogados en el sistema para que intentes emparejar o deducir las correspondencias correctas encontrando menciones directas en el expediente:
${clientsText}${lawyersText}

Reglas de Negocio para el emparejamiento:
1. Identifica el nombre de las partes actoras, demandantes, quejosos, demandadas o deudoras mencionadas en el texto legal.
2. Compara ese nombre con la lista de 'Clientes del despacho registrados'. Si encuentras un cliente que coincida por similitud de nombre o apellidos, proporciona su respectivo "client_id" (como número entero). Si no estás seguro de una coincidencia clara, déjalo nulo.
3. Identifica a los abogados autorizados, firmantes o representantes legales señalados en el documento. Compara sus nombres con la lista de 'Abogados del despacho registrados'. Si encuentras uno con coincidencia sustancial, proporciona su "lawyer_id" (como número entero). Si no hay, déjalo nulo.
4. Para "title" (Título del Caso / Expediente), redacta un título CORTO, DESCRIPTIVO E HIGIENIZADO derivado enteramente del análisis del documento (por ejemplo, 'Juicio Ejecutivo Mercantil - Oscar Navarrete', 'Juicio Civil de Reivindicación', 'Divorcio Incausado - Pérez contra Gómez', 'Amparo Indirecto - Juan Pérez', etc.). NO uses nombres de marcador de posición ni devuelvas "Título del caso (...)".
5. Para "type", clasifica el tipo seleccionando rigurosamente UNO de los siguientes valores exactos: Civil, Penal, Familiar, Laboral, Mercantil o Amparo.
6. Para "case_number", extrae el número de expediente de existir en el escrito (ej. '123/2024'). De lo contrario, déjalo vacío ("").
7. Para "court", extrae el Juzgado, Tribunal u Órgano jurisdiccional completo donde se promueve o conoce el asunto (ej. 'Juzgado Primero Civil de Saltillo'). De lo contrario, déjalo vacío ("").

Devuelve ÚNICAMENTE un objeto JSON con la estructura exacta de abajo, sin bloques markdown ni texto adicional:
{
  "cases_detected": [
    {
      "title": "Escribe el título extraído/deducido",
      "description": "Breve descripción de los hechos del documento y conflicto (máximo 2 líneas)",
      "type": "Cualquiera de los exactos: Civil, Penal, Familiar, Laboral, Mercantil, Amparo",
      "court": "Escribe juzgado completo o vacío",
      "case_number": "Escribe número de expediente o vacío",
      "client_id": null,
      "lawyer_id": null,
      "client_name": "Nombre de parte detectada",
      "lawyer_name": "Nombre de abogado detectado",
      "reasoning": "Breve deducción explicando por qué sugieres estos datos basándote en la lectura del documento"
    }
  ]
}`;

      parts.push({
        text: textInstruction
      });

      let response;
      try {
        response = await ai.models.generateContent({
          model: GEMINI_FLASH,
          contents: [{ role: 'user', parts }],
          config: {
            temperature: 0.1,
            responseMimeType: "application/json"
          },
        });
      } catch (proError) {
        console.warn(`Fallback to ${GEMINI_FALLBACK}:`, proError);
        response = await ai.models.generateContent({
          model: GEMINI_FALLBACK,
          contents: [{ role: 'user', parts }],
          config: {
            temperature: 0.1,
            responseMimeType: "application/json"
          },
        });
      }

      const textResult = response?.text || "{}";
      const cleanJson = textResult.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const resultData = JSON.parse(cleanJson);
      
      res.json(resultData);
    } catch (err: any) {
      console.error("Gemini API Error (extract case):", err);
      res.status(500).json({ error: err.message || "Error al procesar los documentos." });
    }
  });

  console.log("Registering /api/ai/audit-document");
  app.post("/api/ai/audit-document", authenticate, async (req: any, res) => {
    const { documentText, materia } = req.body;
    if (!documentText || !documentText.trim()) {
      return res.status(400).json({ error: "El texto del documento es requerido" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "La clave de API de Gemini no está configurada." });
    }

    try {
      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `
# ROL: AUDITOR FORENSE JURÍDICO SENIOR (VISIÓN DE JUEZ - ESPECIALISTA EN COAHUILA)
Actúa como un Magistrado o Juez de Distrito con 30 años de experiencia en el Poder Judicial. Tu objetivo es realizar una "Auditoría Forense Activa" de documentos legales para detectar fallos imperceptibles, sesgos cognitivos y riesgos procesales desde la perspectiva de quien dicta sentencia.

# CONTEXTO LEGAL OBLIGATORIO
1. Marco Jurídico: Constitución Política de los Estados Unidos Mexicanos, Código Civil/Penal/Procesal del Estado de Coahuila, y jurisprudencia del Tribunal Superior de Justicia de Coahuila y la SCJN.
2. Jurisdicción: Prioriza criterios de los Circuitos correspondientes a Coahuila (Octavo Circuito).

# PROTOCOLO DE AUDITORÍA (PASO A PASO)
Realiza el análisis bajo los siguientes pilares de rigor:

1. DETECCIÓN DE INCONSISTENCIAS FÁCTICAS Y LÓGICAS:
- Identifica contradicciones en la narración de los hechos (fechas, lugares, personas).
- Verifica que la "causa petendi" sea coherente con las prestaciones reclamadas.

2. ANÁLISIS JURISPRUDENCIAL Y NORMATIVO:
- Revisa si el fundamento legal es vigente. Alerta si se citan artículos derogados o leyes de otras entidades.
- Contrasta el escrito con las tesis aisladas o jurisprudencia más reciente aplicable a Coahuila.

3. IDENTIFICACIÓN DE SESGOS Y VICIOS PROCESALES:
- Detecta sesgos de confirmación o lenguaje subjetivo que debilite la fuerza probatoria.
- Evalúa riesgos de "oscuridad en la demanda" o excepciones procesales que la contraparte podría explotar.

4. CONTROL DE CALIDAD Y REDUCCIÓN DE ERRORES:
- Revisa ortografía jurídica, sintaxis y formato (uso correcto de proemio, prestaciones, hechos, pruebas y derecho).
- Sugiere mejoras en la argumentación lógica (Silogismo Jurídico: Premisa mayor, menor y conclusión).

# FORMATO DE SALIDA (REPORTE DE AUDITORÍA)
Presenta los resultados de forma ejecutiva usando formato markdown legible:
- SEMÁFORO DE RIESGO: [Verde / Amarillo / Rojo] (con emojis representativos)
- HALLAZGOS CRÍTICOS: (Lista numerada de errores graves).
- SUGERENCIAS DE BLINDAJE: (Cómo mejorar el escrito para hacerlo "inmune" a recursos de la contraparte).
- CITAS CLAVE: (Artículos específicos de la legislación de Coahuila que refuerzan el caso).
- PLAN DE ATAQUE DE LA CONTRAPARTE: (Qué excepciones o incidentes te van a interponer).

# RESTRICCIÓN:
No seas complaciente. Tu función es encontrar el error que el abogado humano pasó por alto. Si el escrito es perfecto, intenta encontrar una interpretación en contra para prevenirla.
`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: GEMINI_PRO,
          contents: `Materia: ${materia || 'Civil'}\n\nDocumento a auditar:\n${documentText}`,
          config: {
            systemInstruction,
            temperature: 0.2,
          },
        });
      } catch (proError) {
        console.warn(`Fallback to ${GEMINI_FLASH} for audit-document:`, proError);
        response = await ai.models.generateContent({
          model: GEMINI_FLASH,
          contents: `Materia: ${materia || 'Civil'}\n\nDocumento a auditar:\n${documentText}`,
          config: {
            systemInstruction,
            temperature: 0.2,
          },
        });
      }

      res.json({ result: response?.text || "No se pudo generar el reporte de auditoría." });
    } catch (err: any) {
      console.error("Gemini API Error (audit document):", err);
      res.status(500).json({ error: err.message || "Error al auditar el documento." });
    }
  });

  console.log("Registering /api/ai/shield-document");
  app.post("/api/ai/shield-document", authenticate, async (req: any, res) => {
    const { documentText, materia, auditReport } = req.body;
    if (!documentText || !documentText.trim()) {
      return res.status(400).json({ error: "El texto del documento es requerido" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "La clave de API de Gemini no está configurada." });
    }

    try {
      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `
# ROL: ARQUITECTO LEGAL SENIOR & REDACTOR EN JEFE (ESPECIALISTA EN COAHUILA)
Actúa como un proyectista experto del Tribunal Superior de Justicia de Coahuila y redactor jurídico senior. Tu tarea es recibir un escrito legal imperfecto o rústico, analizar los puntos de vulnerabilidad detectados y reconstruir por completo el escrito para entregarlo como un documento legal corregido, "blindado" y listo para firma y presentación.

Sigue rigurosamente estas reglas de construcción:
1. REDACCIÓN IMPECABLE: Emplea prosa jurídica castellana sumamente formal, solemne, rigurosa, clara y persuasiva. Remueve toda redundancia y vicio de redacción.
2. ESTRUCTURA FORMAL DE ESCRITO JUDICIAL MEXICANO:
   - PROEMIO: Identificación formal del promovente (con espacios/llaves claros para completar datos faltantes como [___NOMBRE_ACTOR___]), personalidad jurídica con la que promueve, domicilio para oír y recibir notificaciones, personas autorizadas para recibir documentos y notificaciones.
   - PRESTACIONES: Listadas numéricamente con absoluta precisión y consistencia jurídica.
   - HECHOS: Organizados de manera cronológica y enumerada (HECHO 1, HECHO 2, etc.), detallando estrictamente circunstancias de tiempo, modo y lugar para tapar cualquier excepción de "oscuridad o defecto en la demanda".
   - CAPÍTULO DE PRUEBAS: Organizado de forma que cada medio probatorio ofrecido (documentales, testimoniales, confesionales, etc.) se relacione directamente con el hecho o hechos de forma exacta (conforme al Código de Procedimientos Civiles u ordenamiento respectivo en Coahuila).
   - CAPÍTULO DE DERECHO: Fundamentación constitucional federal rigurosa (Artículos 1, 8, 14, 16, 17 constitutivos) y los artículos vigentes específicos de la legislación aplicable del Estado de Coahuila (dependiendo de la materia seleccionada: Civil, Mercantil, Penal, Familiar, Amparo).
   - PETITORIOS: Las solicitudes conclusivas al Juez redactadas con respeto y protocolo formal (ej., "PRIMERO.- Tener por presentado...", "SEGUNDO.- Dar curso...").
   - PROTESTO LO NECESARIO: Cláusula de cierre solemne al final del escrito, centrada, con espacio suficiente para la firma autógrafa del promovente y de sus abogados patronos autorizados.

3. BLINDAJE PROCESAL (INMUNE A EXCEPCIONES):
   - Redáctalo cubriendo todas las objeciones que la contraparte o el propio juzgador de Coahuila pudieran interponer.
   - Enlaza sutilmente argumentos lógicos (Silogismo Jurídico) de las premisas con la fundamentación procesal y las jurisprudencias vigentes del Octavo Circuito (Coahuila) para que se lea sustantivo y contundente.

4. PREVENCIONES Y HIGIENIZACIÓN:
   - Si detectas que faltan datos clave (fechas, firmas, nombres, juzgado específico), coloca marcadores legibles y visuales resaltados en llaves o corchetes claros (ej., "[___NÚMERO_DE_EXPEDIENTE___]", "[___JUZGADO_DE_ORIGEN___]", "[___MONTO_RECLAMADO___]") para que el usuario sepa que los debe rellenar.

Devuelve ÚNICAMENTE el texto completo del escrito corregido estructurado y listo. No pongas bloques de código markdown de triple comilla (\`\`\`) alrededor del texto, devuélvelo como texto plano listo con saltos de línea hermosos y ordenados.
`;

      const contents = `Materia: ${materia || 'Civil'}\n\n` +
        `Reporte de Auditoría Previa (Úsalo como base de correcciones):\n${auditReport || 'No disponible'}\n\n` +
        `Escrito Original a Corregir y Blindar:\n${documentText}`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: GEMINI_PRO,
          contents,
          config: {
            systemInstruction,
            temperature: 0.2,
          },
        });
      } catch (proError) {
        console.warn(`Fallback to ${GEMINI_FLASH} for shield-document:`, proError);
        response = await ai.models.generateContent({
          model: GEMINI_FLASH,
          contents,
          config: {
            systemInstruction,
            temperature: 0.2,
          },
        });
      }

      res.json({ shieldedText: response?.text || "No se pudo generar el escrito blindado." });
    } catch (err: any) {
      console.error("Gemini API Error (shield document):", err);
      res.status(500).json({ error: err.message || "Error al blindar el escrito legal." });
    }
  });

  console.log("Registering /api/ai/classify-document");
  app.post("/api/ai/classify-document", authenticate, async (req: any, res) => {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "El texto del documento es requerido" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({ type: "Documento General", tags: ["General"] });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Analiza el siguiente texto extraído de un documento legal y determina su tipo y las etiquetas más relevantes.

Texto del documento:
"${text.substring(0, 3000)}"

Devuelve ÚNICAMENTE un objeto JSON con la siguiente estructura (sin formato Markdown adicional):
{
  "type": "Tipo de documento (ej. Demanda, Sentencia, Contrato, Pagaré, Prueba, etc.)",
  "tags": ["etiqueta1", "etiqueta2", "etiqueta3"]
}`;

      const response = await ai.models.generateContent({
        model: GEMINI_FLASH,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const cleanJson = (response.text || "{}").replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleanJson);
      res.json(parsed);
    } catch (err: any) {
      console.error("Gemini API Error (classify document):", err);
      res.json({ type: "Documento General", tags: ["General"] });
    }
  });

  console.log("Registering /api/ai/ocr-analyze");
  app.post("/api/ai/ocr-analyze", authenticate, async (req: any, res) => {
    const { fileData, mimeType } = req.body;
    if (!fileData || !mimeType) {
      return res.status(400).json({ error: "fileData y mimeType son requeridos" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "La clave de API de Gemini no está configurada." });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Actúa como un Auditor Forense Jurídico Senior (Especialista en Coahuila) y experto en OCR.
Realiza las siguientes tareas con el documento o imagen proporcionada:
1. **EXTRACCIÓN DE TEXTO (OCR):** Transcribe con la mayor precisión posible todo el texto visible en el documento.
2. **IDENTIFICACIÓN:** Identifica de qué tipo de documento legal, escrito, demanda o evidencia se trata.
3. **ANÁLISIS FORENSE:** Proporciona un análisis detallado de su contenido, detectando posibles riesgos, inconsistencias fácticas o lógicas.
4. **BLINDAJE JURÍDICO:** Ofrece sugerencias de blindaje jurídico aplicables al Estado de Coahuila (Octavo Circuito).

Presenta tu respuesta estructurada con encabezados claros (usa Markdown).`;

      const response = await ai.models.generateContent({
        model: GEMINI_PRO,
        contents: {
          parts: [
            {
              inlineData: {
                data: fileData,
                mimeType: mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      });

      res.json({ result: response.text || "No se pudo generar un análisis." });
    } catch (err: any) {
      console.error("Gemini API Error (ocr analyze):", err);
      res.status(500).json({ error: err.message || "Error al analizar el documento." });
    }
  });

  app.put("/api/auth/password", authenticate, (req: any, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "La contraseña actual y la nueva son requeridas" });
    }

    const user: any = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
    
    if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(401).json({ error: "La contraseña actual es incorrecta" });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, req.user.id);
    
    db.prepare("INSERT INTO audit_logs (action, user_id, entity) VALUES (?, ?, ?)").run("CHANGE_PASSWORD", req.user.id, "auth");
    
    res.json({ success: true, message: "Contraseña actualizada exitosamente" });
  });

  // Dashboard Stats
  app.get("/api/stats", authenticate, (req: any, res) => {
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
    const totalCases = db.prepare("SELECT COUNT(*) as count FROM cases").get().count;
    const pendingTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status != 'completada'").get().count;
    const completedPayments = db.prepare("SELECT COUNT(*) as count FROM payments WHERE status = 'completado' AND is_expense = 0").get().count;
    const totalDocuments = db.prepare("SELECT COUNT(*) as count FROM documents").get().count;
    
    const incomeObj = db.prepare("SELECT SUM(amount) as total FROM payments WHERE status = 'completado' AND is_expense = 0").get();
    const expenseObj = db.prepare("SELECT SUM(amount) as total FROM payments WHERE status = 'completado' AND is_expense = 1").get();
    const income = incomeObj.total || 0;
    const expenses = expenseObj.total || 0;
    const balance = income - expenses;

    const recentActivity = db.prepare(`
      SELECT a.*, u.name as user_name 
      FROM audit_logs a 
      JOIN users u ON a.user_id = u.id 
      ORDER BY timestamp DESC LIMIT 10
    `).all();

    const settingsRows = db.prepare("SELECT key, value FROM system_settings").all() as any[];
    const settings = settingsRows.reduce((acc, row) => ({...acc, [row.key]: row.value}), {});

    res.json({
      kpis: { 
        totalUsers, 
        totalCases, 
        pendingTasks, 
        completedPayments, 
        totalDocuments,
        income,
        expenses,
        balance
      },
      recentActivity,
      settings
    });
  });

  app.post("/api/settings", authenticate, (req: any, res) => {
    const { key, value } = req.body;
    db.prepare("INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
    res.json({ success: true });
  });

  // Clients
  app.get("/api/clients", authenticate, (req, res) => {
    const clients = db.prepare("SELECT * FROM clients").all();
    res.json(clients);
  });

  app.post("/api/clients", authenticate, (req: any, res) => {
    const { first_name, last_name, email, phone, rfc, type } = req.body;
    const result = db.prepare("INSERT INTO clients (first_name, last_name, email, phone, rfc, type) VALUES (?, ?, ?, ?, ?, ?)").run(
      first_name, last_name, email, phone, rfc, type
    );
    db.prepare("INSERT INTO audit_logs (action, user_id, entity) VALUES (?, ?, ?)").run("CREATE_CLIENT", req.user.id, "clients");
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/clients/:id", authenticate, (req: any, res) => {
    const { id } = req.params;
    const { first_name, last_name, email, phone, rfc, type } = req.body;
    db.prepare("UPDATE clients SET first_name = ?, last_name = ?, email = ?, phone = ?, rfc = ?, type = ? WHERE id = ?").run(
      first_name, last_name, email, phone, rfc, type, id
    );
    db.prepare("INSERT INTO audit_logs (action, user_id, entity) VALUES (?, ?, ?)").run(`UPDATE_CLIENT`, req.user.id, `clients`);
    res.json({ success: true });
  });

  app.delete("/api/clients/:id", authenticate, (req: any, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM clients WHERE id = ?").run(id);
    db.prepare("INSERT INTO audit_logs (action, user_id, entity) VALUES (?, ?, ?)").run(`DELETE_CLIENT`, req.user.id, `clients`);
    res.json({ success: true });
  });

  // Cases
  app.get("/api/cases", authenticate, (req: any, res) => {
    let cases;
    if (req.user.role === 'admin') {
      cases = db.prepare(`
        SELECT c.*, cl.first_name || ' ' || cl.last_name as client_name, u.name as lawyer_name 
        FROM cases c 
        LEFT JOIN clients cl ON c.client_id = cl.id 
        LEFT JOIN users u ON c.lawyer_id = u.id
      `).all();
    } else if (req.user.role === 'abogado') {
      cases = db.prepare(`
        SELECT c.*, cl.first_name || ' ' || cl.last_name as client_name, u.name as lawyer_name 
        FROM cases c 
        LEFT JOIN clients cl ON c.client_id = cl.id 
        LEFT JOIN users u ON c.lawyer_id = u.id
        WHERE c.lawyer_id = ?
      `).all(req.user.id);
    } else {
      cases = db.prepare(`
        SELECT c.*, cl.first_name || ' ' || cl.last_name as client_name, u.name as lawyer_name 
        FROM cases c 
        LEFT JOIN clients cl ON c.client_id = cl.id 
        LEFT JOIN users u ON c.lawyer_id = u.id
        WHERE cl.email = ?
      `).all(req.user.email);
    }
    res.json(cases);
  });

  app.post("/api/cases", authenticate, (req: any, res) => {
    const { title, description, client_id, lawyer_id, type, court, case_number } = req.body;
    const result = db.prepare("INSERT INTO cases (title, description, client_id, lawyer_id, type, court, case_number) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      title, description, client_id, lawyer_id, type, court, case_number
    );
    db.prepare("INSERT INTO audit_logs (action, user_id, entity) VALUES (?, ?, ?)").run("CREATE_CASE", req.user.id, "cases");
    res.json({ id: result.lastInsertRowid });
  });

  // Tasks
  app.get("/api/tasks", authenticate, (req: any, res) => {
    const tasks = db.prepare(`
      SELECT t.*, c.title as case_title, u.name as assigned_name 
      FROM tasks t 
      LEFT JOIN cases c ON t.case_id = c.id 
      LEFT JOIN users u ON t.assigned_to = u.id
    `).all();
    res.json(tasks);
  });

  app.post("/api/tasks", authenticate, (req: any, res) => {
    const { title, description, case_id, assigned_to, priority, due_date } = req.body;
    const result = db.prepare("INSERT INTO tasks (title, description, case_id, assigned_to, priority, due_date) VALUES (?, ?, ?, ?, ?, ?)").run(
      title, description, case_id, assigned_to, priority, due_date
    );
    db.prepare("INSERT INTO audit_logs (action, user_id, entity) VALUES (?, ?, ?)").run("CREATE_TASK", req.user.id, "tasks");
    res.json({ id: result.lastInsertRowid });
  });

  // Messages
  app.get("/api/messages", authenticate, (req: any, res) => {
    const { case_id } = req.query;
    if (case_id) {
      const messages = db.prepare(`
        SELECT m.*, u.name as sender_name, u.role as sender_role
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE m.case_id = ?
        ORDER BY m.created_at ASC
      `).all(case_id);
      return res.json(messages);
    }
    const messages = db.prepare(`
      SELECT m.*, u.name as sender_name, u.role as sender_role, c.title as case_title
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      LEFT JOIN cases c ON m.case_id = c.id
      ORDER BY m.created_at ASC
    `).all();
    res.json(messages);
  });

  app.post("/api/messages", authenticate, (req: any, res) => {
    const { case_id, content } = req.body;
    if (!case_id || !content || !content.trim()) {
      return res.status(400).json({ error: "Expediente y mensaje son requeridos" });
    }
    const result = db.prepare("INSERT INTO messages (case_id, sender_id, content) VALUES (?, ?, ?)").run(
      case_id, req.user.id, content.trim()
    );
    db.prepare("INSERT INTO audit_logs (action, user_id, entity) VALUES (?, ?, ?)").run("SEND_MESSAGE", req.user.id, "messages");
    res.json({ id: result.lastInsertRowid });
  });

  // Payments
  app.get("/api/payments", authenticate, (req, res) => {
    const payments = db.prepare(`
      SELECT p.*, c.title as case_title, cl.first_name || ' ' || cl.last_name as client_name 
      FROM payments p 
      LEFT JOIN cases c ON p.case_id = c.id 
      LEFT JOIN clients cl ON p.client_id = cl.id
    `).all();
    res.json(payments);
  });

  app.post("/api/payments", authenticate, (req: any, res) => {
    const { case_id, client_id, amount, concept, type, method, reference, notes } = req.body;
    const result = db.prepare("INSERT INTO payments (case_id, client_id, amount, concept, type, method, reference, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
      case_id || null, client_id || null, amount, concept, type, method, reference, notes, 'completado'
    );
    
    // Detailed Audit Log
    const caseTitle = case_id ? (db.prepare("SELECT title FROM cases WHERE id = ?").get(case_id) as any)?.title : "Desconocido";
    db.prepare("INSERT INTO audit_logs (action, user_id, entity) VALUES (?, ?, ?)").run(
      `REGISTRO_PAGO_MANUAL: $${amount} MXN para ${caseTitle || 'Desconocido'} vía ${method}`, 
      req.user.id, 
      "payments"
    );
    
    res.json({ id: result.lastInsertRowid });
  });

  // Stripe Initiation Endpoint
  app.post("/api/payments/stripe/init", authenticate, async (req: any, res) => {
    try {
      const { case_id, amount } = req.body;
      const caseTitle = case_id ? (db.prepare("SELECT title FROM cases WHERE id = ?").get(case_id) as any)?.title : "Servicios Legales";
      
      db.prepare("INSERT INTO audit_logs (action, user_id, entity) VALUES (?, ?, ?)").run(
        `INICIO_PAGO_STRIPE: $${amount} MXN para ${caseTitle || 'Desconocido'}`, 
        req.user.id, 
        "payments"
      );
      
      const stripe = getStripe();
      const origin = process.env.APP_URL || req.headers.origin || 'http://localhost:3000';
      
      // Create a pending payment record
      const result = db.prepare("INSERT INTO payments (case_id, client_id, amount, concept, type, method, reference, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
        case_id || null, null, amount, `Pago por ${caseTitle}`, 'stripe', 'tarjeta', null, 'Iniciado vía Stripe', 'pendiente'
      );
      const paymentId = result.lastInsertRowid;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'mxn',
              product_data: {
                name: `Pago: ${caseTitle}`,
              },
              unit_amount: Math.round(amount * 100), // Stripe expects cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${origin}/payments?success=true&session_id={CHECKOUT_SESSION_ID}&payment_id=${paymentId}`,
        cancel_url: `${origin}/payments?canceled=true`,
        metadata: {
          payment_id: paymentId.toString(),
          case_id: case_id ? case_id.toString() : '',
          user_id: req.user.id.toString()
        }
      });
      
      res.json({ success: true, url: session.url });
    } catch (error: any) {
      console.error("Stripe error:", error);
      res.status(500).json({ error: error.message || "Error al iniciar el pago con Stripe" });
    }
  });

  // Stripe Confirmation Endpoint
  app.post("/api/payments/stripe/confirm", authenticate, async (req: any, res) => {
    try {
      const { session_id, payment_id } = req.body;
      if (!session_id || !payment_id) {
        return res.status(400).json({ error: "Faltan parámetros" });
      }
      
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(session_id);
      
      if (session.payment_status === 'paid') {
        db.prepare("UPDATE payments SET status = 'completado', reference = ? WHERE id = ?").run(
          session.payment_intent as string || session.id, payment_id
        );
        
        db.prepare("INSERT INTO audit_logs (action, user_id, entity) VALUES (?, ?, ?)").run(
          `PAGO_STRIPE_COMPLETADO: Pago ID ${payment_id} confirmado`, 
          req.user.id, 
          "payments"
        );
        
        res.json({ success: true });
      } else {
        res.json({ success: false, status: session.payment_status });
      }
    } catch (error: any) {
      console.error("Stripe confirm error:", error);
      res.status(500).json({ error: error.message || "Error al confirmar el pago" });
    }
  });

  // Transfer Info Audit Log
  app.post("/api/payments/transfer/log", authenticate, (req: any, res) => {
    const { case_id, amount } = req.body;
    const caseTitle = case_id ? (db.prepare("SELECT title FROM cases WHERE id = ?").get(case_id) as any)?.title : "Desconocido";
    
    db.prepare("INSERT INTO audit_logs (action, user_id, entity) VALUES (?, ?, ?)").run(
      `SOLICITUD_DATOS_TRANSFERENCIA: $${amount} MXN para ${caseTitle || 'Desconocido'} (SPIN by OXXO)`, 
      req.user.id, 
      "payments"
    );
    
    res.json({ success: true });
  });

  app.get("/api/lawyers", authenticate, (req, res) => {
    const lawyers = db.prepare("SELECT id, name, email, role FROM users WHERE role IN ('abogado', 'admin')").all();
    res.json(lawyers);
  });

  // Users Management (Admin)
  app.get("/api/admin/users", authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const users = db.prepare("SELECT id, name, email, role, created_at FROM users").all();
    res.json(users);
  });

  app.patch("/api/admin/users/:id/role", authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const { role } = req.body;
    db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, req.params.id);
    db.prepare("INSERT INTO audit_logs (action, user_id, entity) VALUES (?, ?, ?)").run("UPDATE_USER_ROLE", req.user.id, "users");
    res.json({ success: true });
  });

  // Audit Logs (Admin)
  app.get("/api/admin/audit", authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const logs = db.prepare(`
      SELECT a.*, u.name as user_name 
      FROM audit_logs a 
      LEFT JOIN users u ON a.user_id = u.id 
      ORDER BY timestamp DESC
    `).all();
    res.json(logs);
  });

  // Documents & AI Classification
  app.post("/api/documents/extract-text", authenticate, async (req: any, res) => {
    try {
      const { content, isBase64, mimeType } = req.body;
      let extractedText = "";

      if (isBase64) {
        try {
          const buffer = Buffer.from(content, 'base64');
          if (mimeType === 'application/pdf') {
            const pdfData = await pdfParse(buffer);
            extractedText = pdfData.text;
          } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/msword') {
            const result = await mammoth.extractRawText({ buffer });
            extractedText = result.value;
          } else {
            extractedText = "Formato no soportado para extracción de texto.";
          }
        } catch (err) {
          console.error("Error extracting text from file:", err);
          extractedText = "Error al extraer el texto del archivo.";
        }
      } else {
        extractedText = content; // Raw pasted text
      }
      
      res.json({ text: extractedText });
    } catch (error: any) {
      console.error("Text extraction error:", error);
      res.status(500).json({ error: "Error al extraer texto" });
    }
  });

  app.post("/api/documents/upload", authenticate, async (req: any, res) => {
    try {
      const { name, size, case_id, tags, type } = req.body;
      
      const tagsString = JSON.stringify(tags || []);

      const result = db.prepare("INSERT INTO documents (name, size, case_id, tags, author_id) VALUES (?, ?, ?, ?, ?)").run(
        name, size, case_id || null, tagsString, req.user.id
      );
      
      db.prepare("INSERT INTO audit_logs (action, user_id, entity) VALUES (?, ?, ?)").run("UPLOAD_DOCUMENT", req.user.id, "documents");
      
      res.json({ 
        id: result.lastInsertRowid,
        name,
        tags: tags || [],
        type: type || "Documento General"
      });

    } catch (error: any) {
      console.error("Document upload error:", error);
      res.status(500).json({ error: "Error al procesar el documento" });
    }
  });

  app.get("/api/documents", authenticate, (req: any, res) => {
    const documents = db.prepare(`
      SELECT d.*, c.title as case_title, u.name as author_name 
      FROM documents d 
      LEFT JOIN cases c ON d.case_id = c.id 
      LEFT JOIN users u ON d.author_id = u.id
      ORDER BY d.created_at DESC
    `).all();
    
    // Parse tags back to array
    const parsedDocs = documents.map((doc: any) => ({
      ...doc,
      tags: doc.tags ? JSON.parse(doc.tags) : []
    }));
    
    res.json(parsedDocs);
  });

  app.delete("/api/documents/:id", authenticate, (req: any, res) => {
    db.prepare("DELETE FROM documents WHERE id = ?").run(req.params.id);
    db.prepare("INSERT INTO audit_logs (action, user_id, entity) VALUES (?, ?, ?)").run("DELETE_DOCUMENT", req.user.id, "documents");
    res.json({ success: true });
  });

  // Template Library APIs
  app.get("/api/templates", authenticate, (req: any, res) => {
    try {
      const templates = db.prepare("SELECT * FROM document_templates ORDER BY created_at DESC").all();
      const parsedTemplates = templates.map((t: any) => ({
        ...t,
        placeholders: t.placeholders ? JSON.parse(t.placeholders) : []
      }));
      res.json(parsedTemplates);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ error: "Error al recuperar las plantillas" });
    }
  });

  app.post("/api/templates", authenticate, (req: any, res) => {
    try {
      const { title, description, content, placeholders, materia } = req.body;
      if (!title || !content) {
        return res.status(400).json({ error: "El título y el contenido son requeridos" });
      }
      
      const placeholdersStr = JSON.stringify(placeholders || []);
      const result = db.prepare(`
        INSERT INTO document_templates (title, description, content, placeholders, materia)
        VALUES (?, ?, ?, ?, ?)
      `).run(title, description, content, placeholdersStr, materia || "Civil");

      db.prepare("INSERT INTO audit_logs (action, user_id, entity) VALUES (?, ?, ?)").run("CREATE_TEMPLATE", req.user.id, "templates");

      res.json({
        id: result.lastInsertRowid,
        title,
        description,
        content,
        placeholders: placeholders || [],
        materia: materia || "Civil"
      });
    } catch (error: any) {
      console.error("Error creating template:", error);
      res.status(500).json({ error: "Error al crear la plantilla de documento" });
    }
  });

  app.put("/api/templates/:id", authenticate, (req: any, res) => {
    try {
      const { title, description, content, placeholders, materia } = req.body;
      const { id } = req.params;
      if (!title || !content) {
        return res.status(400).json({ error: "El título y el contenido son requeridos" });
      }

      const placeholdersStr = JSON.stringify(placeholders || []);
      db.prepare(`
        UPDATE document_templates 
        SET title = ?, description = ?, content = ?, placeholders = ?, materia = ?
        WHERE id = ?
      `).run(title, description, content, placeholdersStr, materia, id);

      db.prepare("INSERT INTO audit_logs (action, user_id, entity) VALUES (?, ?, ?)").run("UPDATE_TEMPLATE", req.user.id, "templates");

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating template:", error);
      res.status(500).json({ error: "Error al actualizar la plantilla" });
    }
  });

  app.delete("/api/templates/:id", authenticate, (req: any, res) => {
    try {
      db.prepare("DELETE FROM document_templates WHERE id = ?").run(req.params.id);
      db.prepare("INSERT INTO audit_logs (action, user_id, entity) VALUES (?, ?, ?)").run("DELETE_TEMPLATE", req.user.id, "templates");
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting template:", error);
      res.status(500).json({ error: "Error al eliminar la plantilla" });
    }
  });

  app.post("/api/templates/generate", authenticate, async (req: any, res) => {
    const { templateId, client_id, case_id, additionalInstructions, manualPlaceholders } = req.body;
    
    if (!templateId) {
      return res.status(400).json({ error: "Se requiere un ID de plantilla válido" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "La clave de API de Gemini no está configurada." });
    }

    try {
      const template = db.prepare("SELECT * FROM document_templates WHERE id = ?").get(templateId);
      if (!template) {
        return res.status(404).json({ error: "La plantilla no fue encontrada" });
      }

      let clientInfo: any = null;
      let caseInfo: any = null;

      if (client_id) {
        clientInfo = db.prepare("SELECT * FROM clients WHERE id = ?").get(client_id);
      }
      if (case_id) {
        caseInfo = db.prepare("SELECT * FROM cases WHERE id = ?").get(case_id);
      }

      let draftContent = template.content;
      const placeholdersDict: Record<string, string> = { ...(manualPlaceholders || {}) };

      if (clientInfo) {
        const clientFullName = `${clientInfo.first_name} ${clientInfo.last_name}`;
        placeholdersDict["client_name"] = placeholdersDict["client_name"] || clientFullName;
        placeholdersDict["nombre_cliente"] = placeholdersDict["nombre_cliente"] || clientFullName;
        placeholdersDict["arrendador_name"] = placeholdersDict["arrendador_name"] || clientFullName;
        placeholdersDict["arrendatario_name"] = placeholdersDict["arrendatario_name"] || clientFullName;
        placeholdersDict["actor_name"] = placeholdersDict["actor_name"] || clientFullName;
        placeholdersDict["deudor_name"] = placeholdersDict["deudor_name"] || clientFullName;
        placeholdersDict["demandado_name"] = placeholdersDict["demandado_name"] || clientFullName;
        
        placeholdersDict["client_email"] = placeholdersDict["client_email"] || clientInfo.email;
        placeholdersDict["email_cliente"] = placeholdersDict["email_cliente"] || clientInfo.email;
        placeholdersDict["client_phone"] = placeholdersDict["client_phone"] || clientInfo.phone;
        placeholdersDict["telefono_cliente"] = placeholdersDict["telefono_cliente"] || clientInfo.phone;
        placeholdersDict["client_rfc"] = placeholdersDict["client_rfc"] || clientInfo.rfc;
        placeholdersDict["rfc_cliente"] = placeholdersDict["rfc_cliente"] || clientInfo.rfc;
      }

      if (caseInfo) {
        placeholdersDict["case_title"] = placeholdersDict["case_title"] || caseInfo.title;
        placeholdersDict["titulo_caso"] = placeholdersDict["titulo_caso"] || caseInfo.title;
        placeholdersDict["case_number"] = placeholdersDict["case_number"] || caseInfo.case_number;
        placeholdersDict["numero_caso"] = placeholdersDict["numero_caso"] || caseInfo.case_number;
        placeholdersDict["court"] = placeholdersDict["court"] || caseInfo.court;
        placeholdersDict["juzgado"] = placeholdersDict["juzgado"] || caseInfo.court;
        placeholdersDict["juzgado_ciudad"] = placeholdersDict["juzgado_ciudad"] || caseInfo.court;
        placeholdersDict["ciudad_ejecucion"] = placeholdersDict["ciudad_ejecucion"] || caseInfo.court;
      }

      const today = new Date().toLocaleDateString('es-MX', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      placeholdersDict["current_date"] = placeholdersDict["current_date"] || today;
      placeholdersDict["fecha_actual"] = placeholdersDict["fecha_actual"] || today;

      // Handle replacements
      Object.keys(placeholdersDict).forEach((key) => {
        const val = placeholdersDict[key] || "";
        const cleanKey = key.replace(/[{}]/g, "");
        const regexStr = `\\{\\{\\s*${cleanKey}\\s*\\}\\}`;
        const regex = new RegExp(regexStr, "gi");
        draftContent = draftContent.replace(regex, val);
      });

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "lexmarcorp-ai-studio"
          }
        }
      });

      const systemInstruction = `
# ROL: CO-ABOGADO REDACTOR Y PROYECTISTA JUDICIAL SENIOR (COAHUILA, MÉXICO)
Eres un proyectista judicial senior en México. Tu especialidad es redactar escritos jurídicos solemnes, limpios, legibles, técnicamente inatacables y listos para su presentación judicial o firmas de clientes de conformidad con la legislación de Coahuila de Zaragoza y de la República Mexicana.

Tu tarea es tomar una plantilla preimpresa de documento legal con algunos placeholders rellenados, y **enriquecerla** para generar el redactado definitivo.

# DIRECTRICES DE GENERACIÓN:
1. FORMALIDAD EXTREMA: Utiliza un lenguaje sumamente respetuoso, formal, preciso y con adecuada terminología legal en español (proemio, proemio formal, hechos correlativos, petitorios redactados).
2. FLUIDEZ Y DETALLES: No realices simplemente una sustitución ciega de texto. Redactas párrafos completos, cláusulas con estructura lógica-jurídica, y fundamentas legalmente según corresponda a la materia:
   - Materia Familiar: Código Civil y Código de Procedimientos Familiares del Estado de Coahuila de Zaragoza.
   - Materia Civil: Código Civil de Coahuila.
   - Materia Mercantil: Código de Comercio Mexicano y Ley General de Títulos y Operaciones de Crédito (LGTOC) para pagarés.
3. ESPACIOS COMODÍN: Si detectas que se omitió información o que hay placeholders vacíos (como firmas de testigos u otros que no se enviaron), inserta corchetes legibles para que el abogado pueda rellenarlos manualmente, por ejemplo: [___NOMBRE_DE_TESTIGO___] o [___FECHA_Y_LUGAR___]. No inventes datos ficticios que cambien la identidad, mantén coherencia.
4. RESPUESTA LIMPIA: Devuelve ÚNICAMENTE la propuesta de escrito redactada para que el usuario pueda copiarla directamente o crear un documento a partir de ella. No agregues saludos, explicaciones, notas introductorias, ni encierres la respuesta en bloques de código JSON o markdown a menos que uses formato limpio de markdown para títulos y negritas. No repitas el título del proemio dos veces de forma innecesaria.
`;

      const prompt = `
Plantilla del documento original:
${template.content}

Texto borrador pre-llenado con datos del expediente:
${draftContent}

Instrucciones particulares adicionales del abogado:
${additionalInstructions || "Redactar el documento de manera completa, con un formato elegante, agregando el sustento legal correlativo para efectos de darle mayor robustez jurídica."}

Por favor, redacta el borrador definitivo con formalidad profesional:
`;

      const response = await ai.models.generateContent({
        model: GEMINI_FLASH,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.3,
        }
      });

      const generatedDraft = response.text || draftContent;

      db.prepare("INSERT INTO audit_logs (action, user_id, entity) VALUES (?, ?, ?)").run("GENERATE_DRAFT", req.user.id, "templates");

      res.json({
        success: true,
        originalTemplateTitle: template.title,
        materia: template.materia,
        prefilledContent: draftContent,
        generatedDraft
      });

    } catch (error: any) {
      console.error("Error generating legal draft:", error);
      res.status(500).json({ error: "Error de IA al generar el escrito: " + error.message });
    }
  });

  // DUELO PROCESAL: Cruce de Demanda vs Contestación + Fijación de Litis + Pliego de Posiciones e Interrogatorios
  app.post("/api/ai/duelo-procesal", authenticate, async (req: any, res) => {
    try {
      const { 
        caseId, 
        materia = "Mercantil", 
        rolUsuario = "actor", 
        textoDemanda, 
        textoContestacion, 
        instruccionesExtra,
        expediente = "",
        juzgado = "",
        partes = ""
      } = req.body;

      if (!textoDemanda || !textoContestacion) {
        return res.status(400).json({ error: "Debes proporcionar tanto el texto de la Demanda como el de la Contestación." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "API Key de Gemini no configurada en el servidor." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "lexmarcorp-ai-studio"
          }
        }
      });

      const systemInstruction = `
# ROL: ESTRATEGA PROCESAL LITIGANTE SENIOR Y PROYECTISTA JUDICIAL MEXICANO (LEXMARCORP IQ)
Eres una eminencia en derecho procesal mexicano (materia mercantil, civil, familiar y laboral).
Tu especialidad es el análisis forense de la Litis: confrontar la Demanda inicial contra la Contestación de demanda, determinar la distribución exacta de la carga probatoria (Onus Probandi según los Arts. 1194 al 1196 del Código de Comercio o Códigos Procesales Civiles), descubrir contradicciones, desarticular excepciones de la contraria y diseñar el armamento probatorio perfecto:
1. Posiciones confesionales que acorralen al absolvente (redactadas en sentido afirmativo, claras, precisas, no insidiosas, sin contener más de un hecho).
2. Preguntas testimoniales incisivas e idóneas para acreditar hechos controvertidos directos.
3. Memorial formal en formato judicial mexicano listo para presentar ante el juzgado.

# FORMATO DE SALIDA ESTRICTO:
Debes responder ÚNICAMENTE con un objeto JSON válido (sin envoltorios markdown, sin comillas triples \`\`\`json, solo JSON crudo parseable) con la siguiente estructura exacta:
{
  "resumenLitis": "Síntesis ejecutiva de la controversia principal y el núcleo de la disputa...",
  "hechosControvertidos": [
    {
      "numero": 1,
      "descripcion": "Descripción del hecho controvertido...",
      "posturaActor": "Qué sostiene el actor...",
      "posturaDemandado": "Qué niega o alega el demandado...",
      "cargaProbatoria": "Actor" | "Demandado",
      "fundamentoCarga": "Art. 1194 Código de Comercio (El que afirma está obligado a probar)...",
      "nivelRiesgo": "alto" | "medio" | "bajo"
    }
  ],
  "hechosAdmitidosOConfesos": [
    {
      "numero": 1,
      "descripcion": "Hecho que no fue controvertido, fue admitido expresamente o por falta de contestación específica...",
      "impactoProcesal": "Relevancia probatoria a favor del litigante..."
    }
  ],
  "excepcionesDetectadas": [
    {
      "nombre": "Nombre de la excepción (ej. Pago, Prescripción, Incompetencia, Falta de Legitimación, Sine Actione Agis)...",
      "argumentoContraria": "Qué argumenta la contraparte...",
      "estrategiaDesvirtuacion": "Estrategia jurídica para impugnarla y destruirla en juicio...",
      "probabilidadExitoContraria": "alta" | "media" | "baja"
    }
  ],
  "pliegoPosicionesConfesional": [
    {
      "numero": 1,
      "posicion": "Que diga el absolvente si es cierto como lo es que con fecha...",
      "objetivoProcesal": "Qué confesión o ventaja procesal se busca obtener con esta posición...",
      "hechoRelacionado": 1
    }
  ],
  "interrogatorioTestigos": [
    {
      "numero": 1,
      "pregunta": "Que diga el testigo si sabe y le consta...",
      "objetivoProcesal": "Acreditar el modo, tiempo o lugar del hecho controvertido...",
      "razonDeSuDicho": "Pregunta de control obligatoria"
    }
  ],
  "escritoJudicialWord": "Texto completo y solemne del PLIEGO DE POSICIONES en formato judicial oficial mexicano, con Proemio formal (Juzgado, Expediente, Partes), Pliego de Posiciones articuladas y numeradas, Pliego de Preguntas para Testigos, y Calce de firmas con 'PROTESTO LO NECESARIO'."
}
`;

      const prompt = `
MATERIA PROCESAL: ${materia}
ROL DE NUESTRO CLIENTE: ${rolUsuario.toUpperCase()}
DATOS DEL JUICIO:
- Expediente: ${expediente || "EN TRÁMITE"}
- Juzgado: ${juzgado || "JUZGADO DE PRIMERA INSTANCIA"}
- Partes: ${partes || "ACTOR VS DEMANDADO"}

TEXTO DE LA DEMANDA (O HECHOS DEL ACTOR):
"""
${textoDemanda}
"""

TEXTO DE LA CONTESTACIÓN, DEFENSAS Y EXCEPCIONES:
"""
${textoContestacion}
"""

INSTRUCCIONES ADICIONALES DEL ABOGADO:
${instruccionesExtra || "Enfocar el interrogatorio en obtener confesión expresa de los hechos medulares y desarmar las excepciones opuestas."}

Realiza el cruce forense de la litis y devuelve ÚNICAMENTE el objeto JSON requerido.
`;

      const response = await ai.models.generateContent({
        model: GEMINI_FLASH,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.2,
        }
      });

      let rawText = response.text || "{}";
      // Limpiar posibles bloques markdown ```json ... ```
      rawText = rawText.trim();
      if (rawText.startsWith("```json")) {
        rawText = rawText.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (rawText.startsWith("```")) {
        rawText = rawText.replace(/^```/, "").replace(/```$/, "").trim();
      }

      let parsedResult;
      try {
        parsedResult = JSON.parse(rawText);
      } catch (parseErr) {
        console.error("Error parsing Gemini JSON for Duelo Procesal:", parseErr, rawText);
        return res.status(500).json({ 
          error: "La IA generó una respuesta pero el formato JSON presentó anomalías.",
          rawOutput: rawText 
        });
      }

      db.prepare("INSERT INTO audit_logs (action, user_id, entity) VALUES (?, ?, ?)").run(
        `DUELO_PROCESAL_ANALISIS: ${materia}`, 
        req.user.id, 
        caseId ? `case_${caseId}` : "duelo_procesal"
      );

      res.json({
        success: true,
        data: parsedResult
      });

    } catch (error: any) {
      console.error("Error en Duelo Procesal AI:", error);
      res.status(500).json({ error: "Error de IA al procesar el duelo procesal: " + error.message });
    }
  });

  // ==========================================
  // FUNCIÓN 5: LÍNEA DE TIEMPO PROCESAL (TRACKING)
  // ==========================================

  // Obtener hitos de un expediente
  app.get("/api/cases/:id/milestones", authenticate, (req: any, res) => {
    try {
      const milestones = db.prepare("SELECT * FROM case_milestones WHERE case_id = ? ORDER BY date ASC, id ASC").all(req.params.id);
      res.json(milestones);
    } catch (error: any) {
      console.error("Error getting milestones:", error);
      res.status(500).json({ error: "Error al obtener la línea de tiempo del expediente." });
    }
  });

  // Agregar un hito procesal al expediente
  app.post("/api/cases/:id/milestones", authenticate, (req: any, res) => {
    try {
      const { stage, title, date, status = "completado", description = "" } = req.body;
      if (!stage || !title || !date) {
        return res.status(400).json({ error: "Etapa, título y fecha son obligatorios." });
      }

      const stmt = db.prepare(
        "INSERT INTO case_milestones (case_id, stage, title, date, status, description) VALUES (?, ?, ?, ?, ?, ?)"
      );
      const result = stmt.run(req.params.id, stage, title, date, status, description);

      db.prepare("INSERT INTO audit_logs (action, user_id, entity) VALUES (?, ?, ?)").run(
        `NUEVO_HITO_PROCESAL: ${title}`,
        req.user.id,
        `case_${req.params.id}`
      );

      res.status(201).json({
        id: result.lastInsertRowid,
        case_id: req.params.id,
        stage,
        title,
        date,
        status,
        description
      });
    } catch (error: any) {
      console.error("Error creating milestone:", error);
      res.status(500).json({ error: "Error al registrar el hito procesal." });
    }
  });

  // Actualizar un hito
  app.put("/api/milestones/:id", authenticate, (req: any, res) => {
    try {
      const { stage, title, date, status, description } = req.body;
      db.prepare(
        "UPDATE case_milestones SET stage = ?, title = ?, date = ?, status = ?, description = ? WHERE id = ?"
      ).run(stage, title, date, status, description, req.params.id);

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating milestone:", error);
      res.status(500).json({ error: "Error al actualizar el hito procesal." });
    }
  });

  // Eliminar un hito
  app.delete("/api/milestones/:id", authenticate, (req: any, res) => {
    try {
      db.prepare("DELETE FROM case_milestones WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting milestone:", error);
      res.status(500).json({ error: "Error al eliminar el hito procesal." });
    }
  });

  // GENERAR RESUMEN EJECUTIVO PARA EL CLIENTE CON IA (GEMINI 3.8 FLASH)
  app.post("/api/ai/resumen-cliente", authenticate, async (req: any, res) => {
    try {
      const { caseId, expediente = "", juzgado = "", partes = "", clienteNombre = "", hitos = [] } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "API Key de Gemini no configurada." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "lexmarcorp-ai-studio"
          }
        }
      });

      const systemInstruction = `
# ROL: DIRECTOR DE COMUNICACIÓN JURÍDICA Y ESTRATEGA LEGAL (LEXMARCORP IQ)
Eres el encargado de comunicación transparente y ejecutiva entre el despacho y sus clientes de alto perfil.
Tu objetivo es transformar una lista de acuerdos técnicos judiciales e hitos procesales mexicanos en un **INFORME EJECUTIVO Y RESUMEN PARA EL CLIENTE**.

# DIRECTRICES:
1. LENGUAJE HUMANO, ELEGANTE Y CLARO: Cero tecnicismos incomprensibles. Si mencionas un término procesal (ej. "auto de radicación", "emplazamiento", "admisión de pruebas"), explícalo en una sola frase sencilla para que el cliente entienda su significado práctico.
2. ESTRUCTURA DEL INFORME:
   - 📌 **Resumen Ejecutivo:** Estado actual en 2 oraciones (dónde estamos hoy).
   - 🏆 **Logros y Actuaciones Recientes:** Qué se realizó en las últimas semanas y qué resolvió el juzgado a nuestro favor o trámite.
   - 🚀 **Siguiente Paso Procesal:** Qué toca hacer ahora (término, desahogo de audiencia o sentencia) y cuándo se espera el siguiente movimiento.
   - 🛡️ **Evaluación de Riesgo y Posición:** Posición procesal (Favorable / Estable / Bajo Atención) y recomendación al cliente.
   - 💬 **Mensaje Breve para WhatsApp:** Una versión corta y concisa (3 párrafos con viñetas) lista para copiar y pegar directamente en WhatsApp.
3. TONO: Tranquilizador, proactivo, profesional, que proyecte total control del juicio y genere lealtad y confianza.
`;

      const prompt = `
DATOS DEL EXPEDIENTE:
- Número de Juicio: ${expediente || "EN TRÁMITE"}
- Juzgado: ${juzgado || "JUZGADO COMPETENTE"}
- Carátula: ${partes || "JUICIO MERCANTIL / CIVIL"}
- Nombre del Cliente: ${clienteNombre || "Estimado(a) Cliente"}

HISTORIAL DE HITOS PROCESALES Y ACUERDOS:
${JSON.stringify(hitos, null, 2)}

Por favor, redacta el Informe Ejecutivo para el cliente con la estructura requerida.
`;

      const response = await ai.models.generateContent({
        model: GEMINI_FLASH,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.3,
        }
      });

      const informeGenerado = response.text || "No fue posible generar el informe.";

      db.prepare("INSERT INTO audit_logs (action, user_id, entity) VALUES (?, ?, ?)").run(
        "GENERAR_RESUMEN_CLIENTE_AI",
        req.user.id,
        caseId ? `case_${caseId}` : "tracking"
      );

      res.json({
        success: true,
        informe: informeGenerado
      });

    } catch (error: any) {
      console.error("Error generando resumen para cliente:", error);
      res.status(500).json({ error: "Error de IA al generar el reporte: " + error.message });
    }
  });

  // Google Auth Simulation
  app.get("/api/auth/google/url", (req, res) => {
    res.json({ url: "/auth/callback?email=marco0620.MAP@gmail.com" });
  });

  app.get("/auth/callback", (req, res) => {
    const email = (req.query.email as string || "marco0620.map@gmail.com").trim().toLowerCase();
    
    // Look up user in DB matching email
    let user = db.prepare("SELECT * FROM users WHERE LOWER(email) = ?").get(email);
    
    if (!user) {
      // If user doesn't exist, seed them
      const name = email === "marco0620.map@gmail.com" ? "CEO. LIC. MARCO PERALES" : "Google User";
      const role = email === "marco0620.map@gmail.com" ? "admin" : "cliente";
      const hashedPassword = bcrypt.hashSync("LexmarCorp!2026", 10);
      
      const insertResult = db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(
        name,
        email,
        hashedPassword,
        role
      );
      
      user = {
        id: insertResult.lastInsertRowid,
        name,
        email,
        role
      };
    }
    
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET);
    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none" });
    
    db.prepare("INSERT INTO audit_logs (action, user_id, entity) VALUES (?, ?, ?)").run("GOOGLE_LOGIN", user.id, "auth");
    
    res.send(`
      <html>
        <body style="background: #020617; color: #f59e0b; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
          <div style="width: 60px; height: 60px; border: 4px solid #f59e0b; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <h2 style="margin-top: 20px; color: #f59e0b; font-weight: bold; letter-spacing: 0.05em;">LEXMARCORP</h2>
          <p style="color: #cbd5e1; font-size: 14px; margin-top: 10px;">Iniciando sesión con Google como ${user.name} (${user.role === 'admin' ? 'Administrador' : 'Cliente'})...</p>
          <script>
            try {
              localStorage.setItem('token', '${token}');
              localStorage.setItem('user', JSON.stringify(${JSON.stringify({ id: user.id, email: user.email, role: user.role, name: user.name })}));
            } catch (e) {
              console.error('Failed to set localStorage', e);
            }
            setTimeout(() => { window.location.href = "/dashboard"; }, 1000);
          </script>
          <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        </body>
      </html>
    `);
  });

  // Stripe Webhook Simulation
  app.post("/api/stripe/webhook", (req, res) => {
    const event = req.body;
    console.log("Stripe Webhook Event:", event.type);
    
    if (event.type === 'checkout.session.completed') {
      const { amount, case_id, user_id } = event.data; // Simulated data
      db.prepare("INSERT INTO audit_logs (action, user_id, entity) VALUES (?, ?, ?)").run(
        `PAGO_STRIPE_COMPLETADO: $${amount} MXN`, 
        user_id, 
        "payments"
      );
    } else if (event.type === 'payment_intent.payment_failed') {
      const { amount, user_id, reason } = event.data; // Simulated data
      db.prepare("INSERT INTO audit_logs (action, user_id, entity) VALUES (?, ?, ?)").run(
        `PAGO_STRIPE_FALLIDO: $${amount} MXN - Razón: ${reason}`, 
        user_id, 
        "payments"
      );
    }
    
    res.json({ received: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        allowedHosts: true,
        hmr: {
          port: 0 // dynamically allocate port
        }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  // Global API Error Handler
  app.use("/api", (err: any, req: any, res: any, next: any) => {
    console.error("API Error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  });

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Retrying...`);
      setTimeout(() => {
        server.close();
        server.listen(PORT, "0.0.0.0");
      }, 1000);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer();
