export default function handler(req, res) {
  if (req.method === "POST") {
    const { name, email, minutes, total } = req.body;

    // Generate a fake proforma invoice number
    const invoiceNumber = "PI-" + Math.floor(100000 + Math.random() * 900000);

    return res.status(200).json({
      success: true,
      message: "Proforma invoice generated",
      invoice: {
        invoiceNumber,
        name,
        email,
        minutes,
        total,
        currency: "ZAR",
        status: "Pending Payment"
      }
    });
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
