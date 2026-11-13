// Throwaway spike: token -> create -> publish -> read.
// Goal: prove the Management API chain works and learn the exact JSON format.
// Run: npm start (loads .env). Swagger (Umbraco 18): {UMBRACO_URL}/umbraco/openapi/index.html

import { randomUUID } from 'node:crypto';

const { UMBRACO_URL, UMBRACO_CLIENT_ID, UMBRACO_CLIENT_SECRET } = process.env;
const API = `${UMBRACO_URL}/umbraco/management/api/v1`;

// Article document type (looked up via GET /tree/document-type/root)
const ARTICLE_TYPE_ID = '83bee85d-d036-47dd-92aa-0c12552d24f5';

async function call(method, path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body && { 'Content-Type': 'application/json' }),
    },
    body: body && JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}\n${text}`);
  return text ? JSON.parse(text) : null;
}

// 1. Token (client credentials, form-encoded)
const tokenRes = await fetch(`${API}/security/back-office/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: UMBRACO_CLIENT_ID,
    client_secret: UMBRACO_CLIENT_SECRET,
  }),
});
if (!tokenRes.ok) throw new Error(`Token failed: ${tokenRes.status} ${await tokenRes.text()}`);
const { access_token: token, expires_in } = await tokenRes.json();
console.log(`1. Token OK (expires in ${expires_in}s)`);

// 2. Create. We generate the id ourselves so we know it without parsing the Location header.
const id = randomUUID();
await call('POST', '/document', token, {
  id,
  parent: null, // root
  documentType: { id: ARTICLE_TYPE_ID },
  template: null,
  variants: [{ culture: null, segment: null, name: `Spike article ${new Date().toISOString()}` }],
  values: [
    { alias: 'title', culture: null, segment: null, value: 'Spike title' },
    { alias: 'teaser', culture: null, segment: null, value: 'Spike teaser text' },
    {
      alias: 'bodyText',
      culture: null,
      segment: null,
      // Rich text format copied from a hand-made article (Umbraco 18)
      value: {
        markup: '<p>Hello from the <strong>spike</strong>.</p>',
        blocks: { layout: {}, contentData: [], settingsData: [], expose: [] },
      },
    },
  ],
});
console.log(`2. Created ${id}`);

// 3. Publish (invariant content -> culture null)
await call('PUT', `/document/${id}/publish`, token, { publishSchedules: [{ culture: null }] });
console.log('3. Published');

// 4. Read back
const doc = await call('GET', `/document/${id}`, token);
console.log('4. Read back:');
console.log(JSON.stringify({ variants: doc.variants, values: doc.values }, null, 2));
