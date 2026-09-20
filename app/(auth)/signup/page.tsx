import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/sign-up-form";
import { getServerSession } from "@/lib/get-session";

export default async function SignUpPage() {
  const session = await getServerSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <SignUpForm />
    </div>
  );
}