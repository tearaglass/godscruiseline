import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  }
  return createClient(url, key);
}

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const supabase = getSupabase();

    if (req.method === 'GET') {
      const { id } = req.query;

      if (id) {
        const { data, error } = await supabase
          .from('records')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          return res.status(404).json({ success: false, error: 'Record not found' });
        }
        return res.status(200).json({ success: true, data });
      } else {
        const { data, error } = await supabase
          .from('records')
          .select('*')
          .order('id');

        if (error) throw error;
        return res.status(200).json({ success: true, data });
      }
    }

    if (req.method === 'POST') {
      const body = req.body;
      const required = ['id', 'title', 'division', 'medium', 'year', 'status'];
      const missing = required.filter(f => !body[f]);

      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missing.join(', ')}`
        });
      }

      const { data, error } = await supabase
        .from('records')
        .insert(body)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({ success: false, error: 'Record with this ID already exists' });
        }
        throw error;
      }
      return res.status(201).json({ success: true, data });
    }

    if (req.method === 'PUT') {
      const body = req.body;
      const recordId = body.id;

      if (!recordId) {
        return res.status(400).json({ success: false, error: 'Record ID is required' });
      }

      const { data, error } = await supabase
        .from('records')
        .update(body)
        .eq('id', recordId)
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return res.status(404).json({ success: false, error: 'Record not found' });
      }
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ success: false, error: 'Record ID is required' });
      }

      const { data, error } = await supabase
        .from('records')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return res.status(404).json({ success: false, error: 'Record not found' });
      }
      return res.status(200).json({ success: true, data });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
