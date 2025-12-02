// hooks/use-client-pagination.js
import { useState, useMemo } from 'react';

export function useClientPagination({
  data,
  initialPage = 1,
  initialPageSize = 20,
}) {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  }, [data, page, pageSize]);

  const totalPages = Math.ceil(data.length / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, data.length);

  const goToPage = newPage => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const nextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const prevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const setPageSizeAndReset = newPageSize => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when page size changes
  };

  return {
    page,
    pageSize,
    paginatedData,
    totalPages,
    totalItems: data.length,
    startItem,
    endItem,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    goToPage,
    nextPage,
    prevPage,
    setPageSize: setPageSizeAndReset,
  };
}
