export default function EmptyState({ title = 'Nothing here yet', hint }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {hint ? <p>{hint}</p> : null}
    </div>
  );
}
