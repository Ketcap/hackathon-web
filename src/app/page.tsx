import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AnimatedCard } from "@/components/auth/animated-card";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div
      className="min-h-screen bg-background relative flex items-center justify-center"
      style={{
        backgroundImage: "radial-gradient(#323232 1px, transparent 1px)",
        backgroundSize: "30px 30px",
        opacity: 1,
      }}
    >
      <AnimatedCard />
    </div>
  );
}
