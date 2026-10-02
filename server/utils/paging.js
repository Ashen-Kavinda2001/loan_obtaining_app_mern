// Shared by the list endpoints (GET /members, GET /loans): ?page=&limit= turn on paging.

const DEFAULT_LIMIT = 20;

// { page, limit, offset } when the request asked for a page, otherwise null (return everything)
const pagingFrom = ({ page, limit }) => {
  if (page === undefined) return null;
  const size = limit ?? DEFAULT_LIMIT;
  return { page, limit: size, offset: (page - 1) * size };
};

// The paged response shape: one page of items plus what the UI needs to draw page buttons
const pageResult = (items, total, { page, limit }, extra = {}) => ({
  items,
  total,
  page,
  limit,
  pages: Math.max(1, Math.ceil(total / limit)),
  ...extra,
});

// Search text for a SQL LIKE: % and _ match literally, not as wildcards
const likePattern = (q) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

module.exports = { pagingFrom, pageResult, likePattern };
