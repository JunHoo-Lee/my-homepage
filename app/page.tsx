import Link from "next/link";
import { ArrowUpRight, FileText } from "lucide-react";

export default function Home() {
    return (
        <div className="space-y-20">

            {/* About Section */}
            <section id="about" className="scroll-mt-20">
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
            </section>
            {/* News Section */}
            <section id="news" className="scroll-mt-20">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 border-b border-gray-200 pb-4 mb-8">News</h2>
                <ul className="space-y-4 text-gray-700">
                    <li className="flex gap-2">
                        <span className="font-bold min-w-[100px] text-gray-500">[Dec 2025]</span>
                        <span>I will be at NeurIPS 2025 in San Diego, presenting our &quot;Deep Edge Filter&quot; paper!</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold min-w-[100px] text-gray-500">[Oct 2025]</span>
                        <span>New preprint &quot;Unlocking the Potential of Diffusion Language Models through Template Infilling&quot; is now on arXiv!</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold min-w-[100px] text-gray-500">[Sep 2025]</span>
                        <span>Our paper &quot;Deep Edge Filter&quot; is accepted to NeurIPS 2025! (co-first author)</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold min-w-[100px] text-gray-500">[Jul 2025]</span>
                        <span>Our paper &quot;What&#39;s Making That Sound Right Now?&quot; is accepted to ICCV 2025!</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold min-w-[100px] text-gray-500">[Jun 2025]</span>
                        <span>Our paper &quot;The Role of Teacher Calibration in Knowledge Distillation&quot; is published in IEEE Access!</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold min-w-[100px] text-gray-500">[Dec 2024]</span>
                        <span>I will be at NeurIPS 2024 in Vancouver, presenting our &quot;Deep Support Vectors&quot; paper!</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold min-w-[100px] text-gray-500">[Sep 2024]</span>
                        <span>Our paper &quot;Deep Support Vectors&quot; is accepted to NeurIPS 2024!</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold min-w-[100px] text-gray-500">[Jul 2024]</span>
                        <span>Our paper &quot;Practical Dataset Distillation Based on Deep Support Vectors&quot; is presented at ECCV 2024 Workshop!</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold min-w-[100px] text-gray-500">[Apr 2024]</span>
                        <span>Two workshop papers accepted to CVPR 2024 — &quot;Do Not Think About Pink Elephant!&quot; (co-first) and &quot;Coreset Selection for Object Detection&quot;!</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold min-w-[100px] text-gray-500">[Feb 2024]</span>
                        <span>I will be at AAAI 2024 in Vancouver, presenting our &quot;Any-Way Meta Learning&quot; paper!</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold min-w-[100px] text-gray-500">[Dec 2023]</span>
                        <span>Our paper &quot;Any-Way Meta Learning&quot; is accepted to AAAI 2024!</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold min-w-[100px] text-gray-500">[Dec 2023]</span>
                        <span>I will be at NeurIPS 2023 in New Orleans, presenting our SHOT paper!</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold min-w-[100px] text-gray-500">[Sep 2023]</span>
                        <span>Our paper &quot;SHOT: Suppressing the Hessian along the Optimization Trajectory&quot; is accepted to NeurIPS 2023!</span>
                    </li>
                </ul>
            </section>

            {/* Publications Section */}
            <section id="publications" className="scroll-mt-20">
                <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-8">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Publications</h2>
                    <a href="https://scholar.google.com/citations?user=CvvfGxkAAAAJ&hl=ko&authuser=3" target="_blank" className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors">
                        View Google Scholar <ArrowUpRight size={14} />
                    </a>
                </div>

                <div className="space-y-12">

                    {/* Main Conference */}
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                            Main Conference (First Author / Co-first †)
                        </h3>
                        <div className="space-y-8 pl-4 border-l-2 border-gray-100">
                            <PublicationItem
                                title="Deep Edge Filter †"
                                authors={["Junhoo Lee†", "Co-author"]}
                                venue="NeurIPS 2025 (Conference on Neural Information Processing Systems)"
                                year="2025"
                                link="https://arxiv.org/abs/2510.13865"
                                tldr="Just as humans perceive edges (high-frequency) as core components, deep features in neural networks exhibit the same tendency"
                            />
                            <PublicationItem
                                title="What's Making That Sound Right Now?"
                                authors={["Junhoo Lee", "Co-author"]}
                                venue="ICCV 2025 (International Conference on Computer Vision)"
                                year="2025"
                                link="https://arxiv.org/abs/2507.04667"
                                tldr="Video-centric audio-visual localization benchmark (AVATAR) with temporal dynamics, handling single/mixed/multi-entity/off-screen scenarios"
                            />
                            <PublicationItem
                                title="Deep Support Vectors"
                                authors={["Junhoo Lee", "Co-author"]}
                                venue="NeurIPS 2024 (Conference on Neural Information Processing Systems)"
                                year="2024"
                                link="https://arxiv.org/abs/2403.17329"
                                tldr="Deep learning has support vectors just like SVMs"
                            />
                            <PublicationItem
                                title="Any-Way Meta Learning"
                                authors={["Junhoo Lee", "Co-author"]}
                                venue="AAAI 2024 (Association for the Advancement of Artificial Intelligence)"
                                year="2024"
                                link="https://arxiv.org/abs/2401.05097"
                                tldr="Breaking fixed N-way constraint in meta-learning by exploiting label equivalence from episodic task sampling"
                            />
                            <PublicationItem
                                title="SHOT: Suppressing the Hessian along the Optimization Trajectory"
                                authors={["Junhoo Lee", "Co-author"]}
                                venue="NeurIPS 2023 (Conference on Neural Information Processing Systems)"
                                year="2023"
                                link="https://arxiv.org/abs/2310.02751"
                                tldr="The key to meta-learning adaptation is flattening the learning trajectory"
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
                                authors={["Junhoo Lee†", "Co-author"]}
                                venue="CVPR 2024 Workshop (Responsible Generative AI)"
                                year="2024"
                                link="https://arxiv.org/abs/2404.15154"
                                tldr="First discovery that negation doesn't work in large models — telling them not to generate something makes them generate it"
                            />
                            <PublicationItem
                                title="Coreset Selection for Object Detection"
                                authors={["Junhoo Lee", "Co-author"]}
                                venue="CVPR 2024 Workshop (Dataset Distillation)"
                                year="2024"
                                link="https://openaccess.thecvf.com/content/CVPR2024W/"
                                tldr="Efficient coreset selection method specifically designed for object detection tasks"
                            />
                            <PublicationItem
                                title="Practical Dataset Distillation Based on Deep Support Vectors"
                                authors={["Junhoo Lee", "Co-author"]}
                                venue="ECCV 2024 Workshop (Dataset Distillation Challenge)"
                                year="2024"
                                link="https://arxiv.org/abs/2405.00348"
                                tldr="Applying DeepKKT loss for dataset distillation when only partial data is accessible"
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
                                authors={["Junhoo Lee", "Co-author"]}
                                venue="IEEE Access"
                                year="2025"
                                link="https://arxiv.org/abs/2508.20224"
                                tldr="Teacher's calibration error strongly correlates with student accuracy — well-calibrated teachers transfer knowledge better"
                            />
                        </div>
                    </div>

                    {/* Preprint */}
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                            Preprint
                        </h3>
                        <div className="space-y-8 pl-4 border-l-2 border-gray-100">
                            <PublicationItem
                                title="Unlocking the Potential of Diffusion Language Models through Template Infilling"
                                authors={["Junhoo Lee", "Co-author"]}
                                venue="Preprint"
                                year="2025"
                                link="https://arxiv.org/abs/2510.13870"
                                tldr="Unlike autoregressive LMs, diffusion LMs work better with template-then-fill rather than sequential prompting"
                            />
                        </div>
                    </div>

                </div>
            </section>

        </div>
    );
}

function PublicationItem({ title, authors, venue, year, link, tldr }: { title: string, authors: string[], venue: string, year: string, link: string, tldr: string }) {
    return (
        <div className="group relative">
            <h4 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-200">
                <a href={link} target="_blank" rel="noopener noreferrer">
                    {title}
                </a>
            </h4>
            <div className="text-gray-600 mb-2 font-medium">
                {authors.map((author, i) => (
                    <span key={i} className={author.includes("Junhoo Lee") ? "text-gray-900 border-b border-gray-800" : ""}>
                        {author}{i < authors.length - 1 ? ", " : ""}
                    </span>
                ))}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3 text-sm">
                <span className="font-semibold text-gray-800">{venue}</span>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 border border-gray-100">
                <span className="font-semibold text-gray-900 text-xs uppercase tracking-wide mr-2">TL;DR</span>
                {tldr}
            </div>

            <div className="mt-3 flex gap-3 text-xs font-medium">
                <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1 rounded-full hover:border-gray-400 transition-all">
                    <FileText size={12} /> Paper
                </a>
            </div>
        </div>
    )
}
