/**
 * FrigoApp WhatsApp Bot - Multi-Tenant
 *
 * Cada tenant tiene su propia sesión Baileys independiente.
 * Las sesiones se almacenan en auth_info_baileys/{tenant_slug}/
 * El bot expone una API Express para consultar QR y estado por tenant.
 */

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    Browsers,
    fetchLatestBaileysVersion,
    downloadMediaMessage
} = require("@whiskeysockets/baileys");

const qrcodeTerminal = require("qrcode-terminal");
const QRCode = require("qrcode");
const axios = require("axios");
const pino = require("pino");
const express = require("express");
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
require('dotenv').config();

// ─── Config ────────────────────────────────────────────────────────────────
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:8889';
const BOT_SECRET   = process.env.BOT_SECRET  || 'frigo-bot-secret';
const PORT         = parseInt(process.env.BOT_PORT || '3001');
const AUTH_BASE    = path.join(__dirname, 'auth_info_baileys');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Ensure crypto polyfill for Node 18/20 slim images
if (!global.crypto) global.crypto = require('crypto');

// ─── State: one entry per tenant_slug ──────────────────────────────────────
// tenantSessions[slug] = { qr, status, socket, tenantId, numero }
const tenantSessions = {};

// ─── Express API ───────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

/** GET /status  — estado de todos los tenants */
app.get('/status', async (req, res) => {
    const result = {};
    for (const [slug, s] of Object.entries(tenantSessions)) {
        let qrBase64 = null;
        if (s.qr) {
            try { qrBase64 = await QRCode.toDataURL(s.qr); } catch (_) {}
        }
        result[slug] = {
            status: s.status,
            qr: qrBase64,
            numero: s.numero,
            tenant_id: s.tenantId
        };
    }
    res.json(result);
});

/** GET /status/:slug  — estado de un tenant específico */
app.get('/status/:slug', async (req, res) => {
    const s = tenantSessions[req.params.slug];
    if (!s) return res.status(404).json({ error: 'Tenant no encontrado' });
    let qrBase64 = null;
    if (s.qr) {
        try { qrBase64 = await QRCode.toDataURL(s.qr); } catch (_) {}
    }
    res.json({ status: s.status, qr: qrBase64, numero: s.numero, tenant_id: s.tenantId });
});

/** POST /logout/:slug  — cierra sesión de un tenant */
app.post('/logout/:slug', async (req, res) => {
    const s = tenantSessions[req.params.slug];
    if (!s || !s.socket) return res.status(404).json({ error: 'Sesión no encontrada' });
    try {
        await s.socket.logout();
        res.json({ detail: 'Sesión cerrada' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => console.log(`[Bot] API escuchando en puerto ${PORT}`));

// ─── Funciones auxiliares ───────────────────────────────────────────────────

/**
 * Obtiene la configuración de todos los tenants con WhatsApp activo desde el backend.
 */
async function fetchTenantConfigs() {
    try {
        const resp = await axios.get(`${BACKEND_URL}/api/whatsapp/tenants-config`, {
            headers: { 'X-Bot-Secret': BOT_SECRET },
            timeout: 10000
        });
        return resp.data; // Array de { id, slug, whatsapp_numero, whatsapp_activo }
    } catch (e) {
        console.error(`[Bot] Error al obtener configuración de tenants: ${e.message}`);
        return [];
    }
}

/**
 * Transcribe audio con OpenAI Whisper.
 */
async function transcribeAudio(buffer) {
    const tempFile = path.join('/tmp', `audio_${Date.now()}.ogg`);
    fs.writeFileSync(tempFile, buffer);
    try {
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tempFile),
            model: "whisper-1",
        });
        return transcription.text;
    } finally {
        try { fs.unlinkSync(tempFile); } catch (_) {}
    }
}

/**
 * Conecta WhatsApp para un tenant específico.
 * Re-intenta automáticamente en caso de desconexión.
 */
async function connectTenant({ id: tenantId, slug, whatsapp_numero: numero }) {
    console.log(`[Bot][${slug}] Iniciando conexión para número ${numero}...`);

    // Inicializar estado del tenant
    if (!tenantSessions[slug]) {
        tenantSessions[slug] = { qr: null, status: 'connecting', socket: null, tenantId, numero };
    }

    const authDir = path.join(AUTH_BASE, slug);
    fs.mkdirSync(authDir, { recursive: true });

    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    const sock = makeWASocket({
        version,
        auth: state,
        browser: Browsers.macOS('Desktop'),
        logger: pino({ level: 'warn' }),
        printQRInTerminal: false,   // manejamos QR via Express
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 20000,
        generateHighQualityLinkPreview: false
    });

    tenantSessions[slug].socket = sock;

    // Guardar credenciales
    sock.ev.on('creds.update', saveCreds);

    // Manejar eventos de conexión
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            tenantSessions[slug].qr = qr;
            tenantSessions[slug].status = 'qr_ready';
            console.log(`[Bot][${slug}] QR disponible en GET /status/${slug}`);
            qrcodeTerminal.generate(qr, { small: true });
        }

        if (connection === 'close') {
            tenantSessions[slug].status = 'disconnected';
            tenantSessions[slug].qr = null;
            const code = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = code !== DisconnectReason.loggedOut;
            console.log(`[Bot][${slug}] Conexión cerrada (código ${code}). Reconectar: ${shouldReconnect}`);

            if (shouldReconnect) {
                // Esperar 5s antes de reintentar
                setTimeout(() => connectTenant({ id: tenantId, slug, whatsapp_numero: numero }), 5000);
            }
        } else if (connection === 'open') {
            tenantSessions[slug].status = 'connected';
            tenantSessions[slug].qr = null;
            console.log(`[Bot][${slug}] ✅ CONECTADO — Número: ${numero}`);
        }
    });

    // Manejar mensajes entrantes
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const senderJid = m.key.remoteJid;
        const pushName  = m.pushName || 'Usuario WhatsApp';

        // Resolver número real si llega como LID
        let fromNumber = senderJid;
        if (senderJid.endsWith('@lid')) {
            const contact = m.key.participant || m.participant || '';
            if (contact.includes('@s.whatsapp.net')) {
                fromNumber = contact;
            }
        }

        // Extraer texto del mensaje
        let body = m.message.conversation || m.message.extendedTextMessage?.text;

        // Transcripción de audio
        if (m.message.audioMessage) {
            console.log(`[Bot][${slug}] Audio de ${pushName}. Transcribiendo...`);
            try {
                const buffer = await downloadMediaMessage(m, 'buffer', {});
                body = await transcribeAudio(buffer);
                console.log(`[Bot][${slug}] Transcripción: "${body}"`);
            } catch (err) {
                console.error(`[Bot][${slug}] Error procesando audio:`, err.message);
            }
        }

        if (!body) return;

        console.log(`[Bot][${slug}] Mensaje de ${pushName} (${fromNumber}): ${body}`);

        // Enviar al backend con el tenant_id ya resuelto
        try {
            await axios.post(`${BACKEND_URL}/api/whatsapp/webhook`, {
                from: fromNumber,
                body: body,
                tenant_id: tenantId,   // ← clave: el bot ya sabe el tenant
                sender: { name: pushName, number: fromNumber },
                timestamp: m.messageTimestamp
            });
            console.log(`[Bot][${slug}] Mensaje enviado al backend OK`);
        } catch (e) {
            console.error(`[Bot][${slug}] Error al notificar al backend:`, e.message);
        }
    });
}

