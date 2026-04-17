# Junhoo Lee Homepage

Personal academic homepage built with Next.js. The site hosts the main profile,
publication list, and dedicated project pages for selected papers.

## Project Pages

- `/csf`: CSF project page
- `/shot`: SHOT project page
- `/template-infilling`: Template Infilling project page
- `/dsv`: Deep Support Vectors project page

## DSV Assets

The `Deep Support Vectors` page is built from the official NeurIPS 2024 source
release rather than hand-cropped screenshots:

- `public/dsv/deep-support-vectors-paper.pdf`
- `public/dsv/deep-support-vectors-supplemental.zip`
- `public/dsv/figure-*-tex-1.png` rendered from the paper's original TeX figure
  files such as `overall_photo.pdf`, `editimages.pdf`, and
  `interpolation_fig_compressed.pdf`
- The few-shot CIFAR10 table rebuilt in React from `tmp/dsv-source/sec/main_table.tex`

The page's code section mirrors the supplementary `submit_code/` layout:

- `submit_code/pl_main.py`
- `submit_code/base_reconstruct_imagenet.yaml`
- `submit_code/models.py`
- `submit_code/svm_modules.py`

Reference links:

- Paper: https://arxiv.org/abs/2403.17329
- NeurIPS proceedings PDF: https://papers.nips.cc/paper_files/paper/2024/file/d60e14c19cd6e0fc38556ad29ac8fbc9-Paper-Conference.pdf
- GitHub repository: https://github.com/JunHoo-Lee/Neurips24_DeepSupportVectors

## Development

Run the local development server:

```bash
npm run dev
```

Open `http://localhost:3000` and navigate to the route you want to inspect.

## Notes

- The publication list can render separate `Project Page`, `Paper`, and `Code`
  buttons when those links are present in `app/lib/data.ts`.
- Project pages are implemented as route-local React components under `app/*/`.
