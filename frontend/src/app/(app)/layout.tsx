import Topbar from "@/components/layout/Topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#f2f4f6]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0f172a]/8 to-transparent" />
      <Topbar />
      <main className="relative mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
