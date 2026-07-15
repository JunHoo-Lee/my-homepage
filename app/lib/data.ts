export type Publication = {
    title: string;
    authors: string[];
    venue: string;
    year: string;
    link?: string;
    paperLink?: string;
    projectLink?: string;
    codeLink?: string;
    codeLabel?: string;
    category: string;
    subTag: string;
    tldr: string;
};

export type PublicationSection = {
    section: string;
    color: string;
    note?: string;
    items: Publication[];
};

export const PROFILE = {
    name: "Junhoo Lee",
    role: "Ph.D. Candidate",
    affiliation: "Seoul National University",
    email: "mrjunoo@snu.ac.kr",
    website: "https://junhoo.me",
    bio: [
        "I am a Ph.D. candidate at Seoul National University (MIPAL), advised by Prof. Nojun Kwak.",
        "I work on diffusion language models, meta-learning, and methods for analyzing and attributing pretrained models. I also work on vision-language-action models.",
        "I will join ALIN-LAB at KAIST as a postdoctoral researcher in September 2026.",
    ]
};

export const EDUCATION = [
    {
        degree: "Ph.D. Candidate in Intelligence and Information",
        institution: "Seoul National University",
        period: "Sep 2021 – Aug 2026 (Expected)",
    },
    {
        degree: "B.Sc. in Electrical and Computer Engineering",
        institution: "Seoul National University",
        period: "Mar 2017 – Sep 2021",
    }
];

export const LATEST_UPDATE = {
    date: "Sep 2026",
    datetime: "2026-09",
    prefix: "I will join ",
    linkText: "ALIN-LAB",
    link: "https://alinlab.kaist.ac.kr/",
    suffix: " at KAIST as a postdoctoral researcher in September 2026.",
};

export const FEATURED_PROJECTS = [
    {
        title: "Template Infilling",
        fullTitle: "Unlocking the Potential of Diffusion Language Models through Template Infilling",
        venue: "ACL 2026",
        detail: "Long Paper · Oral",
        summary: "Template Infilling is a conditioning method for diffusion language models that places structural anchors throughout the target response before filling masked segments.",
        image: "/template-infilling/figure-main.png",
        imageAlt: "Template Infilling method overview",
        projectLink: "/template-infilling",
        paperLink: "https://arxiv.org/abs/2510.13870",
        codeLink: "https://github.com/JunHoo-Lee/Template-Infilling",
    },
    {
        title: "CSF",
        fullTitle: "CSF: Black-box Fingerprinting via Compositional Semantics for Text-to-Image Models",
        venue: "CVPR 2026",
        detail: "Black-box attribution",
        summary: "CSF attributes fine-tuned text-to-image models to their base-model lineages using only query access and compositional, underspecified prompts.",
        image: "/csf/image.png",
        imageAlt: "CSF fingerprinting result table",
        projectLink: "/csf",
        paperLink: "/csf/csf-paper.pdf",
        codeLink: "https://github.com/JunHoo-Lee/csf-t2i-fingerprinting",
    },
    {
        title: "Deep Support Vectors",
        fullTitle: "Deep Support Vectors",
        venue: "NeurIPS 2024",
        detail: "DeepKKT",
        summary: "DeepKKT adapts the Karush–Kuhn–Tucker condition to identify or generate Deep Support Vectors from trained deep classifiers.",
        image: "/dsv/figure-hero.png",
        imageAlt: "Deep Support Vectors qualitative overview",
        projectLink: "/dsv",
        paperLink: "https://arxiv.org/abs/2403.17329",
        codeLink: "https://github.com/JunHoo-Lee/Neurips24_DeepSupportVectors",
    },
];

export const TALKS = [
    {
        year: "2026",
        title: "Compositional Semantic Fingerprinting for Black-box Attribution",
        venue: "SWCS 2026",
        link: "/csf",
    },
    {
        year: "2024",
        title: "Deep Support Vectors: Interpreting Deep Models via Support Vector Extraction",
        venue: "KCC 2024",
        link: "https://arxiv.org/abs/2403.17329",
    },
];

export const HOME_NEWS = [
    LATEST_UPDATE,
    {
        date: "Jul 5, 2026",
        datetime: "2026-07-05",
        prefix: "Template Infilling will be presented at ",
        linkText: "ACL 2026",
        link: "/template-infilling",
        suffix: " as a long-paper oral presentation.",
    },
    {
        date: "Jun 5, 2026",
        datetime: "2026-06-05",
        prefix: "CSF was presented at ",
        linkText: "CVPR 2026",
        link: "/csf",
        suffix: ".",
    },
    {
        date: "May 2026",
        datetime: "2026-05",
        prefix: "Selected as an ",
        linkText: "ICML 2026 Gold Reviewer",
        link: "https://icml.cc/Conferences/2026",
        suffix: ".",
    },
    {
        date: "Apr 4, 2026",
        datetime: "2026-04-04",
        prefix: "Template Infilling was accepted to ",
        linkText: "ACL 2026",
        link: "/template-infilling",
        suffix: " as a long paper and oral presentation.",
    },
];

