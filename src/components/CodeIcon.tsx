export default function CodeIcon({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-white rounded-full flex items-center justify-center shadow ${className}`}
    >
      <svg
        className="w-[54%] h-[54%]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#facc15"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="8 4 3 12 8 20" />
        <polyline points="16 4 21 12 16 20" />
      </svg>
    </div>
  );
}
