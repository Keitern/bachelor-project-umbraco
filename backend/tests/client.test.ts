// Unit tests for src/umbraco/client.ts
// No real Umbraco: config.ts and auth.ts are replaced by fakes (vi.mock),
// and fetch by a fake (vi.stubGlobal). Each test decides what Umbraco "answers".
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createDocument,
  getDocument,
  updateDocument,
  publishDocument,
  getContentChildren,
  getDocumentsByType,
  getDocumentTypes,
  getDocumentTypeProperties,
  UmbracoApiError,
  type CreateDocumentBody,
  type UpdateDocumentBody
} from '../src/umbraco/client.ts';
import { getToken, clearToken } from '../src/umbraco/auth.ts';

// client.ts uses config.ts, so we're mocking it.
vi.mock('../src/config.ts', () => {
  return {
    config: { apiBase: 'https://umbraco.test/umbraco/management/api/v1' }
  };
});

// client.ts uses auth.ts, so we're mocking it.
vi.mock('../src/umbraco/auth.ts', () => {
  return {
    getToken: vi.fn().mockResolvedValue('test-token'),
    clearToken: vi.fn()
  };
});

const BASE = 'https://umbraco.test/umbraco/management/api/v1';

// A fake fetch:
const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  vi.mocked(getToken).mockClear();
  vi.mocked(clearToken).mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

// Makes fetch answer every call by looking at the URL (a fresh Response each time)
function respondWith(handler: (url: string) => unknown): void {
  fetchMock.mockImplementation(async (url: string) => {
    return jsonResponse(handler(url));
  });
}

// The (url, init) of the nth fetch call
function callAt(index: number): { url: string; init: any } {
  const [url, init] = fetchMock.mock.calls[index];
  return { url, init };
}

function page<Item>(items: Item[]) {
  return { total: items.length, items };
}

function treeItem(id: string, documentTypeId: string, hasChildren = false) {
  return {
    id,
    hasChildren,
    documentType: { id: documentTypeId },
    variants: [{ name: `Name ${id}`, state: 'Published' }]
  };
}

const CREATE_BODY: CreateDocumentBody = {
  id: 'doc-1',
  parent: null,
  documentType: { id: 'type-1' },
  template: null,
  variants: [{ culture: null, segment: null, name: 'Hello' }],
  values: [{ alias: 'title', culture: null, segment: null, value: 'Hi' }]
};

const UPDATE_BODY: UpdateDocumentBody = {
  template: null,
  variants: [{ culture: null, segment: null, name: 'Hello' }],
  values: []
};

// ─── request() and send() are not exported, so they are tested THROUGH the exported functions ───

describe('request (through the exported functions)', () => {
  it('sends the token as "Authorization: Bearer <token>" (and no Content-Type without a body)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'doc-1' }));

    await getDocument('doc-1');

    const { init } = callAt(0);
    expect(init.headers.Authorization).toBe('Bearer test-token');
    expect(init.headers['Content-Type']).toBeUndefined();
    expect(init.body).toBeUndefined();
  });

  it('on 401: calls clearToken and retries once', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({}));

    await updateDocument('doc-1', UPDATE_BODY);

    expect(clearToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('on 401 twice: throws instead of retrying forever', async () => {
    fetchMock.mockImplementation(async () => {
      return new Response('nope', { status: 401 });
    });

    await expect(updateDocument('doc-1', UPDATE_BODY)).rejects.toMatchObject({ status: 401 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('on other errors: throws UmbracoApiError with status and responseText', async () => {
    fetchMock.mockResolvedValueOnce(new Response('boom', { status: 500 }));

    const promise = updateDocument('doc-1', UPDATE_BODY);

    await expect(promise).rejects.toBeInstanceOf(UmbracoApiError);
    await expect(promise).rejects.toMatchObject({
      name: 'UmbracoApiError',
      status: 500,
      responseText: 'boom'
    });
  });
});

describe('createDocument', () => {
  it('sends POST /document with the request body', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 201 }));

    await createDocument(CREATE_BODY);

    const { url, init } = callAt(0);
    expect(url).toBe(`${BASE}/document`);
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual(CREATE_BODY);
  });

  it('returns the id from the request body', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 201 }));

    await expect(createDocument(CREATE_BODY)).resolves.toBe('doc-1');
  });
});

describe('getDocument', () => {
  it('sends GET /document/{id} and returns the document', async () => {
    const doc = {
      id: 'doc-1',
      documentType: { id: 'type-1' },
      template: null,
      variants: [],
      values: []
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(doc));

    const result = await getDocument('doc-1');

    const { url, init } = callAt(0);
    expect(url).toBe(`${BASE}/document/doc-1`);
    expect(init.method).toBe('GET');
    expect(result).toEqual(doc);
  });

  it('returns null when Umbraco answers 404', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }));

    await expect(getDocument('missing')).resolves.toBeNull();
  });
});

describe('updateDocument', () => {
  it('sends PUT /document/{id} with the request body', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));

    await updateDocument('doc-1', UPDATE_BODY);

    const { url, init } = callAt(0);
    expect(url).toBe(`${BASE}/document/doc-1`);
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual(UPDATE_BODY);
  });
});

