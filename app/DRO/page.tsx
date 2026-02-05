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
  title={Discriminative Ranking Optimization is all you need in Multiple-Choice Question Answering},
  author={Lee, Junhoo},
  year={2026}
}`;

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
            <div className="max-w-4xl mx-auto px-6 py-12 sm:py-20 space-y-16 sm:space-y-24">

                {/* Header Section */}
                <header className="text-center space-y-8">
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 !leading-tight">
                        Discriminative Ranking Optimization <br className="hidden sm:block" /> is all you need in Multiple-Choice QA
                    </h1>

                    <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-lg">
                        <span className="font-medium text-blue-600">Junhoo Lee</span>
                    </div>

                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-gray-500">
                        <span>Seoul National University</span>
                    </div>

                    <div className="flex flex-wrap justify-center gap-4 pt-4">
                        <ActionButton href="#" icon={<FileText size={18} />} text="Paper" />
                        <ActionButton href="#" icon={<Github size={18} />} text="Code" />
                        {/* <ActionButton href="#" icon={<Youtube size={18} />} text="Video" /> */}
                        <ActionButton href="#" icon={<Database size={18} />} text="Data" />
                    </div>
                </header>

                {/* Teaser Section */}
                <section className="space-y-6">
                    <div className="relative w-full aspect-video bg-gray-50 rounded-xl overflow-hidden shadow-sm border border-gray-100 flex items-center justify-center">
                        <Image
                            src="/DRO/image.png"
                            alt="Illustration of the Objective Mismatch"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <p className="text-gray-600 text-center max-w-2xl mx-auto italic">
                        Figure 1: Illustration of the Objective Mismatch. Standard SFT (left) inefficiently optimizes for global vocabulary suppression, while the ARC protocol (right) only requires local ranking between candidates.
                    </p>
                </section>

                {/* Abstract Section */}
                <section className="space-y-6">
                    <h2 className="text-3xl font-bold text-center text-gray-800">Abstract</h2>
                    <p className="text-lg leading-relaxed text-gray-700 text-justify">
                        Standard Supervised Fine-Tuning (SFT) for Multiple-Choice Question (MCQ) reasoning tasks suffers from a fundamental objective mismatch. While SFT optimizes the probability distribution over the global vocabulary to enforce generative fluency, MCQ evaluation relies strictly on the local ranking of candidate options. Consequently, SFT inefficiently allocates parameter capacity to correcting surface-level behaviors rather than sharpening the decision boundary between correct answers and distractors. To address this, we propose <strong>Discriminative Ranking Optimization (DRO)</strong>, a parameter-efficient alignment strategy that transforms the training paradigm from generation to discrimination. DRO restricts the optimization search space by aligning training templates with the evaluation protocol and utilizing intrinsic distractors to maximize the relative margin of the ground truth. Empirical results on the ARC-Challenge demonstrate that our approach elevates the zero-shot baseline of 61.43% to <strong>74.40%</strong>, significantly outperforming standard SFT. Furthermore, we observe a phenomenon of <strong>mechanism transfer</strong>, where a model trained on an unrelated commonsense dataset achieves comparable performance on scientific reasoning. This suggests that DRO enables the model to internalize a generalized discriminative mechanism independent of domain-specific knowledge.
                    </p>
                </section>

                {/* Method Section */}
                <section className="space-y-8">
                    <h2 className="text-3xl font-bold text-center text-gray-800">Method: Discriminative Ranking Optimization</h2>
                    <div className="space-y-6 text-lg leading-relaxed text-gray-700">
                        <p>
                            We propose a strategy of <strong>Discriminative Ranking Optimization (DRO)</strong> to bypass the computational inefficiency of global generative correction. This approach strictly optimizes the <em>relative margin</em> within the candidate set, effectively disregarding irrelevant global generative artifacts.
                        </p>
                        <div className="grid md:grid-cols-2 gap-8 my-8">
                            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                                <h3 className="text-xl font-bold text-gray-900 mb-3">Syntactic Constraint</h3>
                                <p className="text-gray-600">
                                    We align the training templates exactly with the downstream evaluation protocol. This strict template alignment freezes the syntactic search space and removes the "alignment tax," allowing the model to focus on discrimination rather than format learning.
                                </p>
                            </div>
                            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                                <h3 className="text-xl font-bold text-gray-900 mb-3">Local-Ranking Optimization</h3>
                                <p className="text-gray-600">
                                    Using <strong>Simple Preference Optimization (SimPO)</strong>, we construct negative pairs from the dataset's intrinsic distractors. The objective is to maximize the relative likelihood margin between the correct answer and plausible falsehoods.
                                </p>
                            </div>
                        </div>
                        <div className="relative w-full aspect-[2/1] bg-gray-50 rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center">
                            <Image
                                src="/DRO/algorithm.png"
                                alt="Our Algorithm. Discriminative Ranking Optimization (DRO)"
                                fill
                                className="object-contain"
                            />
                        </div>
                    </div>
                </section>

                {/* Results Section */}
                <section className="space-y-8">
                    <h2 className="text-3xl font-bold text-center text-gray-800">Results</h2>

                    <div className="space-y-12">
                        {/* Main Results Table */}
                        <div className="space-y-4">
                            <h3 className="text-2xl font-bold text-gray-800">Main Results on ARC-Challenge</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-gray-700">
                                    <thead className="bg-gray-50 text-gray-900 font-semibold border-b border-gray-200">
                                        <tr>
                                            <th className="py-3 px-4">Method</th>
                                            <th className="py-3 px-4">Training Data</th>
                                            <th className="py-3 px-4">Acc (Norm)</th>
                                            <th className="py-3 px-4">Δ Gain</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        <tr>
                                            <td className="py-3 px-4">Base Model (Zero-shot)</td>
                                            <td className="py-3 px-4">None</td>
                                            <td className="py-3 px-4">61.43%</td>
                                            <td className="py-3 px-4 text-gray-400">-</td>
                                        </tr>
                                        <tr>
                                            <td className="py-3 px-4">Baseline (SFT)</td>
                                            <td className="py-3 px-4">ARC-Challenge</td>
                                            <td className="py-3 px-4">64.85%</td>
                                            <td className="py-3 px-4 text-green-600 font-medium">+3.42</td>
                                        </tr>
                                        <tr className="bg-blue-50/50">
                                            <td className="py-3 px-4 font-bold text-blue-900">Ours (DRO)</td>
                                            <td className="py-3 px-4 font-medium text-blue-900">ARC-Challenge</td>
                                            <td className="py-3 px-4 font-bold text-blue-900">74.40%</td>
                                            <td className="py-3 px-4 text-green-600 font-bold">+12.97</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Generalization Table */}
                        <div className="space-y-4">
                            <h3 className="text-2xl font-bold text-gray-800">Zero-Shot Generalization (ARC → CQA)</h3>
                            <p className="text-gray-600">Model trained ONLY on ARC-Challenge, evaluated on CommonsenseQA.</p>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-gray-700">
                                    <thead className="bg-gray-50 text-gray-900 font-semibold border-b border-gray-200">
                                        <tr>
                                            <th className="py-3 px-4">Method</th>
                                            <th className="py-3 px-4">Training Data</th>
                                            <th className="py-3 px-4">CommonsenseQA Score</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        <tr>
                                            <td className="py-3 px-4">Base Model (Zero-shot)</td>
                                            <td className="py-3 px-4">None</td>
                                            <td className="py-3 px-4">59.30%</td>
                                        </tr>
                                        <tr className="bg-blue-50/50">
                                            <td className="py-3 px-4 font-bold text-blue-900">Ours (DRO)</td>
                                            <td className="py-3 px-4 font-medium text-blue-900">ARC-Challenge (Only)</td>
                                            <td className="py-3 px-4 font-bold text-blue-900">73.46%</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
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
                    <p>© 2025 Junhoo Lee. This page is adapted from the <a href="https://github.com/eliahuhorwitz/Academic-project-page-template" target="_blank" className="hover:text-gray-600 underline">Academic Project Page Template</a>.</p>
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
