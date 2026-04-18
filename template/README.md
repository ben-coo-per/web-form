# {{FORM_NAME}}

A minimal form with SQLite storage, deployable to Fly.io.

## Stack

- **Server:** Raw Node.js `http` module — no framework. All routes are in `server.js`.
- **Database:** Built-in `node:sqlite` (`DatabaseSync`). No native deps, no compilation.
- **Frontend:** Vanilla HTML/CSS in `public/index.html`. No build step.

## Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Serves `public/index.html` |
| POST | `/submit` | Saves form data to SQLite, redirects to `/?submitted=1` |
| GET | `/admin` | Password-protected submissions table (Basic auth) |
| GET | `/export.csv` | Downloads all submissions as CSV (same auth) |

## Submission processing flow

`POST /submit` → `handleSubmit()` in `server.js`:

1. **Parse body** — `parseBody()` reads the raw request stream and decodes it as `application/x-www-form-urlencoded` into a plain object. All values are `.trim()`'d.
2. **Validate** — checks that every `required: true` field in `config.js` has a non-empty value. Returns `400 { error, fields }` JSON if not.
3. **Serialize** — any field typed `JSON` is passed through `JSON.stringify`. If the value is already valid JSON it's round-tripped cleanly; plain strings get wrapped.
4. **Insert** — a pre-compiled `INSERT` statement (built at startup from `config.fields`) runs with the values in field-definition order.
5. **Redirect** — responds `302 → /?submitted=1`. The HTML checks this param on load and swaps the form for a success message.

To add server-side logic (e.g. sending an email, calling a webhook) do it in step 4, after `insertStmt.run()`.

## Customizing the form

1. **Add/remove fields** — edit the `fields` array in `config.js`. Each entry needs `name`, `type` (TEXT/INTEGER/REAL), and `required`.
2. **Update the HTML** — edit `public/index.html`. Input `name` attributes must match field names in `config.js`.
3. The SQLite table is created automatically from `config.js` on first run. If you change fields after the DB exists, delete `data.db` to recreate it (or write a migration manually).

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port |
| `DB_PATH` | `./data.db` | SQLite file path. Fly.io sets this to `/data/data.db` via `fly.toml`. |

## Adding a new route

Follow this pattern directly in `server.js` — add the condition inside the `http.createServer` callback, and define the handler function alongside the others:

```js
// In the createServer callback:
} else if (req.method === 'GET' && url.pathname === '/my-route') {
  handleMyRoute(req, res)

// Handler function:
function handleMyRoute(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('hello')
}
```

Do not introduce a routing framework — the flat if/else chain is intentional and easy to extend.

## Client-side JSON field pattern

For multi-selects or checkboxes that map to a `JSON` field, use a hidden input populated via JS:

```html
<input type="hidden" id="interests-value" name="interests">
<label><input type="checkbox" value="design"> Design</label>
<label><input type="checkbox" value="code"> Code</label>

<script>
  document.querySelector('form').addEventListener('submit', () => {
    const checked = [...document.querySelectorAll('[type=checkbox]:checked')].map(el => el.value)
    document.getElementById('interests-value').value = JSON.stringify(checked)
  })
</script>
```

## DB schema changes

The table is created once on first startup. If you add, remove, or rename fields in `config.js` after `data.db` already exists:
- **Local:** delete `data.db` and restart — data will be lost, which is fine in dev.
- **Production:** write a manual `ALTER TABLE` migration before deploying, or export first via `/export.csv`.

## Running locally

```bash
node server.js   # http://localhost:3000
```

The `ExperimentalWarning` about SQLite is expected — ignore it.

## Deployment (Fly.io)

```bash
fly launch    # first time — provisions app + volume
fly deploy    # subsequent deploys
```

The SQLite DB lives on a persistent Fly volume at `/data/data.db` and survives deploys.

## Config reference

```js
// config.js
module.exports = {
  formName: '{{FORM_NAME}}',   // SQLite table name (hyphens become underscores)
  adminPassword: 'changeme',   // protects /admin and /export.csv — change before deploying
  fields: [
    { name: 'email',     type: 'TEXT',    required: true  },
    { name: 'interests', type: 'JSON',    required: false }, // arrays/objects → stored as TEXT
    { name: 'quantity',  type: 'INTEGER', required: false },
    { name: 'price',     type: 'REAL',    required: false },
  ]
}
```

**Types:** `TEXT`, `INTEGER`, `REAL`, `JSON`. JSON fields are stored as serialized TEXT — the server handles stringify/parse automatically.
