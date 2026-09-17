import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  className = "",
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [
      1,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages,
    ];
  };

  const pages = getPageNumbers();

  const handlePrev = () => {
    if (currentPage > 1 && onPageChange) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && onPageChange) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div
      className={`p-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-[#64748B] bg-white ${className}`}>
      <div className="text-xs sm:text-sm">
        Showing{" "}
        <span className="font-semibold text-slate-800">{startItem}</span> to{" "}
        <span className="font-semibold text-slate-800">{endItem}</span> of{" "}
        <span className="font-semibold text-slate-800">{totalItems}</span>{" "}
        entries
      </div>

      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentPage <= 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-xs font-semibold text-slate-700 hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous Page">
          <ChevronLeft size={15} />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {pages.map((p, idx) => {
          if (p === "...") {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="px-2 py-1 text-xs text-slate-400 select-none font-bold">
                ...
              </span>
            );
          }

          const isActive = currentPage === p;
          return (
            <button
              key={`page-${p}`}
              type="button"
              onClick={() => onPageChange && onPageChange(p)}
              className={`min-w-[32px] h-8 px-2.5 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? "bg-[#0D47A1] text-white shadow-xs"
                  : "border border-[#E2E8F0] text-slate-700 hover:bg-[#F8FAFC] hover:border-slate-300"
              }`}>
              {p}
            </button>
          );
        })}

        <button
          type="button"
          onClick={handleNext}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-xs font-semibold text-slate-700 hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next Page">
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
