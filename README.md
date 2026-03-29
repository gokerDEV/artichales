# Artichales

![Version](https://img.shields.io/badge/version-1.0.0-blue) ![License](https://img.shields.io/badge/license-MIT-green) 
<!-- ![Chrome Web Store](https://img.shields.io/chrome-web-store/v/fgggldjlbpajaffefpkkhkfdiihinebf) -->

---

### The name "Artichales"


## Key Features


## Tech Stack

*   **Runtime / Tooling**
    *   **Bun** (Package Manager & Runtime)
    *   **TypeScript** (Strict Mode)
    *   **Vite** (Build Tool)
    *   **React 19**
*   **Core Logic**
    *   

*   **UI & UX**
    *   **Tailwind CSS v4** (Styling)
    *   **Shadcn UI** (Component Library)
    *   **Framer Motion** (Animations)
    *   **Lucide React** (Icons)
*   **Quality & Standards**
    *   **Biome** (Linter & Formatter)
*   **Extension**
    *   `@crxjs/vite-plugin`
    *   MV3 Manifest

## Project Structure

```
src/
├── app/                # Feature modules (Dashboard, Popup logic)
├── components/         # Shared UI components (Shadcn, Common)
├── lib/                # Shared utilities
├── metrics/            # Deterministic metric plugins (M.A.T.C.H.)
├── services/           # External integrations (Chrome API, Storage, AI)
├── assets/             # Static assets
└── popup/              # Extension popup entry
```

## Installation & Development

### Prerequisites

*   [Bun](https://bun.sh/) (v1.0+)
*   Node.js (v20+)

### Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/goker/artichales
    cd artichales
    ```

2.  **Install dependencies:**
    ```bash
    bun install
    ```

3.  **Start Development Server:**
    ```bash
    bun dev
    ```
    This compiles the extension and app in watch mode.

4.  **Load into Chrome:**
    *   Open `chrome://extensions`
    *   Enable **Developer mode** (top right)
    *   Click **Load unpacked**
    *   Select the `dist/` folder generated in your project root

## Contributing

Contributions are welcome! Please read the [SPEC.md](./SPEC.md) for architectural details before submitting pull requests.

1.  Fork the repository
2.  Create your branch (`git checkout -b feature/amazing-feature`)
3.  Commit changes (`git commit -m 'feat: add amazing feature'`)
4.  Push branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request

### Contribution Rules
*   Follow **Conventional Commits**
*   Keep metric logic deterministic
*   Avoid `any` types (Strict TypeScript)
*   Keep comments in English
*   Run lint/format/build before PR (`bun lint`, `bun format`)

## License

Distributed under the MIT License. See `LICENSE` for more information.