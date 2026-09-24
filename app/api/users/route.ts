// app/api/users/route.ts
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/get-session";

export async function GET() {
  const session = await getServerSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { role: "user" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return Response.json(users);
}