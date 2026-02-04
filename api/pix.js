import https from "https";
import axios from "axios";

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ status: "PIX API ONLINE" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }


  try {
    const cert = process.env.CERT_PEM;
    const key = process.env.CERT_KEY;

    if (!cert || !key) {
      return res.status(500).json({ error: "Certificados não encontrados" });
    }

    const agent = new https.Agent({
      cert,
      key,
    });

    const response = await axios.post(
      "https://api.c6bank.com.br/pix/v1/qrcodes",
      req.body,
      { httpsAgent: agent }
    );

    return res.status(200).json(response.data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao gerar Pix" });
  }
}
