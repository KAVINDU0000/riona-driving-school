import { loginAdmin } from "@/lib/auth/login";

export async function POST(request: Request) {
  return loginAdmin(request);
}
