import { loginStudent } from "@/lib/auth/login";

export async function POST(request: Request) {
  return loginStudent(request);
}
