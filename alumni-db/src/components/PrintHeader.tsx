export default function PrintHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="print-header">
      <h1>UP Alpha Sigma Fraternity Alumni Association</h1>
      <p>{title}{subtitle ? ` — ${subtitle}` : ""}</p>
    </div>
  );
}