export const NEWS = [
    { date: "Jul 5, 2026", content: "I will be at ACL 2026 in San Diego, presenting our long paper \"Unlocking the Potential of Diffusion Language Models through Template Infilling\" as an oral presentation!", link: "/template-infilling", linkText: "\"Unlocking the Potential of Diffusion Language Models through Template Infilling\"" },
    { date: "Jun 5, 2026", content: "I will be at CVPR 2026 in Denver, presenting our \"CSF: Black-box Fingerprinting via Compositional Semantics for Text-to-Image Models\" paper!", link: "/csf", linkText: "\"CSF: Black-box Fingerprinting via Compositional Semantics for Text-to-Image Models\"" },
    { date: "May 2026", content: "I was selected as an ICML 2026 Gold Reviewer, recognizing top reviewers for this year's conference.", link: "https://icml.cc/Conferences/2026", linkText: "ICML 2026" },
    { date: "Apr 4, 2026", content: "Our paper \"Unlocking the Potential of Diffusion Language Models through Template Infilling\" is accepted to ACL 2026 as a long paper (oral presentation)!", link: "/template-infilling", linkText: "\"Unlocking the Potential of Diffusion Language Models through Template Infilling\"" },
    { date: "Feb 20, 2026", content: "Our paper \"CSF: Black-box Fingerprinting via Compositional Semantics for Text-to-Image Models\" is accepted to CVPR 2026!", link: "/csf", linkText: "\"CSF: Black-box Fingerprinting via Compositional Semantics for Text-to-Image Models\"" },
    { date: "Dec 2025", content: "I will be at NeurIPS 2025 in San Diego, presenting our \"Deep Edge Filter\" paper!", link: "https://arxiv.org/abs/2510.13865", linkText: "\"Deep Edge Filter\"" },
    { date: "Oct 2025", content: "New preprint \"Unlocking the Potential of Diffusion Language Models through Template Infilling\" is now on arXiv!", link: "/template-infilling", linkText: "\"Unlocking the Potential of Diffusion Language Models through Template Infilling\"" },
    { date: "Sep 2025", content: "Our paper \"Deep Edge Filter\" is accepted to NeurIPS 2025! (co-first author)", link: "https://arxiv.org/abs/2510.13865", linkText: "\"Deep Edge Filter\"" },
    { date: "Jul 2025", content: "Our paper \"What's Making That Sound Right Now? Video-centric Audio-Visual Localization\" is accepted to ICCV 2025!", link: "https://arxiv.org/abs/2507.04667", linkText: "\"What's Making That Sound Right Now? Video-centric Audio-Visual Localization\"" },
    { date: "Jun 2025", content: "Our paper \"The Role of Teacher Calibration in Knowledge Distillation\" is published in IEEE Access!", link: "https://arxiv.org/abs/2508.20224", linkText: "\"The Role of Teacher Calibration in Knowledge Distillation\"" },
    { date: "Dec 2024", content: "I will be at NeurIPS 2024 in Vancouver, presenting our \"Deep Support Vectors\" paper!", link: "/dsv", linkText: "\"Deep Support Vectors\"" },
    { date: "Sep 2024", content: "Our paper \"Deep Support Vectors\" is accepted to NeurIPS 2024!", link: "/dsv", linkText: "\"Deep Support Vectors\"" },
    { date: "Jul 2024", content: "Our paper \"Practical Dataset Distillation Based on Deep Support Vectors\" is presented at ECCV 2024 Workshop!", link: "https://arxiv.org/abs/2405.00348", linkText: "\"Practical Dataset Distillation Based on Deep Support Vectors\"" },
    { date: "Apr 2024", content: "Two workshop papers accepted to CVPR 2024 — \"Do Not Think About Pink Elephant!\" (co-first) and \"Coreset Selection for Object Detection\"!", link: "https://arxiv.org/abs/2404.15154", linkText: "\"Do Not Think About Pink Elephant!\"" },
    { date: "Feb 2024", content: "I will be at AAAI 2024 in Vancouver, presenting our \"Any-Way Meta Learning\" paper!", link: "https://arxiv.org/abs/2401.05097", linkText: "\"Any-Way Meta Learning\"" },
    { date: "Dec 2023", content: "Our paper \"Any-Way Meta Learning\" is accepted to AAAI 2024!", link: "https://arxiv.org/abs/2401.05097", linkText: "\"Any-Way Meta Learning\"" },
    { date: "Dec 2023", content: "I will be at NeurIPS 2023 in New Orleans, presenting our SHOT paper!", link: "https://arxiv.org/abs/2310.02751", linkText: "SHOT" },
    { date: "Sep 2023", content: "Our paper \"SHOT: Suppressing the Hessian along the Optimization Trajectory\" is accepted to NeurIPS 2023!", link: "https://arxiv.org/abs/2310.02751", linkText: "\"SHOT: Suppressing the Hessian along the Optimization Trajectory\"" },
];

