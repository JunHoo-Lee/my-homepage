'use client';

import Image from "next/image";
import Link from "next/link";
import { Mail, Github, Linkedin, GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";

export default function Sidebar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkUser();

    // Subscribe to auth changes to update sidebar immediately on login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  return (
    <aside className="z-10 flex w-full flex-col items-center overflow-y-auto border-b border-[color:var(--research-border)] bg-white/90 p-5 text-center backdrop-blur-sm md:fixed md:left-0 md:top-0 md:h-screen md:w-72 md:border-b-0 md:border-r md:p-8">
      <div className="mb-4 md:mb-6">
        <div className="relative mx-auto h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-[0_20px_45px_-25px_rgba(22,57,88,0.7)] md:h-40 md:w-40">
          <Image
            src="/myface.jpeg"
            alt="Junhoo Lee"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>

      <h1 className="mb-1 text-2xl font-semibold text-[var(--research-ink)] [font-family:var(--font-source-serif),serif] md:mb-2 md:text-3xl">Junhoo Lee</h1>
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--research-primary)] md:text-sm md:tracking-[0.14em]">PhD Student</p>
      <p className="mb-3 text-xs text-[color:var(--research-muted)] md:mb-4 md:text-sm">Seoul National University (MIPAL)</p>

      <div className="mb-6 flex w-full flex-col gap-2 text-xs md:mb-8 md:text-sm">
        <a href="mailto:mrjunoo@snu.ac.kr" className="flex items-center justify-center gap-2 text-[color:var(--research-muted)] transition-colors hover:text-[color:var(--research-primary)]">
          <Mail size={16} /> mrjunoo@snu.ac.kr
        </a>
        <a
          href="/cv.pdf"
          download="Junhoo_Lee_CV.pdf"
          className="mx-auto mt-1 inline-flex items-center justify-center rounded-lg border border-[color:var(--research-border)] bg-[color:var(--research-paper)] px-3 py-1 text-xs font-semibold text-[color:var(--research-primary)] transition-colors hover:border-[color:var(--research-primary)]"
        >
          Download CV
        </a>
        <div className="flex justify-center gap-4 mt-2">
          <a href="https://github.com/JunHoo-Lee" target="_blank" rel="noopener noreferrer" className="text-[color:var(--research-muted)] transition-all hover:scale-110 hover:text-[color:var(--research-primary)]">
            <Github size={20} />
          </a>
          <a href="https://scholar.google.com/citations?user=CvvfGxkAAAAJ&hl=ko&authuser=3" target="_blank" rel="noopener noreferrer" className="text-[color:var(--research-muted)] transition-all hover:scale-110 hover:text-[color:var(--research-primary)]">
            <GraduationCap size={20} />
          </a>
          <a href="https://www.linkedin.com/in/junhoo-lee-8483b62a5/" target="_blank" rel="noopener noreferrer" className="text-[color:var(--research-muted)] transition-all hover:scale-110 hover:text-[color:var(--research-primary)]">
            <Linkedin size={20} />
          </a>
        </div>
      </div>

      <nav className="w-full flex-1">
        <ul className="space-y-1.5 text-sm font-medium text-[color:var(--research-muted)]">
          <li><Link href="/#about" className="block rounded-xl border border-transparent py-2 transition-colors hover:border-[color:var(--research-border)] hover:bg-[color:var(--research-paper)] hover:text-[color:var(--research-primary)]">About Me</Link></li>
          <li><Link href="/#news" className="block rounded-xl border border-transparent py-2 transition-colors hover:border-[color:var(--research-border)] hover:bg-[color:var(--research-paper)] hover:text-[color:var(--research-primary)]">News</Link></li>
          <li><Link href="/#publications" className="block rounded-xl border border-transparent py-2 transition-colors hover:border-[color:var(--research-border)] hover:bg-[color:var(--research-paper)] hover:text-[color:var(--research-primary)]">Publications</Link></li>
          <li><Link href="/#awards" className="block rounded-xl border border-transparent py-2 transition-colors hover:border-[color:var(--research-border)] hover:bg-[color:var(--research-paper)] hover:text-[color:var(--research-primary)]">Awards</Link></li>
        </ul>

        {/* Private Links - Only visible when authenticated */}
        {isAuthenticated && (
          <div className="mt-8 border-t border-[color:var(--research-border)] pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--research-muted)]">Personal</p>
            <ul className="space-y-2 text-sm font-medium text-[color:var(--research-muted)]">
              <li><Link href="/tasks" className="block rounded-xl border border-transparent py-2 transition-colors hover:border-[color:var(--research-border)] hover:bg-[color:var(--research-paper)] hover:text-[color:var(--research-primary)]">Tasks</Link></li>
              <li><Link href="/papers" className="block rounded-xl border border-transparent py-2 transition-colors hover:border-[color:var(--research-border)] hover:bg-[color:var(--research-paper)] hover:text-[color:var(--research-primary)]">Papers</Link></li>
            </ul>
          </div>
        )}
      </nav>

      <div className="mt-8 text-xs text-[color:var(--research-muted)]">
        © {new Date().getFullYear()} Junhoo Lee
      </div>
    </aside>
  );
}
