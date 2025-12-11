import Link from "next/link";
import { ArrowUpRight, FileText } from "lucide-react";

export default function Home() {
    return (
        <div className="space-y-16">

            {/* About Section */}
            <section id="about" className="scroll-mt-20">
                <h2 className="text-3xl border-b pb-2 mb-6">About Me</h2>
                <div className="prose max-w-none text-gray-700 leading-relaxed">
                    <p className="mb-4">
                        Hi, I'm <strong>Junhoo Lee</strong>. I am a PhD student at <a href="https://mipal.snu.ac.kr/" className="text-blue-600 hover:underline">Seoul National University (MIPAL)</a>,
                        advised by Prof. <a href="http://mipal.snu.ac.kr/index.php/Nojun_Kwak" className="text-blue-600 hover:underline">Nojun Kwak</a>.
                    </p>
                    <p className="mb-4">
                        My primary research interests lie in the intersection of <strong>Diffusion Models</strong>, <strong>Large Language Models (LLMs)</strong>,
                        <strong>Machine Learning Theory</strong>, and <strong>Lifelong Learning</strong>. I am passionate about understanding the fundamental principles of
                        generative models and applying them to solve complex problems.
                    </p>
                    <p>
                        I am always open to discussing new ideas and potential collaborations. Feel free to reach out to me via email at <a href="mailto:mrjunoo@snu.ac.kr" className="text-blue-600 hover:underline">mrjunoo@snu.ac.kr</a>.
                    </p>
                </div>
            </section>

            {/* News Section */}
            <section id="news" className="scroll-mt-20">
                <h2 className="text-3xl border-b pb-2 mb-6">News</h2>
                <ul className="space-y-4">
                    {/* Placeholder News Items */}
                    <li className="flex flex-col sm:flex-row sm:items-start gap-2">
                        <span className="font-mono text-sm text-gray-500 shrink-0 w-24">2025.12</span>
                        <span>
                            Creating my new academic homepage!
                        </span>
                    </li>
                    <li className="flex flex-col sm:flex-row sm:items-start gap-2">
                        <span className="font-mono text-sm text-gray-500 shrink-0 w-24">2024.03</span>
                        <span>
                            Started PhD at Seoul National University.
                        </span>
                    </li>
                </ul>
            </section>

            {/* Publications Section */}
            <section id="publications" className="scroll-mt-20">
                <div className="flex items-center justify-between border-b pb-2 mb-6">
                    <h2 className="text-3xl">Selected Publications</h2>
                    <a href="https://scholar.google.com/citations?user=CvvfGxkAAAAJ&hl=ko&authuser=3" target="_blank" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                        View Google Scholar <ArrowUpRight size={14} />
                    </a>
                </div>

                <div className="space-y-8">
                    {/* Example Publication Item - Replace with real data later */}
                    <div className="group">
                        <h3 className="text-lg font-semibold mb-1 group-hover:text-blue-600 transition-colors">
                            <a href="#">Example Title: Research on Diffusion Models</a>
                        </h3>
                        <p className="text-gray-600 mb-2">
                            <strong>Junhoo Lee</strong>, Co-author Name, Nojun Kwak
                        </p>
                        <p className="text-sm text-gray-500 italic mb-2">
                            Conference on Neural Information Processing Systems (NeurIPS), 2024
                        </p>
                        <div className="flex gap-3 text-sm">
                            <a href="#" className="flex items-center gap-1 text-gray-600 hover:text-gray-900 border px-2 py-0.5 rounded-full hover:bg-gray-50 transition-colors">
                                <FileText size={14} /> PDF
                            </a>
                            <a href="#" className="flex items-center gap-1 text-gray-600 hover:text-gray-900 border px-2 py-0.5 rounded-full hover:bg-gray-50 transition-colors">
                                Code
                            </a>
                        </div>
                    </div>

                    <div className="text-center pt-4">
                        <p className="text-gray-500 italic">More publications coming soon...</p>
                    </div>
                </div>
            </section>

        </div>
    );
}
