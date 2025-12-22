'use client';

import Link from "next/link";
import { ArrowUpRight, FileText, Download } from "lucide-react";
import { motion } from "framer-motion";
import { PROFILE, EDUCATION, NEWS, PUBLICATIONS, AWARDS } from "@/app/lib/data";
// Dynamically import PDFDownloadLink is no longer needed
// import dynamic from "next/dynamic";

export default function Home() {
    const fadeInUp = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5 }
    };

    const staggerContainer = {
        animate: {
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    return (
        <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="space-y-20"
        >

            {/* About Section */}
            <motion.section id="about" className="scroll-mt-20" variants={fadeInUp}>
                <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-8">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">About Me</h2>

                    {/* CV Download Button */}
                    <div className="flex items-center gap-2">
                        <a
                            href="/cv.pdf"
                            download="Junhoo_Lee_CV.pdf"
                            className="text-sm font-medium text-stone-600 hover:text-stone-900 flex items-center gap-1 transition-colors px-3 py-1.5 rounded-md border border-stone-200 hover:border-stone-400 bg-white"
                        >
                            <Download size={14} /> Download CV
                        </a>
                    </div>
                </div>

                <div className="prose prose-lg text-gray-700 leading-relaxed">
                    {PROFILE.bio.map((paragraph, i) => (
                        <p key={i} className="mb-4" dangerouslySetInnerHTML={{
                            // Simple hack to render HTML in bio strings if needed, 
                            // or just render text. The current data has plain text mostly.
                            // For safety/flexibility let's assume simple text for now or simple inner HTML replacers if we want bold.
                            // Actual data.ts has plain strings but the original had <strong>. 
                            // Let's re-inject strong tags or handle it. 
                            // For now, let's just render the text. 
                            // If we want bolding, we should parse it or keep it simple.
                            __html: paragraph
                                .replace("Junhoo Lee", "<strong>Junhoo Lee</strong>")
                                .replace("optimization theory", "<strong>optimization theory</strong>")
                                .replace("modern generative AI", "<strong>modern generative AI</strong>")
                                .replace("Diffusion Models", "<strong>Diffusion Models</strong>")
                                .replace("LLMs", "<strong>LLMs</strong>")
                        }}></p>
                    ))}
                    <p>
                        I am always open to discussing new ideas and potential collaborations. Feel free to reach out to me via email at <a href={`mailto:${PROFILE.email}`} className="text-blue-600 hover:text-blue-800 transition-colors">{PROFILE.email}</a>.
                    </p>
                </div>

                <div className="mt-10 pt-8 border-t border-gray-100">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">Education</h3>
                    <div className="space-y-4">
                        {EDUCATION.map((edu, i) => (
                            <div key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline">
                                <div className="flex flex-col">
                                    <span className="font-bold text-gray-900">{edu.degree}</span>
                                    <span className="text-gray-600">{edu.institution}</span>
                                </div>
                                <div className="text-gray-500 font-mono text-sm mt-1 sm:mt-0 shrink-0">
                                    {edu.period}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.section>


            {/* News Section */}
            <motion.section id="news" className="scroll-mt-20" variants={fadeInUp}>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 border-b border-gray-200 pb-4 mb-8">News</h2>
                <ul className="space-y-4 text-gray-700 text-sm">
                    {NEWS.map((item, i) => (
                        <li key={i} className="flex gap-2">
                            <span className="font-bold min-w-[100px] text-gray-500">[{item.date}]</span>
                            <span>
                                {item.content.split(item.linkText)[0]}
                                <a href={item.link} target="_blank" className="text-blue-600 hover:text-blue-800 hover:underline transition-all">
                                    {item.linkText}
                                </a>
                                {item.content.split(item.linkText)[1]}
                            </span>
                        </li>
                    ))}
                </ul>
            </motion.section>

            {/* Publications Section */}
            <motion.section id="publications" className="scroll-mt-20" variants={fadeInUp}>
                <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-8">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Publications</h2>
                    <a href="https://scholar.google.com/citations?user=CvvfGxkAAAAJ&hl=ko&authuser=3" target="_blank" className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors">
                        View Google Scholar <ArrowUpRight size={14} />
                    </a>
                </div>

                <div className="space-y-12">
                    {PUBLICATIONS.map((section, i) => {
                        const sectionColorMap: Record<string, string> = {
                            blue: 'bg-blue-600',
                            teal: 'bg-teal-500',
                            indigo: 'bg-indigo-500',
                            gray: 'bg-gray-400'
                        };
                        const colorClass = sectionColorMap[section.color] || 'bg-gray-400';

                        return (
                            <div key={i}>
                                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${colorClass}`}></span>
                                    {section.section}
                                </h3>
                                <div className="space-y-8 pl-4 border-l-2 border-gray-100">
                                    {section.items.map((pub, j) => (
                                        <PublicationItem key={j} {...pub} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </motion.section>

            {/* Awards & Honors Section */}
            <motion.section id="awards" className="scroll-mt-20" variants={fadeInUp}>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 border-b border-gray-200 pb-4 mb-8">Awards & Honors</h2>
                <div className="space-y-4">
                    {AWARDS.map((award, i) => (
                        <AwardsItem key={i} {...award} />
                    ))}
                </div>
            </motion.section>

        </motion.div>
    );
}

function PublicationItem({ title, authors, venue, year, link, tldr, category, subTag }: { title: string, authors: string[], venue: string, year: string, link: string, tldr: string, category: string, subTag: string }) {

    const getCategoryColor = (cat: string) => {
        switch (cat) {
            case 'Large Language Models': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'Generative Models': return 'bg-violet-100 text-violet-800 border-violet-200';
            case 'Learning Theory': return 'bg-slate-100 text-slate-800 border-slate-200';
            case 'Knowledge Distillation': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
            case 'Meta-Learning': return 'bg-sky-100 text-sky-800 border-sky-200';
            case 'Data Efficiency': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="group relative">
            <h4 className="text-lg font-bold text-gray-900 mb-2 transition-colors duration-200 flex items-start justify-between gap-4">
                <a href={link} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline decoration-blue-500 underline-offset-4 decoration-2">
                    {title}
                </a>
            </h4>

            <div className="flex flex-wrap gap-2 mb-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getCategoryColor(category)}`}>
                    {venue}
                </span>
                <span className="text-xs font-medium text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                    {category}
                </span>
                <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-100">
                    {subTag}
                </span>
            </div>

            <div className="text-gray-600 mb-2 font-medium">
                {authors.map((author, i) => {
                    const isJunhoo = author.includes("Junhoo Lee");
                    return (
                        <span key={i}>
                            <span className={isJunhoo ? "text-gray-900 font-semibold border-b-2 border-blue-100" : "text-gray-600"}>
                                {author}
                            </span>
                            {i < authors.length - 1 ? ", " : ""}
                        </span>
                    );
                })}
            </div>

            <div className="hidden">
                {/* Leftover for backward compat layout if needed but cleaner to remove */}
            </div>

            <p className="text-sm text-gray-600 leading-relaxed italic border-l-2 border-gray-200 pl-3">
                {tldr}
            </p>

            <div className="mt-3 flex gap-3 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-gray-600 hover:text-blue-600">
                    <FileText size={14} /> View Paper
                </a>
            </div>
        </div>
    )
}

function AwardsItem({ year, title, amount }: { year: string, title: string, amount?: string }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 text-gray-700">
            <span className="font-bold text-gray-400 font-mono w-[60px] shrink-0">{year}</span>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                <span className="font-medium text-gray-800">{title}</span>
                {amount && <span className="text-gray-400 text-xs sm:text-sm font-normal">({amount})</span>}
            </div>
        </div>
    )
}

