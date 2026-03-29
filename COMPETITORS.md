# Competitor Analysis & Market Positioning

To understand where Artichales fits, here is an analysis of the current landscape of scientific and technical publishing tools:

## Quarto

Core Concept: An open-source scientific publishing system built on Pandoc.

Key Features: Uses Markdown with YAML frontmatter to generate PDFs, HTML, and Word docs. Natively supports Python, R, and interactive widgets.

Where Artichales Wins: Quarto is primarily a CLI (Command Line Interface) tool. Artichales provides a dedicated, polished GUI (offline editor) and an embeddable publishing pipeline that Quarto lacks out-of-the-box.

## MyST & Curvenote

Core Concept: MyST (Markedly Structured Text) is a Markdown flavor for science; Curvenote is the platform built around it.

Key Features: Excellent handling of cross-references, math, and interactive web articles. Deeply tied to the Jupyter ecosystem.

Where Artichales Wins: Curvenote is highly cloud/web-centric. Artichales prioritizes a lightning-fast, offline-first desktop writing experience, ensuring authors control their local files without needing constant internet access.

## Typst

Core Concept: A blazing-fast, Rust-based typesetting system designed to kill LaTeX.

Key Features: Instant compilation, offline support, and highly readable error messages.

Where Artichales Wins: Typst uses its own proprietary markup language and focuses entirely on PDF generation. Artichales uses standard Markdown and focuses equally on generating interactive, web-native HTML alongside the PDF.

## Overleaf & Authorea

Core Concept: Cloud-based collaborative editors. Overleaf is the standard for LaTeX; Authorea supports Markdown and HTML.

Key Features: Real-time collaboration, publisher templates, direct journal submissions.

Where Artichales Wins: Both are entirely cloud-reliant. If the server goes down or you lack Wi-Fi, you cannot work. Artichales brings the writing process offline first, syncing to the cloud only when required.