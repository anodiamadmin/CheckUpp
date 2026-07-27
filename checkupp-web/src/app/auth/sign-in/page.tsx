import { SignInForm } from "@/components/auth/sign-in-form";

interface SignInPageProps {
  searchParams: Promise<{
    next?: string;
  }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const nextPath = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/app";

  return <SignInForm nextPath={nextPath} />;
}
