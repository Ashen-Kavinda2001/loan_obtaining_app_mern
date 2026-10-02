/**
 * validate({ params, query, body }) — checks each part of the request against a zod schema.
 * On success the parsed (normalized) values are in req.valid.params / .query / .body.
 * On failure: 400 { error: 'ValidationError', message: <first problem>, details: [{ field, message }] }.
 */
const validate = (schemas) => (req, res, next) => {
  req.valid = req.valid || {};
  for (const part of ['params', 'query', 'body']) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field:   issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(400).json({ error: 'ValidationError', message: details[0].message, details });
    }
    req.valid[part] = result.data;
  }
  next();
};

module.exports = validate;
