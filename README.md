# Gods Cruiseline Information System

A static permission-gated archive system for organizing records, projects, and divisions.

## Overview

The Gods Cruiseline Information System maintains continuity records, decisions, artifacts, and access protocols. Records are organized by division and can be grouped into projects.

- **Records**: Completed, filed items (documents, datasets, artifacts)
- **Projects**: Ongoing groupings of related records
- **Divisions**: Organizational categories (Broadcast, Works, Research, Narrative, Exchange, Access)

## Clearance System

Access is gated by a clearance hierarchy stored in localStorage. Higher clearance levels unlock additional content and features.

### Clearance Levels

| Level | Access |
|-------|--------|
| **Public** | View public records, System and Records navigation only |
| **Registered** | View registered records, access Divisions and Projects navigation |
| **Witness** | Access annotations section on records |
| **Authorized** | File new records, register projects, view authorized content |
| **Restricted** | (Reserved for sealed records) |

### Clearance Upgrades

- **Public → Registered**: Automatically granted after reading the System Charter (GC-R-000) for 20 seconds
- **Registered → Witness**: Enter the witness passphrase (`WITNESS_PASSPHRASE` env var) on the System page
- **Admin mode**: Enter the admin passphrase (`ADMIN_PASSPHRASE` env var) on the System page

Passphrases are never stored in this repo. A correct passphrase sets a signed, HttpOnly `gc_session` cookie (8 hours). The API checks that cookie; the localStorage keys below only drive the UI.

## Data Structure

### Records (`records-data.js`)

```javascript
{
  id: "GC-R-001",           // Required: Unique identifier
  title: "Record Title",    // Required: Display name
  division: "broadcast",    // Required: broadcast|works|research|narrative|exchange|access
  medium: "text",           // Required: text|audio|video|system|image|dataset|artifact
  year: 2026,               // Required: Filing year
  status: "public",         // Required: public|registered|authorized|restricted
  content: "...",           // Optional: Record body text
  project: "project-id",    // Optional: Associated project(s), string or array
  archival: {               // Optional: For archived/decayed records
    state: "archived",      // archived|decayed
    since: 2025,
    note: "Reason for archival"
  }
}
```

### Projects (`projects-data.js`)

```javascript
{
  id: "project-id",         // Required: Unique identifier
  name: "Project Name",     // Required: Display name
  description: "...",       // Optional: Project summary
  status: "public",         // Required: public|registered|authorized|restricted
  startYear: 2024,          // Optional: Start year
  endYear: 2026             // Optional: End year (if completed)
}
```

## File Structure

```
├── index.html              # Terminal landing page
├── system.html             # System overview
├── records.html            # Records index with division filter
├── record.html             # Single record detail view
├── projects.html           # Projects index
├── project.html            # Single project detail view
├── divisions.html          # Divisions overview
├── access.html             # Access page with passphrase input
├── file-record.html        # Form to file new records (authorized+)
├── register-project.html   # Form to register projects (authorized+)
├── script.js               # Application logic
├── styles.css              # Global styling
├── records-data.js         # Records data module
├── projects-data.js        # Projects data module
├── privacy/index.html      # Privacy notice
└── terms/index.html        # Terms of service
```

## Adding Content

### Filing a New Record

1. Navigate to Access → File Record (requires authorized clearance or admin)
2. Fill out the form and submit
3. A JSON file will download
4. Manually add the record object to `records-data.js`

### Registering a Project

1. Navigate to Access → Register Project (requires authorized clearance or admin)
2. Fill out the form and submit
3. A JSON file will download
4. Manually add the project object to `projects-data.js`

## Local Development

This is a static site with no build process. Serve with any static server:

```bash
npx serve .
# or
python -m http.server 8000
```

## Deployment

Deployed via GitHub Pages. The `CNAME` file points to `www.godscruiseline.com`.

The API (`api/`) runs on Vercel and needs these environment variables:

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service-role key (server only) |
| `WITNESS_PASSPHRASE` | Passphrase for witness clearance |
| `ADMIN_PASSPHRASE` | Passphrase for admin / dashboard |
| `SESSION_SECRET` | Long random string used to sign the session cookie. Login fails closed if unset. |

API access rules:

- `GET /api/records`, `GET /api/projects`: public rows only, or all rows with an admin session
- `POST`, `PUT`, `DELETE`: admin session required (401 otherwise)
- `GET /api/auth`: current session level; `POST`: log in; `DELETE`: log out

## localStorage Keys

| Key | Purpose |
|-----|---------|
| `gc_clearance` | Current clearance level |
| `gc_admin` | Admin flag (boolean string) |
| `gc_charter_initiated` | Tracks charter reading for auto-upgrade |
| `annotations:{record-id}` | Per-record annotations (witness+ only) |
