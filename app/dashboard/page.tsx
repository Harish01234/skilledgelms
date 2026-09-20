import { redirect } from "next/navigation";

import { Navbar } from "@/components/navbar";
import { getServerSession } from "@/lib/get-session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/signin");
  }

  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Welcome back, {session.user.name.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground">Here's what's happening with your account.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{session.user.email}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Signed in</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}