describe('publishDocument', () => {
  it('sends PUT /document/{id}/publish with publishSchedules [{ culture: null }]', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));

    await publishDocument('doc-1');

    const { url, init } = callAt(0);
    expect(url).toBe(`${BASE}/document/doc-1/publish`);
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ publishSchedules: [{ culture: null }] });
  });
});

describe('getContentChildren', () => {
  it('uses /tree/document/root when parentId is null', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(page([])));

    await getContentChildren(null);

    expect(callAt(0).url).toBe(`${BASE}/tree/document/root?take=500`);
  });

  it('uses /tree/document/children?parentId=... and returns { id, name, state, hasChildren } for each node', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(page([treeItem('child-1', 'type-1', true)])));

    const result = await getContentChildren('parent-1');

    expect(callAt(0).url).toBe(`${BASE}/tree/document/children?parentId=parent-1&take=500`);
    expect(result).toEqual([
      { id: 'child-1', name: 'Name child-1', state: 'Published', hasChildren: true }
    ]);
  });
});

describe('getDocumentsByType', () => {
  it('only returns nodes of the given type, also deeper in the tree', async () => {
    respondWith((url) => {
      if (url.includes('/tree/document/root')) {
        return page([treeItem('A', 'wanted', true), treeItem('B', 'other')]);
      }
      if (url.includes('parentId=A')) {
        return page([treeItem('C', 'wanted')]);
      }
      return page([]);
    });

    const result = await getDocumentsByType('wanted');

    expect(
      result.map((r) => {
        return r.id;
      })
    ).toEqual(['A', 'C']);
  });

  it('stops after maxDepth levels', async () => {
    respondWith((url) => {
      if (url.includes('/tree/document/root')) {
        return page([treeItem('A', 'wanted', true)]);
      }
      return page([treeItem('C', 'wanted')]);
    });

    const result = await getDocumentsByType('wanted', 1);

    expect(
      result.map((r) => {
        return r.id;
      })
    ).toEqual(['A']);
    expect(fetchMock).toHaveBeenCalledTimes(1); // only the root level was fetched
  });
});

describe('getDocumentTypes', () => {
  it('returns document types from the root, and looks inside folders without returning the folders', async () => {
    const type = (id: string, extra = {}) => {
      return {
        id,
        name: id,
        icon: 'icon',
        isElement: false,
        isFolder: false,
        hasChildren: false,
        ...extra
      };
    };

    respondWith((url) => {
      if (url.includes('/tree/document-type/root')) {
        return page([type('page'), type('folder', { isFolder: true, hasChildren: true })]);
      }
      if (url.includes('parentId=folder')) {
        return page([type('nested-page')]);
      }
      return page([]);
    });

    const result = await getDocumentTypes();

    expect(
      result.map((r) => {
        return r.id;
      })
    ).toEqual(['page', 'nested-page']);
  });

  it('leaves out element types', async () => {
    respondWith(() => {
      return page([
        {
          id: 'page',
          name: 'page',
          icon: 'i',
          isElement: false,
          isFolder: false,
          hasChildren: false
        },
        {
          id: 'block',
          name: 'block',
          icon: 'i',
          isElement: true,
          isFolder: false,
          hasChildren: false
        }
      ]);
    });

    const result = await getDocumentTypes();

    expect(
      result.map((r) => {
        return r.id;
      })
    ).toEqual(['page']);
  });
});

// The properties cache lives at module level and survives between tests,
// so every test uses its OWN document type id.
describe('getDocumentTypeProperties', () => {
  function respondWithDocumentType(documentTypeId: string) {
    respondWith((url) => {
      if (url.endsWith(`/document-type/${documentTypeId}`)) {
        return {
          id: documentTypeId,
          properties: [
            {
              alias: 'title',
              name: 'Title',
              dataType: { id: 'dt-text' },
              validation: { mandatory: true }
            },
            {
              alias: 'subtitle',
              name: 'Subtitle',
              dataType: { id: 'dt-text' },
              validation: { mandatory: false }
            }
          ]
        };
      }
      if (url.endsWith('/data-type/dt-text')) {
        return {
          id: 'dt-text',
          editorAlias: 'Umbraco.TextBox',
          values: [{ alias: 'maxChars', value: 100 }]
        };
      }
      return {};
    });
  }

  it('returns alias, name, mandatory, editorAlias and config, and fetches each data type only once', async () => {
    respondWithDocumentType('type-props-1');

    const result = await getDocumentTypeProperties('type-props-1');

    expect(result).toEqual([
      {
        alias: 'title',
        name: 'Title',
        mandatory: true,
        editorAlias: 'Umbraco.TextBox',
        config: [{ alias: 'maxChars', value: 100 }]
      },
      {
        alias: 'subtitle',
        name: 'Subtitle',
        mandatory: false,
        editorAlias: 'Umbraco.TextBox',
        config: [{ alias: 'maxChars', value: 100 }]
      }
    ]);
    // 1 call for the document type + 1 for the shared data type (not 2)
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('uses the cache on a second call within the cache time', async () => {
    respondWithDocumentType('type-props-2');

    const first = await getDocumentTypeProperties('type-props-2');
    const callsAfterFirst = fetchMock.mock.calls.length;
    const second = await getDocumentTypeProperties('type-props-2');

    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(callsAfterFirst); // no new requests
  });
});
