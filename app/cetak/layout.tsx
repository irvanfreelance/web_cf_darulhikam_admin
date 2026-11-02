export default function CetakLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white px-8 py-10 text-slate-900 print:px-0 print:py-0">{children}</div>;
}
