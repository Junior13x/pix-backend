export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { amount, description } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "amount is required" });
    }

    return res.status(200).json({
      qrCode: "00020101021226890014br.gov.bcb.pix2563fakepixdemonstracao520400005303986540510.005802BR5920TESTE PIX BACKEND6009SAO PAULO62070503***6304ABCD",
      copiaCola: "00020101021226890014br.gov.bcb.pix2563fakepixdemonstracao520400005303986540510.005802BR5920TESTE PIX BACKEND6009SAO PAULO62070503***6304ABCD",
      amount,
      description
    });

  } catch (err) {
    return res.status(500).json({ error: "internal error" });
  }
}
