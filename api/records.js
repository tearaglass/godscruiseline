const {
  getSupabase,
  handlePreflight,
  serverError,
  isAdminRequest,
  pickFields,
  checkEnums
} = require('./_lib');

// Columns clients are allowed to write. Anything else in the body is ignored.
const RECORD_FIELDS = [
  'id', 'title', 'division', 'medium', 'year', 'status', 'content', 'project',
  'author', 'origin', 'source_ref', 'date_created', 'date_published', 'tags',
  'sensitivity_level', 'sensitivity_note', 'archival_state', 'archival_since',
  'archival_note', 'context', 'editors_note', 'file_urls'
];
const REQUIRED = ['id', 'title', 'division', 'medium', 'year', 'status'];

function validate(data, { requireAll }) {
  if (requireAll) {
    const missing = REQUIRED.filter((field) => !data[field]);
    if (missing.length > 0) {
      return `Missing required fields: ${missing.join(', ')}`;
    }
  }
  if (data.year !== undefined && !Number.isInteger(data.year)) {
    return 'Invalid year';
  }
  return checkEnums(data);
}

module.exports = async function handler(req, res) {
  if (handlePreflight(req, res)) {
    return;
  }

  const admin = isAdminRequest(req);

  // Every method except GET changes data and requires an admin session.
  if (req.method !== 'GET' && !admin) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const supabase = getSupabase();

    if (req.method === 'GET') {
      const { id } = req.query;
      let query = supabase.from('records').select('*');
      // Visitors without an admin session only receive public records.
      if (!admin) {
        query = query.eq('status', 'public');
      }

      if (id) {
        const { data, error } = await query.eq('id', id).maybeSingle();
        if (error) throw error;
        if (!data) {
          return res.status(404).json({ success: false, error: 'Record not found' });
        }
        return res.status(200).json({ success: true, data });
      }

      const { data, error } = await query.order('id');
      if (error) throw error;
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'POST') {
      const record = pickFields(req.body, RECORD_FIELDS);
      const invalid = validate(record, { requireAll: true });
      if (invalid) {
        return res.status(400).json({ success: false, error: invalid });
      }

      const { data, error } = await supabase.from('records').insert(record).select().single();
      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({ success: false, error: 'Record with this ID already exists' });
        }
        throw error;
      }
      return res.status(201).json({ success: true, data });
    }

    if (req.method === 'PUT') {
      const changes = pickFields(req.body, RECORD_FIELDS);
      const recordId = changes.id;
      if (!recordId) {
        return res.status(400).json({ success: false, error: 'Record ID is required' });
      }
      delete changes.id;

      const invalid = validate(changes, { requireAll: false });
      if (invalid) {
        return res.status(400).json({ success: false, error: invalid });
      }

      const { data, error } = await supabase
        .from('records')
        .update(changes)
        .eq('id', recordId)
        .select()
        .maybeSingle();
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
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return res.status(404).json({ success: false, error: 'Record not found' });
      }
      return res.status(200).json({ success: true, data });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    return serverError(res, error);
  }
};
