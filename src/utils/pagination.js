export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

export function parsePagination(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || DEFAULT_PAGE);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.parseInt(query.pageSize, 10) || DEFAULT_PAGE_SIZE),
  );
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip, take: pageSize };
}

export function paginationMeta(page, pageSize, total) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { page, pageSize, total, totalPages };
}

export async function paginatedFindMany(findMany, count, args, query) {
  const { page, pageSize, skip, take } = parsePagination(query);
  const [items, total] = await Promise.all([
    findMany({ ...args, skip, take }),
    count({ where: args.where }),
  ]);
  return { items, meta: paginationMeta(page, pageSize, total) };
}
