import { logoutResponse } from "@/lib/auth/login";

export async function POST(request: Request) {
  return logoutResponse(request);
}
