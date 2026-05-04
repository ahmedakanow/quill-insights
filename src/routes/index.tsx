import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, PenLine, FileText, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-accent" />
            <span className="font-display text-2xl font-semibold">Quill</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/register"><Button size="sm">Get started</Button></Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <GraduationCap className="h-3.5 w-3.5 text-accent" />
          For UK sixth-formers preparing for Oxford & Cambridge
        </div>
        <h1 className="mt-6 font-display text-5xl font-semibold leading-tight md:text-6xl">
          Read deeply. <span className="text-accent">Think critically.</span><br />
          Get into Oxbridge.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground font-serif-reading">
          The reading platform built for ambitious sixth-formers preparing for Oxford and Cambridge.
          Curated reading lists, structured reflections, and a personal statement workbench — all in one place.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/register"><Button size="lg">Get Started Free</Button></Link>
          <Link to="/login"><Button size="lg" variant="outline">Explore the Library</Button></Link>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">Used by students at 50+ UK sixth forms</p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: BookOpen, title: "Curated Reading Lists", body: "Subject-specific books recommended by Oxbridge tutors — from accessible introductions to core texts." },
            { icon: PenLine, title: "Structured Reflections", body: "Build interview-ready thinking, not just reading minutes. Five-prompt reflections after every book." },
            { icon: FileText, title: "Personal Statement Workbench", body: "Turn your reading into a compelling application, with reflections linked to each section." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6 shadow-warm">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-secondary text-accent">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground font-serif-reading leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © Quill — Built for the curious.
      </footer>
    </div>
  );
}
