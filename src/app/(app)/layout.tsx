import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageTransition } from "@/components/shared/PageTransition";
import { CommandPalette } from "@/components/shared/CommandPalette";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      {/* Ambient drift orbs */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: '-100px',
          right: '-100px',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.03) 0%, rgba(139,92,246,0.02) 50%, transparent 70%)',
          animation: 'ambient-drift-1 20s ease-in-out infinite',
          zIndex: 0,
        }}
      />
      <div
        className="fixed pointer-events-none"
        style={{
          bottom: '-80px',
          left: '-80px',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.02) 0%, rgba(6,182,212,0.015) 50%, transparent 70%)',
          animation: 'ambient-drift-2 25s ease-in-out infinite',
          zIndex: 0,
        }}
      />
      <Navbar />
      <main
        id="main-content"
        className="flex-1 pt-16 pb-20 md:pb-0 relative"
        style={{ zIndex: 1 }}
      >
        <PageTransition>{children}</PageTransition>
      </main>
      <BottomNav />
      <CommandPalette />
    </>
  );
}
