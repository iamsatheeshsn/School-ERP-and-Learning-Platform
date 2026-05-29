import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  GraduationCap,
  MessageSquare,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: BookOpen,
    title: "Homework & AI Tutor",
    description:
      "Assign, submit, and get Socratic AI guidance — without giving away answers.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    description:
      "Track attendance, grades, and at-risk students with actionable cohort insights.",
  },
  {
    icon: Wallet,
    title: "Fee Management",
    description:
      "Generate invoices, collect payments, and keep parents informed in one place.",
  },
  {
    icon: MessageSquare,
    title: "Parent Communication",
    description:
      "Secure messaging threads and AI-drafted updates between teachers and families.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-heading text-lg font-semibold">
            <GraduationCap className="size-6 text-primary" />
            ScholarOS
          </div>
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Sign in
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-border/60">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-violet-500/10 via-transparent to-blue-500/10" />
        <div className="pointer-events-none absolute -left-32 top-0 size-96 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-0 size-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 py-24 text-center md:py-32">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/60 px-3 py-1 text-sm text-muted-foreground backdrop-blur-sm">
            <Sparkles className="size-4 text-violet-500" />
            AI-powered school ERP
          </div>
          <h1 className="max-w-3xl font-heading text-4xl font-bold tracking-tight text-foreground md:text-6xl">
            Run your school with clarity, care, and{" "}
            <span className="bg-linear-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
              intelligent tools
            </span>
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            ScholarOS connects admins, teachers, parents, and students — from
            attendance and grades to fees, messaging, and an AI homework tutor.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/login" className={buttonVariants({ size: "lg" })}>
              Get started
            </Link>
            <Link
              href="/login"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Sign in to portal
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight">
            Everything your school needs
          </h2>
          <p className="mt-2 text-muted-foreground">
            Role-based dashboards for every stakeholder in your community.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="border-border/80 bg-card/50 backdrop-blur-sm"
              >
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <CardTitle className="font-heading text-lg">
                    {feature.title}
                  </CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            );
          })}
        </div>
      </section>

      <footer className="mt-auto border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} ScholarOS. School ERP Platform.
      </footer>
    </div>
  );
}
