import axios from "axios";
import https from "https";

// Variáveis de ambiente: C6_CLIENT_ID, C6_CLIENT_SECRET, C6_PIX_KEY
// Certificado MTLS: certificado.pem e certificado-key.pem (ou paths em C6_CERT_PATH, C6_CERT_KEY_PATH)

const AUTH_URL = "https://baas-api.c6bank.info/v1/auth";
const PIX_API_URL = "https://baas-api.c6bank.info/v2/pix";

function gerarTxId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let txid = "";
  for (let i = 0; i < 32; i++) {
    txid += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return txid;
}

function criarHttpsAgent(certPath, keyPath) {
  const fs = require("fs");
  const path = require("path");
  const cert = fs.readFileSync(path.resolve(process.cwd(), certPath));
  const key = fs.readFileSync(path.resolve(process.cwd(), keyPath));
  return new https.Agent({ cert, key, rejectUnauthorized: true });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { amount, description } = req.body || {};

    if (amount == null || Number(amount) <= 0) {
      return res.status(400).json({ error: "amount is required" });
    }

    const C6_CLIENT_ID = process.env.C6_CLIENT_ID;
    const C6_CLIENT_SECRET = process.env.C6_CLIENT_SECRET;
    const C6_PIX_KEY = process.env.C6_PIX_KEY;
    const certPath = process.env.C6_CERT_PATH || "./certificado.pem";
    const keyPath = process.env.C6_CERT_KEY_PATH || "./certificado-key.pem";

    if (!C6_CLIENT_ID || !C6_CLIENT_SECRET || !C6_PIX_KEY) {
      return res.status(500).json({
        error: "Credenciais C6 não configuradas (C6_CLIENT_ID, C6_CLIENT_SECRET, C6_PIX_KEY)",
      });
    }

    const agent = criarHttpsAgent(certPath, keyPath);
    const axiosInstance = axios.create({ httpsAgent: agent, timeout: 30000 });

    // 1) OAuth2
    const authRes = await axiosInstance.post(
      AUTH_URL,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: C6_CLIENT_ID,
        client_secret: C6_CLIENT_SECRET,
      }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    const token = authRes.data?.access_token;
    if (!token) {
      return res.status(500).json({ error: "Falha na autenticação C6" });
    }

    // 2) Criar cobrança PIX
    const txid = gerarTxId();
    const valor = Number(amount).toFixed(2);
    const payload = {
      calendario: { expiracao: 3600 },
      valor: { original: valor },
      chave: C6_PIX_KEY,
      solicitacaoPagador: (description || "Cobrança").substring(0, 140),
    };

    const cobRes = await axiosInstance.put(
      `${PIX_API_URL}/cob/${txid}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const copiaCola =
      cobRes.data?.pixCopiaECola ||
      cobRes.data?.pixCopiaECola ||
      cobRes.data?.copiaCola ||
      cobRes.data?.copia_cola ||
      "";

    if (!copiaCola) {
      return res.status(500).json({ error: "PIX inválido retornado pela API C6" });
    }

    return res.status(200).json({
      qrCode: copiaCola,
      copiaCola,
      txid,
      location: cobRes.data?.location || "",
    });
  } catch (err) {
    console.error("[pix] Erro:", err.response?.data || err.message);
    const status = err.response?.status || 500;
    const message = err.response?.data?.detail || err.response?.data?.message || err.message || "Erro ao gerar PIX";
    return res.status(status).json({ error: String(message) });
  }
}
