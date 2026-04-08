# Junhoo Lee Homepage

Personal academic homepage built with Next.js. The site hosts the main profile,
publication list, and dedicated project pages for selected papers.

## Project Pages

- `/csf`: CSF project page
- `/shot`: SHOT project page
- `/template-infilling`: Template Infilling project page
- `/dsv`: Deep Support Vectors project page

## DSV Assets

The `Deep Support Vectors` page uses figures extracted from the official NeurIPS
2024 paper and supplementary package:

- `public/dsv/deep-support-vectors-paper.pdf`
- `public/dsv/deep-support-vectors-supplemental.zip`
- `public/dsv/figure-*.png`
- `public/dsv/table-distillation.png`

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
