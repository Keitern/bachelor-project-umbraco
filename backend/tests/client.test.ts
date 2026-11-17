// Unit tests for src/umbraco/client.ts
// No real Umbraco: config.ts and auth.ts are replaced by fakes (vi.mock),
// and `fetch` by a fake (vi.stubGlobal). Each test decides what Umbraco "answers".
import { describe, it, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../src/config.ts', () => {
  return {
    config: { apiBase: 'https://umbraco.test/umbraco/management/api/v1' }
  };
});

vi.mock('../../src/umbraco/auth.ts', () => {
  return {
    getToken: vi.fn().mockResolvedValue('test-token'),
    clearToken: vi.fn()
  };
});

// A fake fetch, e.g.
//   fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ... }), { status: 200 }))
const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// request() and send() are not exported, so they are tested THROUGH the exported functions.
describe('request (through the exported functions)', () => {
  it.todo('sends the token as "Authorization: Bearer <token>"');
  it.todo('sends a JSON body + Content-Type only when there is a body');
  it.todo('on 401: calls clearToken and retries once');
  it.todo('on 401 twice: throws instead of retrying forever');
  it.todo('on other errors: throws UmbracoApiError with status and responseText');
  it.todo('returns null when Umbraco answers with an empty body');
});

describe('createDocument', () => {
  it.todo('sends POST /document with the request body');
  it.todo('returns the id from the request body');
});

describe('getDocument', () => {
  it.todo('sends GET /document/{id} and returns the document');
  it.todo('returns null when Umbraco answers 404');
  it.todo('throws on other errors (e.g. 500)');
});

describe('updateDocument', () => {
  it.todo('sends PUT /document/{id} with the request body');
});

describe('publishDocument', () => {
  it.todo('sends PUT /document/{id}/publish with publishSchedules [{ culture: null }]');
});

describe('getContentChildren', () => {
  it.todo('uses /tree/document/root when parentId is null');
  it.todo('uses /tree/document/children?parentId=... otherwise');
  it.todo('returns { id, name, state, hasChildren } for each node');
});

describe('getDocumentsByType', () => {
  it.todo('only returns nodes of the given document type');
  it.todo('also finds matching nodes deeper in the tree');
  it.todo('stops after maxDepth levels');
});

describe('getDocumentTypes', () => {
  it.todo('returns document types from the root');
  it.todo('looks inside folders but does not return the folders themselves');
  it.todo('leaves out element types');
});

describe('getDocumentTypeProperties', () => {
  it.todo('returns alias, name, mandatory, editorAlias and config for each field');
  it.todo('includes fields from compositions');
  it.todo('fetches each data type only once, even if several fields use it');
  it.todo('uses the cache on a second call within 1 minute');
});
