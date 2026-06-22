import Topbar from "@/components/layout/Topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f2f4f6]">
      <Topbar />
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
