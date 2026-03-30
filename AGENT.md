# AI Assistant Operational Guidelines

This file serves as a strict persistent rulebook for coding behavior in this Next.js/React project.

## Rules
1. **Never use `any`**: TypeScript must be fully utilized with strong types. Use `unknown` and type guards if necessary, but never bypass the type checker with `any`.
2. **Never ignore Biome Linter**: Treat `biome` linter errors as hard compilation failures. Do not use `// biome-ignore` or `/* biome-ignore */` tags to sweep rules under the rug. Fix the underlying code.
3. **Structured Design Patterns**: Avoid junior-level "spaghetti" `if/else` checks, especially for string matching or enumerations. Always employ object maps, dispatch tables (e.g. `Record<enum, function>`), or strategy patterns to parse options safely and beautifully.
4. **Resilient Fallbacks**: Every map or option resolution must confidently declare a fallback/default route, ensuring the application cannot crash on unmapped states.
5. **No sloppy strings**: Normalize string options via strongly typed Unions rather than evaluating scattered lowercase checks on the fly.
6. **Strictly Read-Only UI Components**: The `src/components/ui/` directory is **STRICTLY READ-ONLY**. It is a direct mirror of the Shadcn registry. **NEVER modify or add properties to these components.** If you need extended functionality, ALWAYS build a wrapper component or use hooks outside of the `ui` folder.
