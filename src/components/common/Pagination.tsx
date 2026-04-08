import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  const goToPage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    onPageChange(nextPage);
  };

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const visiblePages =
    totalPages <= 7
      ? pages
      : currentPage <= 4
        ? [1, 2, 3, 4, 5, '...', totalPages]
        : currentPage >= totalPages - 3
          ? [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
          : [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-6 pt-4 border-t border-gray-100">
      <p className="text-sm text-gray-600">
        Hiển thị <span className="font-semibold text-gray-900">{start}</span> -{' '}
        <span className="font-semibold text-gray-900">{end}</span> trong tổng số{' '}
        <span className="font-semibold text-gray-900">{totalItems}</span> mục
      </p>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
        <button
          type="button"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          Trước
        </button>

        {visiblePages.map((page, index) =>
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
              ...
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => goToPage(page as number)}
              className={`min-w-10 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                currentPage === page
                  ? 'bg-cyan-600 text-white border-cyan-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Sau
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}