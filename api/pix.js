import axios from "axios";
import fs from "fs";
import https from "https";

export default async function handler(req, res) {
  try {
    const cert = fs.readFileSync("./certificado.pem");
    const key = fs.readFileSync("./certificado-key.pem");

    const agent = new https.Agent({
      cert,
      key,
    });

    const response = await axios.post(
      "https://baas-api.c6bank.info/v2/pix/charges",
      req.body,
      {
        httpsAgent: agent,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message
    });
  }
}
