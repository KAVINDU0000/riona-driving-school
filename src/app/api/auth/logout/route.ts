import { logoutResponse } from "@/lib/auth/login";

export async function POST() {
  return logoutResponse();
}
