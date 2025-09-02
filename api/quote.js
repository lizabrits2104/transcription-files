export default function handler(req, res) {
  if (req.method === "POST") {
    const { name, email, minutes } = req.body;

    // basic calculation example (adjust however you want)
    const pricePerMinute = 15; // R15 per minute
    const total = minutes * pricePerMinute;

    return res.status(200).json({
      success: true,
      message: "Quote calculated successfully",
      data: {
        name,
        email,
        minutes,
        total,
        currency: "ZAR"
      }
    });
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
