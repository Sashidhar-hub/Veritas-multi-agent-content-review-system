import http from 'node:http';

const PORT = Number(process.env.PORT || 3001);
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';

/** In-memory store of Tavily results retrieved during this server session */
const retrievedSources = [];

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function inferTrustTier(url) {
  const lower = (url || '').toLowerCase();
  if (
    lower.includes('nature.com') ||
    lower.includes('science.org') ||
    lower.includes('aps.org') ||
    lower.includes('pubmed') ||
    lower.includes('ncbi.nlm.nih.gov') ||
    lower.includes('sciencedirect.com') ||
    lower.includes('springer.com') ||
    lower.includes('ieee.org')
  ) {
    return 'Peer-Reviewed';
  }
  if (lower.includes('.edu') || lower.includes('.ac.') || lower.includes('mit.edu')) {
    return 'Academic Institution';
  }
  if (lower.includes('arxiv.org') || lower.includes('biorxiv.org') || lower.includes('medrxiv.org')) {
    return 'Preprint';
  }
  return 'Reference';
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'web';
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, {
      ok: true,
      tavilyConfigured: Boolean(TAVILY_API_KEY),
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/sources/tavily') {
    sendJson(res, 200, retrievedSources);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/question-paper/extract') {
    try {
      const body = await readJsonBody(req);
      const rawText = typeof body.text === 'string' ? body.text : '';
      if (!rawText.trim()) {
        sendJson(res, 400, { error: 'Question paper text is required.' });
        return;
      }

      const normalized = rawText.replace(/\r\n/g, '\n').trim();
      const blocks = normalized
        .split(/\n(?=(?:Q(?:uestion)?\s*\d+[\.\:\)]|\d+[\.\)])\s+)/i)
        .map((b) => b.trim())
        .filter(Boolean);

      const questions = [];
      for (const block of blocks) {
        const cleaned = block
          .replace(/^(?:Q(?:uestion)?\s*\d+[\.\:\)]|\d+[\.\)])\s+/i, '')
          .trim();
        if (cleaned.length < 8) continue;

        const ansMatch = cleaned.match(
          /\n\s*(?:Answer|Explanation|Solution|Draft)\s*[:\-]\s*([\s\S]+)$/i
        );
        let question = cleaned;
        let draftExplanation = '';
        if (ansMatch && ansMatch.index !== undefined) {
          question = cleaned.slice(0, ansMatch.index).trim();
          draftExplanation = ansMatch[1].trim();
        }
        questions.push({ question, draftExplanation });
      }

      sendJson(res, 200, { count: questions.length, questions });
    } catch (err) {
      sendJson(res, 400, {
        error: err instanceof Error ? err.message : 'Failed to parse question paper.',
      });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/tavily/search') {
    if (!TAVILY_API_KEY) {
      sendJson(res, 503, {
        error:
          'TAVILY_API_KEY is not configured on the server. Add TAVILY_API_KEY to your .env file and restart the backend.',
      });
      return;
    }

    try {
      const body = await readJsonBody(req);
      const query = typeof body.query === 'string' ? body.query.trim() : '';
      const reviewId = typeof body.reviewId === 'string' ? body.reviewId : 'Manual Search';
      const maxResults =
        typeof body.maxResults === 'number' && body.maxResults > 0 && body.maxResults <= 10
          ? body.maxResults
          : 5;

      if (!query) {
        sendJson(res, 400, { error: 'A non-empty search query is required.' });
        return;
      }

      const tavilyRes = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: TAVILY_API_KEY,
          query,
          search_depth: 'advanced',
          max_results: maxResults,
          include_answer: false,
          include_raw_content: false,
        }),
      });

      if (!tavilyRes.ok) {
        const errText = await tavilyRes.text().catch(() => tavilyRes.statusText);
        sendJson(res, tavilyRes.status, {
          error: `Tavily API error (${tavilyRes.status}): ${errText}`,
        });
        return;
      }

      const data = await tavilyRes.json();
      const now = new Date().toISOString();
      const results = Array.isArray(data.results) ? data.results : [];

      const mappedSources = results.map((item, idx) => ({
        id: `tav-${Date.now()}-${idx}`,
        domain: extractDomain(item.url),
        title: item.title || item.url || 'Untitled Academic Source',
        url: item.url,
        snippet: item.content || '',
        retrievedAt: now,
        usedInReviewId: reviewId,
        trustTier: inferTrustTier(item.url),
        score: typeof item.score === 'number' ? item.score : undefined,
      }));

      // Prepend newest retrieved sources (keep up to 50 in session memory)
      retrievedSources.unshift(...mappedSources);
      if (retrievedSources.length > 50) {
        retrievedSources.length = 50;
      }

      sendJson(res, 200, {
        query,
        results: mappedSources,
      });
    } catch (err) {
      sendJson(res, 500, {
        error: err instanceof Error ? err.message : 'Unexpected server error.',
      });
    }
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(
    `[Veritas API Server] Listening on http://localhost:${PORT} (Tavily configured: ${Boolean(
      TAVILY_API_KEY
    )})`
  );
});
