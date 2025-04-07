import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ActionButtons } from "@/components/dashboard/action-buttons";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/");
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
      <div className="w-full max-w-md space-y-4">
        <Card className="border-border/50 bg-background/60 backdrop-blur-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tighter text-center">
              Welcome, {session.user.email}
            </CardTitle>
            <CardDescription className="text-center">
              What would you like to do?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionButtons />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
