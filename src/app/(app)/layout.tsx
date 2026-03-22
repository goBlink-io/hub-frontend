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
      <Navbar />
      <main
        id="main-content"
        className="flex-1 pt-16 pb-20 md:pb-0"
      >
        <PageTransition>{children}</PageTransition>
      </main>
      <BottomNav />
      <CommandPalette />
    </>
  );
}
