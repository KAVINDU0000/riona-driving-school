import { prisma } from "@/lib/prisma";

/** Ids of the packages currently offered (isActive in the database). The signup list shows only these. */
export async function getActivePackageIds(): Promise<string[]> {
  const rows = await prisma.trainingPackage.findMany({ where: { isActive: true }, select: { id: true } });
  return rows.map((row) => row.id);
}
