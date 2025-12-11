'use client';

import Link from "next/link";
import { ArrowUpRight, FileText } from "lucide-react";
import { motion } from "framer-motion";

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
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 border-b border-gray-200 pb-4 mb-8">About Me</h2>
                <div className="prose prose-lg text-gray-700 leading-relaxed">
                    <p className="mb-4">
                        Hi, I'm <strong>Junhoo Lee</strong>. I am a PhD student at <a href="https://mipal.snu.ac.kr/" className="text-blue-600 hover:text-blue-800 transition-colors">Seoul National University (MIPAL)</a>,
                        advised by Prof. <a href="http://mipal.snu.ac.kr/index.php/Nojun_Kwak" className="text-blue-600 hover:text-blue-800 transition-colors">Nojun Kwak</a>.
                    </p>
                    <p className="mb-4">
                        My primary research interests lie in the intersection of <strong>Diffusion Models</strong>, <strong>Large Language Models (LLMs)</strong>,
                        <strong>Machine Learning Theory</strong>, and <strong>Lifelong Learning</strong>. I am passionate about understanding the fundamental principles of
                        generative models and applying them to solve complex problems.
                    </p>
                    <p>
                        I am always open to discussing new ideas and potential collaborations. Feel free to reach out to me via email at <a href="mailto:mrjunoo@snu.ac.kr" className="text-blue-600 hover:text-blue-800 transition-colors">mrjunoo@snu.ac.kr</a>.
                    </p>
                </div>
            </motion.section>

            {/* News Section */}
            <motion.section id="news" className="scroll-mt-20" variants={fadeInUp}>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 border-b border-gray-200 pb-4 mb-8">News</h2>
                <ul className="space-y-4 text-gray-700 text-sm">
                    <li className="flex gap-2">
                        <span className="font-bold min-w-[100px] text-gray-500">[Dec 2025]</span>
                        <span>I will be at NeurIPS 2025 in San Diego, presenting our <a href="https://arxiv.org/abs/2510.13865" target="_blank" className="text-blue-600 hover:text-blue-800 hover:underline transition-all">&quot;Deep Edge Filter&quot;</a> paper!</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold min-w-[100px] text-gray-500">[Oct 2025]</span>
                        <span>New preprint <a href="https://arxiv.org/abs/2510.13870" target="_blank" className="text-blue-600 hover:text-blue-800 hover:underline transition-all">&quot;Unlocking the Potential of Diffusion Language Models through Template Infilling&quot;</a> is now on arXiv!</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold min-w-[100px] text-gray-500">[Sep 2025]</span>
                        <span>Our paper <a href="https://arxiv.org/abs/2510.13865" target="_blank" className="text-blue-600 hover:text-blue-800 hover:underline transition-all">&quot;Deep Edge Filter&quot;</a> is accepted to NeurIPS 2025! (co-first author)</span>
                    </li>
                    {/* ... (Other news items kept same but with cleaner classNames if needed, assuming user likes current news content) ... */}
                    {/* Truncating for brevity in this replace, in reality I would keep all items or mapped properly. For this tool call I will keep the full list to be safe. */}
                    <li className="flex gap-2">
                        <span className="font-bold min-w-[100px] text-gray-500">[Jul 2025]</span>
                        <span>Our paper <a href="https://arxiv.org/abs/2507.04667" target="_blank" className="text-blue-600 hover:text-blue-800 hover:underline transition-all">&quot;What&#39;s Making That Sound Right Now?&quot;</a> is accepted to ICCV 2025!</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold min-w-[100px] text-gray-500">[Jun 2025]</span>
                        <span>Our paper <a href="https://arxiv.org/abs/2508.20224" target="_blank" className="text-blue-600 hover:text-blue-800 hover:underline transition-all">&quot;The Role of Teacher Calibration in Knowledge Distillation&quot;</a> is published in IEEE Access!</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold min-w-[100px] text-gray-500">[Dec 2024]</span>
                        <span>I will be at NeurIPS 2024 in Vancouver, presenting our <a href="https://arxiv.org/abs/2403.17329" target="_blank" className="text-blue-600 hover:text-blue-800 hover:underline transition-all">&quot;Deep Support Vectors&quot;</a> paper!</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold min-w-[100px] text-gray-500">[ Sep 2024]</span>
                        <span>Our paper <a href="https://arxiv.org/abs/2403.17329" target="_blank" className="text-blue-600 hover:text-blue-800 hover:underline transition-all">&quot;Deep Support Vectors&quot;</a> is accepted to NeurIPS 2024!</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold min-w-[100px] text-gray-500">[Jul 2024]</span>
                        <span>Our paper <a href="https://arxiv.org/abs/2405.00348" target="_blank" className="text-blue-600 hover:text-blue-800 hover:underline transition-all">&quot;Practical Dataset Distillation Based on Deep Support Vectors&quot;</a> is presented at ECCV 2024 Workshop!</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold min-w-[100px] text-gray-500">[Apr 2024]</span>
                        <span>Two workshop papers accepted to CVPR 2024 — <a href="https://arxiv.org/abs/2404.15154" target="_blank" className="text-blue-600 hover:text-blue-800 hover:underline transition-all">&quot;Do Not Think About Pink Elephant!&quot;</a> (co-first) and <a href="https://arxiv.org/abs/2404.09161" target="_blank" className="text-blue-600 hover:text-blue-800 hover:underline transition-all">&quot;Coreset Selection for Object Detection&quot;</a>!</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold min-w-[100px] text-gray-500">[Feb 2024]</span>
                        <span>I will be at AAAI 2024 in Vancouver, presenting our <a href="https://arxiv.org/abs/2401.05097" target="_blank" className="text-blue-600 hover:text-blue-800 hover:underline transition-all">&quot;Any-Way Meta Learning&quot;</a> paper!</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold min-w-[100px] text-gray-500">[Dec 2023]</span>
                        <span>Our paper <a href="https://arxiv.org/abs/2401.05097" target="_blank" className="text-blue-600 hover:text-blue-800 hover:underline transition-all">&quot;Any-Way Meta Learning&quot;</a> is accepted to AAAI 2024!</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold min-w-[100px] text-gray-500">[Dec 2023]</span>
                        <span>I will be at NeurIPS 2023 in New Orleans, presenting our <a href="https://arxiv.org/abs/2310.02751" target="_blank" className="text-blue-600 hover:text-blue-800 hover:underline transition-all">SHOT</a> paper!</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold min-w-[100px] text-gray-500">[Sep 2023]</span>
                        <span>Our paper <a href="https://arxiv.org/abs/2310.02751" target="_blank" className="text-blue-600 hover:text-blue-800 hover:underline transition-all">&quot;SHOT: Suppressing the Hessian along the Optimization Trajectory&quot;</a> is accepted to NeurIPS 2023!</span>
                    </li>
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

                    {/* Preprint */}
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                            Preprint
                        </h3>
                        <div className="space-y-8 pl-4 border-l-2 border-gray-100">
                            <PublicationItem
                                title="Unlocking the Potential of Diffusion Language Models through Template Infilling"
                                authors={["Junhoo Lee", "Seungyeon Kim", "Nojun Kwak"]}
                                venue="Preprint"
                                year="2025"
                                link="https://arxiv.org/abs/2510.13870"
                                tag="Diffusion Language Model"
                                tldr="Unlike autoregressive LMs, diffusion LMs work better with template-then-fill rather than sequential prompting."
                            />
                        </div>
                    </div>

                    {/* Main Conference */}
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                            Main Conference (First Author / Co-first †)
                        </h3>
                        <div className="space-y-8 pl-4 border-l-2 border-gray-100">
                            <PublicationItem
                                title="Deep Edge Filter †"
                                authors={["Dongkwan Lee†", "Junhoo Lee†", "Nojun Kwak"]}
                                venue="NeurIPS 2025"
                                year="2025"
                                link="https://arxiv.org/abs/2510.13865"
                                tag="Deep Learning Theory"
                                tldr="Just as humans perceive edges (high-frequency) as core components, deep features in neural networks exhibit the same tendency."
                            />
                            <PublicationItem
                                title="What's Making That Sound Right Now?"
                                authors={["Hahyeon Choi", "Junhoo Lee", "Nojun Kwak"]}
                                venue="ICCV 2025"
                                year="2025"
                                link="https://arxiv.org/abs/2507.04667"
                                tag="Audio-Visual Localization"
                                tldr="Video-centric audio-visual localization benchmark (AVATAR) with temporal dynamics."
                            />
                            <PublicationItem
                                title="Deep Support Vectors"
                                authors={["Junhoo Lee", "Hyunho Lee", "Kyomin Hwang", "Nojun Kwak"]}
                                venue="NeurIPS 2024"
                                year="2024"
                                link="https://arxiv.org/abs/2403.17329"
                                tag="Deep Learning Theory"
                                tldr="Deep learning has support vectors just like SVMs."
                            />
                            <PublicationItem
                                title="Any-Way Meta Learning"
                                authors={["Junhoo Lee", "Yearim Kim", "Hyunho Lee", "Nojun Kwak"]}
                                venue="AAAI 2024"
                                year="2024"
                                link="https://arxiv.org/abs/2401.05097"
                                tag="Meta-Learning"
                                tldr="Breaking fixed N-way constraint in meta-learning by exploiting label equivalence from episodic task sampling."
                            />
                            <PublicationItem
                                title="SHOT: Suppressing the Hessian along the Optimization Trajectory"
                                authors={["Junhoo Lee", "Jayeon Yoo", "Nojun Kwak"]}
                                venue="NeurIPS 2023"
                                year="2023"
                                link="https://arxiv.org/abs/2310.02751"
                                tag="Meta-Learning"
                                tldr="The key to meta-learning adaptation is flattening the learning trajectory."
                            />
                        </div>
                    </div>

                    {/* Workshop */}
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                            Workshop
                        </h3>
                        <div className="space-y-8 pl-4 border-l-2 border-gray-100">
                            <PublicationItem
                                title="Do Not Think About Pink Elephant! †"
                                authors={["Kyomin Hwang†", "Suyoung Kim†", "Junhoo Lee†", "Nojun Kwak"]}
                                venue="CVPR 2024 Workshop (Responsible Generative AI)"
                                year="2024"
                                link="https://arxiv.org/abs/2404.15154"
                                tag="Text-to-Image Generation"
                                tldr="First discovery that negation doesn't work in large models — telling them not to generate something makes them generate it."
                            />
                            <PublicationItem
                                title="Coreset Selection for Object Detection"
                                authors={["Hojun Lee", "Suyoung Kim", "Junhoo Lee", "Jaeyoung Yoo", "Nojun Kwak"]}
                                venue="CVPR 2024 Workshop (Dataset Distillation)"
                                year="2024"
                                link="https://openaccess.thecvf.com/content/CVPR2024W/"
                                tag="Coreset Selection"
                                tldr="Efficient coreset selection method specifically designed for object detection tasks."
                            />
                            <PublicationItem
                                title="Practical Dataset Distillation Based on Deep Support Vectors"
                                authors={["Hyunho Lee", "Junhoo Lee", "Nojun Kwak"]}
                                venue="ECCV 2024 Workshop (Dataset Distillation Challenge)"
                                year="2024"
                                link="https://arxiv.org/abs/2405.00348"
                                tag="Dataset Distillation"
                                tldr="Applying DeepKKT loss for dataset distillation when only partial data is accessible."
                            />
                        </div>
                    </div>

                    {/* Journal */}
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                            Journal
                        </h3>
                        <div className="space-y-8 pl-4 border-l-2 border-gray-100">
                            <PublicationItem
                                title="The Role of Teacher Calibration in Knowledge Distillation"
                                authors={["Suyoung Kim", "Seonguk Park", "Junhoo Lee", "Nojun Kwak"]}
                                venue="IEEE Access"
                                year="2025"
                                link="https://arxiv.org/abs/2508.20224"
                                tag="Knowledge Distillation"
                                tldr="Teacher's calibration error strongly correlates with student accuracy — well-calibrated teachers transfer knowledge better."
                            />
                        </div>
                    </div>

                </div>
            </motion.section>

        </motion.div>
    );
}

function PublicationItem({ title, authors, venue, year, link, tldr, tag }: { title: string, authors: string[], venue: string, year: string, link: string, tldr: string, tag?: string }) {
    return (
        <div className="group relative">
            <h4 className="text-lg font-bold text-gray-900 mb-2 transition-colors duration-200">
                <a href={link} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline decoration-blue-500 underline-offset-4 decoration-2">
                    {title}
                </a>
            </h4>
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2 text-sm">
                <span className="font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{venue}</span>
                {tag && <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{tag}</span>}
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
