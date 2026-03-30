import matter from "gray-matter";

const SAMPLE_MARKDOWN = `---
title: "A Shared Markdown Pipeline"
authors:
  - name: "Goker Cebeci"
    affiliation: "KODKAFA"
keywords:
  - markdown
  - publishing
template: "classic"
references:
  - style: "ieee"
  - source: "./refs.bib"
---
# Intro
test`;

console.log(matter(SAMPLE_MARKDOWN));
