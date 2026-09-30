import { Button } from "@/components/ui/button";
import { getPageItems } from "@/lib/ui/pageItems";

function Pagination({
  page,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (p: number) => void;
}) {
  // At least 1 so an empty list reads "Page 1 of 1", not "Page 1 of 0".
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // New (always render)
  if (totalPages <= 1) {
    return (
      <div className="flex justify-center mt-6 text-sm text-gray-500">
        Page {page} of {totalPages}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
      <Button
        variant="outline"
        size="sm"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>

      {getPageItems(page, totalPages).map((p, i) =>
        p === "gap" ? (
          <span
            key={`gap-${i}`}
            className="px-1 text-sm text-muted-foreground"
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </Button>
        )
      )}

      <Button
        variant="outline"
        size="sm"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}

export { Pagination };
