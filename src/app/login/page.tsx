import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="text-muted-foreground mt-2">Sign in to BookFlow</p>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-muted-foreground mt-6">
          Don&apos;t have an account?{" "}
          <a href="/signup" className="text-primary hover:underline">
            Sign up free
          </a>
        </p>
      </div>
    </div>
  );
}
