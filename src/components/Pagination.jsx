export default function Pagination({ meta, onPage }) {
  if (!meta) return null;
  const { page, totalPages, total } = meta;
  return (
    <div className="pager">
      <span>
        Page {page} of {totalPages} · {total} records
      </span>
      <div className="btn-row">
        <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <button type="button" className="btn btn-ghost" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