// ─── Bootstrap ─────────────────────────────────────────────────────────────

async function main() {
    console.log('[Bot] Iniciando FrigoApp WhatsApp Multi-Tenant Bot...');

    // Esperar a que el backend esté listo
    let retries = 0;
    while (retries < 20) {
        try {
            await axios.get(`${BACKEND_URL}/health`, { timeout: 3000 });
            console.log('[Bot] Backend disponible ✓');
            break;
        } catch (_) {
            retries++;
            console.log(`[Bot] Esperando backend... (${retries}/20)`);
            await new Promise(r => setTimeout(r, 5000));
        }
    }

    // Obtener configuración de tenants
    const tenants = await fetchTenantConfigs();
    console.log(`[Bot] Tenants con WhatsApp activo: ${tenants.length}`);

    if (tenants.length === 0) {
        console.log('[Bot] No hay tenants con WhatsApp configurado. Esperando configuración...');
        // Reintentar cada 2 minutos
        setInterval(async () => {
            const newTenants = await fetchTenantConfigs();
            for (const t of newTenants) {
                if (!tenantSessions[t.slug]) {
                    console.log(`[Bot] Nuevo tenant detectado: ${t.slug}`);
                    connectTenant(t).catch(err =>
                        console.error(`[Bot][${t.slug}] Error fatal:`, err.message)
                    );
                }
            }
        }, 120000);
        return;
    }

    // Conectar un socket por tenant
    for (const tenant of tenants) {
        connectTenant(tenant).catch(err =>
            console.error(`[Bot][${tenant.slug}] Error fatal al conectar:`, err.message)
        );
        // Pequeño delay para no saturar al arrancar
        await new Promise(r => setTimeout(r, 2000));
    }

    // Polling periódico para detectar nuevos tenants (cada 5 min)
    setInterval(async () => {
        const freshTenants = await fetchTenantConfigs();
        for (const t of freshTenants) {
            if (!tenantSessions[t.slug] || tenantSessions[t.slug].status === 'disconnected') {
                console.log(`[Bot] Re-conectando tenant: ${t.slug}`);
                connectTenant(t).catch(err =>
                    console.error(`[Bot][${t.slug}] Error al reconectar:`, err.message)
                );
            }
        }
    }, 300000); // 5 minutos
}

main().catch(err => console.error('[Bot] Error fatal en main:', err));
