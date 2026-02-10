interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalResults: number;
  resultsPerPage: number;
  onPageChange: (page: number) => void;
}

export function TablePagination({
  currentPage,
  totalPages,
  totalResults,
  resultsPerPage,
  onPageChange
}: TablePaginationProps) {
  const startResult = (currentPage - 1) * resultsPerPage + 1;
  const endResult = Math.min(currentPage * resultsPerPage, totalResults);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxPagesToShow = 3;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show current page and neighbors
      const start = Math.max(1, currentPage - 1);
      const end = Math.min(totalPages, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-between p-4 border-t border-[#f3f0f4] dark:border-white/5 bg-white/30 dark:bg-black/10">
      {/* Results info */}
      <p className="text-xs text-[#7c6189]">
        Mostrando{' '}
        <span className="font-bold">
          {startResult}-{endResult}
        </span>{' '}
        de <span className="font-bold">{totalResults}</span> resultados
      </p>

      {/* Pagination controls */}
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-xs font-bold text-[#7c6189] hover:bg-white/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Anterior
        </button>

        {pageNumbers.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              page === currentPage
                ? 'text-[#820AD1] bg-[#820AD1]/10'
                : 'text-[#7c6189] hover:bg-white/50'
            }`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 text-xs font-bold text-[#7c6189] hover:bg-white/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Próximo
        </button>
      </div>
    </div>
  );
}
