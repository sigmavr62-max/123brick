// This variable exists in memory while the function is "warm"
let currentText = "Awaiting Input...";

export default function handler(req, res) {
    // Enable CORS so Roblox and your site can both talk to it
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        // Update the text from your website
        currentText = req.body.text || "";
        return res.status(200).json({ success: true });
    } 

    // Default: Return the text (for the website and Roblox)
    return res.status(200).send(currentText);
}
