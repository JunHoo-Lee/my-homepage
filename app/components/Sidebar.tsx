'use client';

import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Download, Github, GraduationCap, Linkedin, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";

const primaryLinks = [
  { href: "/#overview", label: "Overview" },
  { href: "/#featured", label: "Featured Work" },
  { href: "/#about", label: "Research" },
  { href: "/#news", label: "News" },
  { href: "/#publications", label: "Publications" },
  { href: "/#awards", label: "Honors" },
];

export default function Sidebar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <aside className="w-full md:fixed md:left-0 md:top-0 md:h-screen md:w-[19rem]">
      <div className="flex h-full flex-col border-b border-stone-200/80 bg-stone-950 px-5 py-6 text-stone-100 md:border-b-0 md:border-r md:border-stone-800/80 md:px-6 md:py-8">
        <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_40px_-32px_rgba(0,0,0,0.9)]">
          <div className="mx-auto h-32 w-32 overflow-hidden rounded-full border border-white/15 bg-stone-900 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.75)] sm:h-36 sm:w-36">
            <div className="relative h-full w-full">
              <Image
                src="/myface.jpeg"
                alt="Junhoo Lee"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 8rem, 9rem"
                priority
              />
            </div>
          </div>

          <div className="mt-5 text-center">
            <h1 className="font-serif text-3xl text-stone-50">Junhoo Lee</h1>
            <p className="mt-2 text-sm font-medium uppercase tracking-[0.16em] text-stone-400">
              Ph.D. Candidate
            </p>
            <p className="mt-3 text-sm leading-6 text-stone-300">
              Optimization theory for generative models, diffusion LMs, and controllable AI.
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-stone-500">
              Seoul National University · MIPAL
            </p>
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Pill href="/cv.pdf" label="Download CV" icon={Download} />
            <Pill href="mailto:mrjunoo@snu.ac.kr" label="Email" icon={Mail} />
          </div>
        </div>

        <div className="mt-6 grid gap-2">
          <QuickSignal label="Current" value="ACL 2026 · CVPR 2026" />
          <QuickSignal label="Focus" value="Diffusion LMs · controllability" />
          <QuickSignal label="Style" value="theory -> behavior -> systems" />
        </div>

        <nav className="mt-8 flex-1">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
            Navigate
          </p>
          <ul className="space-y-2">
            {primaryLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-stone-300 transition hover:border-white/10 hover:bg-white/[0.05] hover:text-stone-50"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {isAuthenticated && (
            <div className="mt-8 border-t border-white/10 pt-5">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
                Personal
              </p>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/tasks"
                    className="block rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-stone-300 transition hover:border-white/10 hover:bg-white/[0.05] hover:text-stone-50"
                  >
                    Tasks
                  </Link>
                </li>
                <li>
                  <Link
                    href="/papers"
                    className="block rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-stone-300 transition hover:border-white/10 hover:bg-white/[0.05] hover:text-stone-50"
                  >
                    Papers
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </nav>

        <div className="mt-8 border-t border-white/10 pt-5">
          <div className="flex items-center justify-center gap-3">
            <SocialIcon
              href="https://github.com/JunHoo-Lee"
              label="GitHub"
              icon={<Github className="h-4 w-4" />}
            />
            <SocialIcon
              href="https://scholar.google.com/citations?user=CvvfGxkAAAAJ&hl=ko&authuser=3"
              label="Google Scholar"
              icon={<GraduationCap className="h-4 w-4" />}
            />
            <SocialIcon
              href="https://www.linkedin.com/in/junhoo-lee-8483b62a5/"
              label="LinkedIn"
              icon={<Linkedin className="h-4 w-4" />}
            />
          </div>
          <p className="mt-4 text-center text-xs uppercase tracking-[0.18em] text-stone-500">
            © {new Date().getFullYear()} Junhoo Lee
          </p>
        </div>
      </div>
    </aside>
  );
}

function Pill({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  const Icon = icon;

  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-stone-100 transition hover:border-white/20 hover:bg-white/[0.1]"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}

function QuickSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-stone-200">{value}</p>
    </div>
  );
}

function SocialIcon({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-stone-200 transition hover:border-white/20 hover:bg-white/[0.1] hover:text-stone-50"
    >
      {icon}
    </a>
  );
}
