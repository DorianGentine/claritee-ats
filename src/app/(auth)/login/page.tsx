import { Suspense } from "react";
import { LoginForm } from "./LoginForm";
import { LoginFormSkeleton } from "./LoginFormSkeleton";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-background p-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Connexion
          </h1>
          <p className="text-sm text-muted-foreground">
            Connectez-vous à votre compte.
          </p>
        </div>

        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
