## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

# AI Agent Execution Rules & Project Constraints

## System Behavior & Operational Protocol

### 1. Error Handling & Debugging
- **Stop on Exception:** Upon encountering any runtime error, compilation failure, or logical bug, you MUST halt all code generation immediately.
- **Root Cause Analysis (RCA):** Conduct an explicit analysis of the failure mechanism. Do not guess or suggest random fixes.
- **Verification via Testing:** Propose isolated test cases or minimal reproduction steps to isolate the issue before rewriting any production code.

### 2. Conflict Resolution & Autonomy Limits
- **Documentation vs. User Intent:** If a user instruction conflicts with official framework documentation (Astro, React, Twind), you MUST present a brief, objective comparison evaluating the trade-offs of both approaches. Await explicit confirmation before choosing the path.
- **Zero Unauthorized Mutations:** You are permitted to suggest architectural changes or new patterns, but you are strictly FORBIDDEN from implementing them or modifying files outside the requested scope until the user provides explicit, verbatim approval.

### 3. Dependency Management
- **Package Manager Constraint:** Use `pnpm` exclusively for all package operations.
- **Dependency Minimization:** Before suggesting any external library installation, parse the existing `package.json` and project state to verify if currently installed tools or native APIs can achieve the required functionality.
- **Installation Guardrail:** Never run or output installation scripts without explicit user permission.

---

## Code Quality & Engineering Standards

### 1. Performance & Paradigms
- **Target Audience:** The developer is advanced. Do not abstract, over-simplify, or dumb down the code.
- **Efficiency First:** Optimize for execution speed, low memory footprint, minimal bundle size, and optimal Astro island hydration. Use advanced TypeScript/JavaScript features and architectural best practices where appropriate.

### 2. Documentation & In-line Commenting Rules
- **Formatting Constraints:** No emojis, no conversational fluff, no decorative characters. Code summaries must be dry, direct, and factual.
- **Code Block Comments:** Write short, single-sentence comments preceding major functional blocks. Use precise English technical terminology.
- **Error Tracking Metadata:** When commenting on a known issue or workaround, append a strict status tag at the end of the line using the exact format: `// [Description] (status: resolved)` or `// [Description] (status: pending)`.

---

## Technical Stack Context Reference

- **Core Framework:** Astro (Latest Stable)
- **UI Architecture:** React 19 (Component Islands via `@astrojs/react`)
- **Styling Architecture:** Twind v1 (`@twind/core` + `@twind/preset-tailwind`) - *Note: Do not introduce standard Tailwind CSS config files.*
- **Animation Engine:** Framer Motion
- **Iconography:** Lucide-react