export const PROFILE = {
    name: "Junhoo Lee",
    role: "Ph.D. Candidate",
    affiliation: "Seoul National University",
    email: "mrjunoo@snu.ac.kr",
    website: "https://junhoo.me",
    phone: "+82-10-4042-6255",
    address: "Room 311, Building 18, Seoul National University, Gwanak-ro 1, Gwanak-gu, Seoul, Republic of Korea",
    bio: [
        "Hi, I'm Junhoo Lee. I am a Ph.D. candidate at Seoul National University (MIPAL), advised by Prof. Nojun Kwak.",
        "My research aims to bridge the gap between optimization theory and modern generative AI. Instead of merely scaling up models, I investigate the training dynamics of overparameterized networks and design inductive biases (such as geometric constraints or explicit filtering) to ensure robust in-distribution learning.",
        "Currently, I am exploring the fundamental principles of Diffusion Models and LLMs to make them more efficient, explainable, and controllable.",
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

export const NEWS = [
    { date: "Jul 5, 2026", content: "I will be at ACL 2026 in San Diego, presenting our \"Unlocking the Potential of Diffusion Language Models through Template Infilling\" paper!", link: "/template-infilling", linkText: "\"Unlocking the Potential of Diffusion Language Models through Template Infilling\"" },
    { date: "Jun 5, 2026", content: "I will be at CVPR 2026 in Denver, presenting our \"CSF: Black-box Fingerprinting via Compositional Semantics for Text-to-Image Models\" paper!", link: "/csf", linkText: "\"CSF: Black-box Fingerprinting via Compositional Semantics for Text-to-Image Models\"" },
    { date: "Apr 4, 2026", content: "Our paper \"Unlocking the Potential of Diffusion Language Models through Template Infilling\" is accepted to ACL 2026!", link: "/template-infilling", linkText: "\"Unlocking the Potential of Diffusion Language Models through Template Infilling\"" },
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
    { date: "Feb 2024", content: "I will be at AAAI 2024 in Vancouver, presenting our \"Any-Way Meta Learning\" paper!", link: "/any-way-meta-learning", linkText: "\"Any-Way Meta Learning\"" },
    { date: "Dec 2023", content: "Our paper \"Any-Way Meta Learning\" is accepted to AAAI 2024!", link: "/any-way-meta-learning", linkText: "\"Any-Way Meta Learning\"" },
    { date: "Dec 2023", content: "I will be at NeurIPS 2023 in New Orleans, presenting our SHOT paper!", link: "https://arxiv.org/abs/2310.02751", linkText: "SHOT" },
    { date: "Sep 2023", content: "Our paper \"SHOT: Suppressing the Hessian along the Optimization Trajectory\" is accepted to NeurIPS 2023!", link: "https://arxiv.org/abs/2310.02751", linkText: "\"SHOT: Suppressing the Hessian along the Optimization Trajectory\"" },
];

export const PUBLICATIONS = [
    {
        section: "Main Conference",
        color: "blue",
        note: "(First Author / Co-first †)",
        items: [
            {
                title: "CSF: Black-box Fingerprinting via Compositional Semantics for Text-to-Image Models",
                authors: ["Junhoo Lee", "Mijin Koo", "Nojun Kwak"],
                venue: "The IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR)",
                year: "2026",
                link: "/csf",
                paperLink: "/csf/csf-paper.pdf",
                category: "Generative Models",
                subTag: "Query-Only Attribution",
                tldr: "A problem-first project page for black-box lineage attribution of fine-tuned text-to-image APIs using compositional semantic fingerprints."
            },
            {
                title: "Unlocking the Potential of Diffusion Language Models through Template Infilling",
                authors: ["Junhoo Lee", "Seungyeon Kim", "Nojun Kwak"],
                venue: "Annual Meeting of the Association for Computational Linguistics (ACL)",
                year: "2026",
                link: "https://arxiv.org/abs/2510.13870",
                category: "Large Language Models",
                subTag: "Diffusion Language Models",
                tldr: "Unlike autoregressive LMs, diffusion LMs work better with template-then-fill rather than sequential prompting."
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
                link: "/dsv",
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
                link: "/any-way-meta-learning",
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
                link: "https://arxiv.org/abs/2310.02751",
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

export const AWARDS = [
    { year: "2023", title: "BK21 Future Innovation Talent Bronze Prize", amount: "USD 1,000" },
    { year: "2023", title: "BK21 Outstanding Research Talent Fellowship", amount: "USD 3,500" },
    { year: "2022", title: "Yulchon AI Star Scholarship", amount: "USD 8,000" },
    { year: "2021", title: "3rd Place, SNU FastMRI Challenge (out of 107 teams)", amount: "USD 3,000" },
    { year: "2021", title: "Kwanak Scholarship", amount: "full funded" },
    { year: "2017-2018", title: "National Science and Engineering Scholarship", amount: "full funded" }
];

export const ACADEMIC_SERVICE = [
    { role: "Reviewer", venue: "CVPR", year: "2025, 2026" },
    { role: "Reviewer", venue: "ICLR", year: "2025, 2026" },
    { role: "Reviewer", venue: "NeurIPS", year: "2024, 2025" },
    { role: "Reviewer", venue: "ICCV", year: "2025" },
];
