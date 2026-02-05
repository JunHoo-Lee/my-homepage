'use client';

import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { FileText, Github, Youtube, Database, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function DROPage() {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(bibtex);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const bibtex = `@article{dro2026project,
  title={DRO: Distributional Robust Optimization for Dummy Projects},
  author={Lee, Junhoo and Doe, John},
  journal={Journal of Dummy Projects},
  year={2026}
}`;

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
            <div className="max-w-4xl mx-auto px-6 py-12 sm:py-20 space-y-16 sm:space-y-24">

                {/* Header Section */}
                <header className="text-center space-y-8">
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 !leading-tight">
                        DRO: Distributional Robust Optimization <br className="hidden sm:block" /> for Dummy Projects
                    </h1>

                    <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-lg">
                        <span className="font-medium text-blue-600">Junhoo Lee*</span>
                        <span className="font-medium">John Doe*</span>
                        <span className="font-medium">Jane Smith</span>
                    </div>

                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-gray-500">
                        <span>KAIST</span>
                        <span>•</span>
                        <span>Google DeepMind</span>
                        <span>•</span>
                        <span>University of Dummy</span>
                    </div>

                    <div className="flex flex-wrap justify-center gap-4 pt-4">
                        <ActionButton href="#" icon={<FileText size={18} />} text="Paper" />
                        <ActionButton href="#" icon={<Github size={18} />} text="Code" />
                        <ActionButton href="#" icon={<Youtube size={18} />} text="Video" />
                        <ActionButton href="#" icon={<Database size={18} />} text="Data" />
                    </div>
                </header>

                {/* Teaser Section */}
                <section className="space-y-6">
                    <div className="relative w-full aspect-video bg-gray-100 rounded-xl overflow-hidden shadow-lg border border-gray-100 flex items-center justify-center">
                        {/* Placeholder for Video/Image */}
                        <p className="text-gray-400 font-medium">Teaser Video / Image Placeholder</p>
                    </div>
                    <p className="text-gray-600 text-center max-w-2xl mx-auto">
                        Figure 1: This is a teaser figure describing the main idea of the project. It captures the essence of the work in a single glance.
                    </p>
                </section>


                {/* Abstract Section */}
                <section className="space-y-6">
                    <h2 className="text-3xl font-bold text-center text-gray-800">Abstract</h2>
                    <p className="text-lg leading-relaxed text-gray-700 text-justify">
                        This is a dummy abstract for the DRO project. It explains the core problem, the proposed solution, and the key results.
                        Distributional Robust Optimization (DRO) is a key technique in modern machine learning to ensure models perform well across different data distributions.
                        Our work proposes a novel approach to DRO that leverages recent advances in generative models.
                        We demonstrate superior performance on standard benchmarks and provide theoretical guarantees for our method.
                        The results show that our method is not only robust but also efficient in terms of sample complexity.
                    </p>
                </section>

                {/* Method Section */}
                <section className="space-y-8">
                    <h2 className="text-3xl font-bold text-center text-gray-800">Method</h2>
                    <div className="space-y-6">
                        <p className="text-lg leading-relaxed text-gray-700">
                            Our method consists of three key components: (1) robust data sampling, (2) adaptive regularization, and (3) efficient optimization.
                            We illustrate the overview of our pipeline below.
                        </p>
                        <div className="w-full h-64 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center">
                            <span className="text-gray-400">Method Diagram Placeholder</span>
                        </div>
                        <p className="text-lg leading-relaxed text-gray-700">
                            Detailed explanation of the algorithm goes here. We use a minimax formulation to minimize the worst-case loss over a set of uncertainty sets.
                            This allows the model to generalize better to unseen sub-populations.
                        </p>
                    </div>
                </section>

                {/* Results Section */}
                <section className="space-y-8">
                    <h2 className="text-3xl font-bold text-center text-gray-800">Results</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="aspect-[4/3] bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center">
                            <span className="text-gray-400">Result Chart 1</span>
                        </div>
                        <div className="aspect-[4/3] bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center">
                            <span className="text-gray-400">Result Chart 2</span>
                        </div>
                    </div>
                    <p className="text-lg leading-relaxed text-gray-700">
                        We compare our method with state-of-the-art baselines on various datasets.
                        As shown in the figures, our method achieves significant improvements in worst-group accuracy without compromising average accuracy.
                    </p>
                </section>

                {/* BibTeX Section */}
                <section className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-800">BibTeX</h3>
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                    <pre className="text-xs sm:text-sm overflow-x-auto p-4 bg-white rounded-lg border border-gray-200 text-gray-600 font-mono leading-relaxed">
                        {bibtex}
                    </pre>
                </section>

                {/* Footer */}
                <footer className="pt-12 pb-8 text-center text-gray-400 text-sm">
                    <p>© 2026 Junhoo Lee. This page is adapted from the <a href="https://github.com/eliahuhorwitz/Academic-project-page-template" target="_blank" className="hover:text-gray-600 underline">Academic Project Page Template</a>.</p>
                </footer>

            </div>
        </div>
    );
}

function ActionButton({ href, icon, text }: { href: string, icon: React.ReactNode, text: string }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 hover:-translate-y-0.5 transition-all shadow-md hover:shadow-lg"
        >
            {icon}
            <span>{text}</span>
        </Link>
    );
}
