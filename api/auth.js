export default function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ success: true, message: 'Auth API ready. Use POST to validate.' });
  }

  if (req.method === 'POST') {
    const { passphrase } = req.body || {};

    if (!passphrase || !passphrase.trim()) {
      return res.status(400).json({ success: false, error: 'Passphrase required' });
    }

    const witnessPassphrase = process.env.WITNESS_PASSPHRASE || '';
    const adminPassphrase = process.env.ADMIN_PASSPHRASE || '';

    if (adminPassphrase && passphrase.trim() === adminPassphrase) {
      return res.status(200).json({ success: true, level: 'admin' });
    }

    if (witnessPassphrase && passphrase.trim() === witnessPassphrase) {
      return res.status(200).json({ success: true, level: 'witness' });
    }

    return res.status(200).json({ success: true, level: null });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
