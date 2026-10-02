import { ChevronLeft, ChevronRight } from 'lucide-react';

// « Previous · Page 2 of 5 (93 members) · Next »; nothing when everything fits on one page
export default function Pagination({ page, pages, total, noun = 'items', loading = false, onChange }) {
  if (!pages || pages <= 1) return null;
  return (
    <nav aria-label="Pages" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, margin: '18px 0 6px', flexWrap: 'wrap' }}>
      <button className="btn btn-outline btn-sm" disabled={loading || page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft size={14} /> Previous
      </button>
      <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }} aria-live="polite">
        Page <strong style={{ color: 'var(--color-text)' }}>{page}</strong> of {pages}
        {total !== undefined && <> · {total} {noun}</>}
      </span>
      <button className="btn btn-outline btn-sm" disabled={loading || page >= pages} onClick={() => onChange(page + 1)}>
        Next <ChevronRight size={14} />
      </button>
    </nav>
  );
}
