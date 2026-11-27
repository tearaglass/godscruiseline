const {
  getSupabase,
  handlePreflight,
  serverError,
  isAdminRequest,
  pickFields,
  checkEnums
} = require('./_lib');

// Columns clients are allowed to write. Anything else in the body is ignored.
const PROJECT_FIELDS = ['id', 'name', 'description', 'status', 'lead', 'scope', 'start_year', 'end_year'];
const REQUIRED = ['id', 'name', 'status'];

function validate(data, { requireAll }) {
  if (requireAll) {
    const missing = REQUIRED.filter((field) => !data[field]);
    if (missing.length > 0) {
      return `Missing required fields: ${missing.join(', ')}`;
    }
  }
  for (const field of ['start_year', 'end_year']) {
    if (data[field] !== undefined && data[field] !== null && !Number.isInteger(data[field])) {
      return `Invalid ${field}`;
    }
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
      let query = supabase.from('projects').select('*');
      // Visitors without an admin session only receive public projects.
      if (!admin) {
        query = query.eq('status', 'public');
      }

      if (id) {
        const { data, error } = await query.eq('id', id).maybeSingle();
        if (error) throw error;
        if (!data) {
          return res.status(404).json({ success: false, error: 'Project not found' });
        }
        return res.status(200).json({ success: true, data });
      }

      const { data, error } = await query.order('id');
      if (error) throw error;
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'POST') {
      const project = pickFields(req.body, PROJECT_FIELDS);
      const invalid = validate(project, { requireAll: true });
      if (invalid) {
        return res.status(400).json({ success: false, error: invalid });
      }

      const { data, error } = await supabase.from('projects').insert(project).select().single();
      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({ success: false, error: 'Project with this ID already exists' });
        }
        throw error;
      }
      return res.status(201).json({ success: true, data });
    }

    if (req.method === 'PUT') {
      const changes = pickFields(req.body, PROJECT_FIELDS);
      const projectId = changes.id;
      if (!projectId) {
        return res.status(400).json({ success: false, error: 'Project ID is required' });
      }
      delete changes.id;

      const invalid = validate(changes, { requireAll: false });
      if (invalid) {
        return res.status(400).json({ success: false, error: invalid });
      }

      const { data, error } = await supabase
        .from('projects')
        .update(changes)
        .eq('id', projectId)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Project ID is required' });
      }

      const { data, error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }
      return res.status(200).json({ success: true, data });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    return serverError(res, error);
  }
};
