import { MeshBackground } from "@/components/auth/mesh-background";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <MeshBackground />
      <Card className="gradient-border w-full max-w-md bg-card/85 shadow-2xl shadow-primary/10 backdrop-blur-xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-linear-to-br from-primary via-brand-fuchsia to-brand-emerald text-primary-foreground shadow-lg shadow-primary/30">
            <span className="font-heading text-lg font-bold">S</span>
          </div>
          <CardTitle className="font-heading text-2xl">
            <span className="gradient-text">ScholarOS</span>
          </CardTitle>
          <CardDescription>Sign in to your school portal</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