export const PUBLICATIONS: PublicationSection[] = [
    {
        section: "Main Conference",
        color: "blue",
        note: "(First Author / Co-first †)",
        items: [
            {
                title: "Unlocking the Potential of Diffusion Language Models through Template Infilling",
                authors: ["Junhoo Lee", "Seungyeon Kim", "Nojun Kwak"],
                venue: "Annual Meeting of the Association for Computational Linguistics (ACL 2026)",
                year: "2026",
                projectLink: "/template-infilling",
                paperLink: "https://arxiv.org/abs/2510.13870",
                codeLink: "https://github.com/JunHoo-Lee/Template-Infilling",
                category: "Large Language Models",
                subTag: "Long Paper, Oral Presentation",
                tldr: "Unlike autoregressive LMs, diffusion LMs work better with template-then-fill rather than sequential prompting."
            },
            {
                title: "CSF: Black-box Fingerprinting via Compositional Semantics for Text-to-Image Models",
                authors: ["Junhoo Lee", "Mijin Koo", "Nojun Kwak"],
                venue: "The IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR)",
                year: "2026",
                projectLink: "/csf",
                paperLink: "/csf/csf-paper.pdf",
                codeLink: "https://github.com/JunHoo-Lee/csf-t2i-fingerprinting",
                category: "Generative Models",
                subTag: "Query-Only Attribution",
                tldr: "A problem-first project page for black-box lineage attribution of fine-tuned text-to-image APIs using compositional semantic fingerprints."
            },
            {
                title: "Deep Edge Filter †",
                authors: ["Dongkwan Lee†", "Junhoo Lee†", "Nojun Kwak"],
                venue: "The Conference on Neural Information Processing Systems (NeurIPS)",
                year: "2025",
                link: "https://arxiv.org/abs/2510.13865",
                category: "Learning Theory",
                subTag: "Representation Analysis",
                tldr: "Just as humans perceive edges (high-frequency) as core components, deep features in neural networks exhibit the same tendency."
            },
            {
                title: "What's Making That Sound Right Now? Video-centric Audio-Visual Localization",
                authors: ["Hahyeon Choi", "Junhoo Lee", "Nojun Kwak"],
                venue: "The IEEE/CVF International Conference on Computer Vision (ICCV)",
                year: "2025",
                link: "https://arxiv.org/abs/2507.04667",
                category: "Generative Models",
                subTag: "Audio-Visual Localization",
                tldr: "Video-centric audio-visual localization benchmark (AVATAR) with temporal dynamics."
            },
            {
                title: "Deep Support Vectors",
                authors: ["Junhoo Lee", "Hyunho Lee", "Kyomin Hwang", "Nojun Kwak"],
                venue: "The Conference on Neural Information Processing Systems (NeurIPS)",
                year: "2024",
                projectLink: "/dsv",
                paperLink: "https://arxiv.org/abs/2403.17329",
                codeLink: "https://github.com/JunHoo-Lee/Neurips24_DeepSupportVectors",
                category: "Learning Theory",
                subTag: "Isometry",
                tldr: "Deep learning has support vectors just like SVMs."
            },
            {
                title: "Any-Way Meta Learning",
                authors: ["Junhoo Lee", "Yearim Kim", "Hyunho Lee", "Nojun Kwak"],
                venue: "The AAAI Conference on Artificial Intelligence (AAAI)",
                year: "2024",
                projectLink: "/any-way-meta-learning",
                paperLink: "https://arxiv.org/abs/2401.05097",
                category: "Meta-Learning",
                subTag: "Few-Shot Learning",
                tldr: "Breaking fixed N-way constraint in meta-learning by exploiting label equivalence from episodic task sampling."
            },
            {
                title: "SHOT: Suppressing the Hessian along the Optimization Trajectory",
                authors: ["Junhoo Lee", "Jayeon Yoo", "Nojun Kwak"],
                venue: "The Conference on Neural Information Processing Systems (NeurIPS)",
                year: "2023",
                projectLink: "/shot",
                paperLink: "https://arxiv.org/abs/2310.02751",
                category: "Meta-Learning",
                subTag: "Optimization",
                tldr: "The key to meta-learning adaptation is flattening the learning trajectory."
            }
        ]
    },
    {
        section: "Workshop",
        color: "teal",
        items: [
            {
                title: "Do Not Think About Pink Elephant! †",
                authors: ["Kyomin Hwang†", "Suyoung Kim†", "Junhoo Lee†", "Nojun Kwak"],
                venue: "The IEEE/CVF Conference on Computer Vision and Pattern Recognition Workshops (CVPR Workshops, Responsible Generative AI)",
                year: "2024",
                link: "https://arxiv.org/abs/2404.15154",
                category: "Generative Models",
                subTag: "Safety",
                tldr: "First discovery that negation doesn't work in large models — telling them not to generate something makes them generate it."
            },
            {
                title: "Coreset Selection for Object Detection",
                authors: ["Hojun Lee", "Suyoung Kim", "Junhoo Lee", "Jaeyoung Yoo", "Nojun Kwak"],
                venue: "The IEEE/CVF Conference on Computer Vision and Pattern Recognition Workshops (CVPR Workshops, Dataset Distillation)",
                year: "2024",
                link: "https://openaccess.thecvf.com/content/CVPR2024W/",
                category: "Data Efficiency",
                subTag: "Dataset Pruning",
                tldr: "Efficient coreset selection method specifically designed for object detection tasks."
            },
            {
                title: "Practical Dataset Distillation Based on Deep Support Vectors",
                authors: ["Hyunho Lee", "Junhoo Lee", "Nojun Kwak"],
                venue: "The European Conference on Computer Vision Workshops (ECCV Workshops, Dataset Distillation Challenge)",
                year: "2024",
                link: "https://arxiv.org/abs/2405.00348",
                category: "Data Efficiency",
                subTag: "Dataset Distillation",
                tldr: "Applying DeepKKT loss for dataset distillation when only partial data is accessible."
            }
        ]
    },
    {
        section: "Journal",
        color: "indigo",
        items: [
            {
                title: "End-to-End Multi-Entity Customization",
                authors: ["Wonhark Park*", "Jaehyun Lee*", "Wonsik Shin", "Junhoo Lee", "Nojun Kwak"],
                venue: "IET Image Processing",
                year: "2026",
                category: "Generative Models",
                subTag: "Accepted",
                tldr: "Accepted to IET Image Processing in 2026."
            },
            {
                title: "The Role of Teacher Calibration in Knowledge Distillation",
                authors: ["Suyoung Kim", "Seonguk Park", "Junhoo Lee", "Nojun Kwak"],
                venue: "IEEE Access",
                year: "2025",
                link: "https://arxiv.org/abs/2508.20224",
                category: "Knowledge Distillation",
                subTag: "Calibration",
                tldr: "Teacher's calibration error strongly correlates with student accuracy — well-calibrated teachers transfer knowledge better."
            }
        ]
    }
];

