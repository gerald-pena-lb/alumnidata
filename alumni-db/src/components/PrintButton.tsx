"use client";

interface PrintButtonProps {
  label?: string;
  className?: string;
}

export default function PrintButton({ label = "Download PDF", className }: PrintButtonProps) {
  function handlePrint() {
    window.print();
  }

  return (
    <button
      onClick={handlePrint}
      className={className || "px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50 print:hidden flex items-center gap-1.5"}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {label}
    </button>
  );
}
