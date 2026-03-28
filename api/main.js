let currentText = "No Data";

export default function handler(req, res) {
  // Allow Roblox to bypass CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'POST') {
    // When your Typewriter Menu sends text
    currentText = req.body.text || "Empty";
    return res.status(200).json({ success: true });
  } else {
    // When Build Logic HTTP Transmitter fetches text
    return res.status(200).send(currentText);
  }
}
