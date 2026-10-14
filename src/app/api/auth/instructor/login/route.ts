import { loginInstructor } from "@/lib/auth/login";

export async function POST(request: Request) {
  return loginInstructor(request);
}
