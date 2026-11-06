import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { worldVerifications } from "@/lib/db/schema";

/** True when this player (any linked wallet) has a stored World ID proof. */
export async function isPlayerVerified(playerKey: string): Promise<boolean> {
  const rows = await db
    .select({ k: worldVerifications.playerKey })
    .from(worldVerifications)
    .where(eq(worldVerifications.playerKey, playerKey.toLowerCase()))
    .limit(1);
  return rows.length > 0;
}
