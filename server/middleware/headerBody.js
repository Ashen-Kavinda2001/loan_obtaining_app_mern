/**
 * Request data sent in the X-Body header instead of the request body (see src/api/client.js).
 *
 * Why: on the production host (LiteSpeed + Node.js App), requests that arrive over HTTP/2 WITH a
 * body never reach Node: LiteSpeed forwards the headers but not the body, so express.json() waits
 * forever and the browser times out after 45 s. Phones use HTTP/2, so login, Register Member and
 * Grant Loan failed there. Requests without a body pass normally, so the client sends small JSON
 * payloads base64url-encoded in a header and no body. Tested on the live server, 2026-10-03.
 *
 * Remove this (and the client part) once the host fixes HTTP/2 request bodies.
 * A real body, when present, always wins and goes through express.json() as before.
 */
const MAX_HEADER_CHARS = 8 * 1024; // ~6 KB of JSON; the client sends anything bigger as a normal body

const headerBody = (req, res, next) => {
  const encoded = req.headers['x-body'];
  if (!encoded) return next();

  const hasRealBody = Number(req.headers['content-length'] || 0) > 0 || Boolean(req.headers['transfer-encoding']);
  if (hasRealBody) return next();

  if (encoded.length > MAX_HEADER_CHARS) {
    return res.status(413).json({ message: 'Request data is too large' });
  }

  let data;
  try {
    data = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return res.status(400).json({ message: 'Malformed request data' });
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return res.status(400).json({ message: 'Malformed request data' });
  }

  req.body = data;
  req._body = true; // tells express.json() the body is already parsed
  next();
};

module.exports = headerBody;