export const SELECTED_PUBLICATIONS = PUBLICATIONS[0].items;

export const AWARDS = [
    { year: "2026", title: "ICML Gold Reviewer" },
    { year: "2023", title: "BK21 Future Innovation Talent Bronze Prize", amount: "USD 1,000" },
    { year: "2023", title: "BK21 Outstanding Research Talent Fellowship", amount: "USD 3,500" },
    { year: "2022", title: "Yulchon AI Star Scholarship", amount: "USD 8,000" },
    { year: "2021", title: "3rd Place, SNU FastMRI Challenge (out of 107 teams)", amount: "USD 3,000" },
    { year: "2021", title: "Kwanak Scholarship", amount: "full funded" },
    { year: "2017-2018", title: "National Science and Engineering Scholarship", amount: "full funded" }
];

export const ACADEMIC_SERVICE = [
    { role: "Gold Reviewer", venue: "ICML", year: "2026" },
    { role: "Reviewer", venue: "CVPR", year: "2025, 2026" },
    { role: "Reviewer", venue: "ICLR", year: "2025, 2026" },
    { role: "Reviewer", venue: "NeurIPS", year: "2024, 2025, 2026" },
    { role: "Reviewer", venue: "ICCV", year: "2025" },
    { role: "Reviewer", venue: "ECCV", year: "2026" },
    { role: "Reviewer", venue: "ICML", year: "2026" },
];

export const SELECTED_HONORS = [
    AWARDS[1],
    AWARDS[2],
    AWARDS[3],
];
