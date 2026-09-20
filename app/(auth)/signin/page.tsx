import { redirect } from "next/navigation";

import { SignInForm } from "@/components/sign-in-form";
import { getServerSession } from "@/lib/get-session";

export default async function SignInPage() {
  const session = await getServerSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <SignInForm />
    </div>
  );
}