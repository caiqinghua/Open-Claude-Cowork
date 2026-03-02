
<div align="right">
  <details>
    <summary >🌐 Language</summary>
    <div>
      <div align="center">
        <a href="https://openaitx.github.io/view.html?user=caiqinghua&project=Open-Claude-Cowork&lang=en">English</a>
        | <a href="https://openaitx.github.io/view.html?user=caiqinghua&project=Open-Claude-Cowork&lang=zh-CN">简体中文</a>
        | <a href="https://openaitx.github.io/view.html?user=caiqinghua&project=Open-Claude-Cowork&lang=zh-TW">繁體中文</a>
        | <a href="https://openaitx.github.io/view.html?user=caiqinghua&project=Open-Claude-Cowork&lang=ja">日本語</a>
        | <a href="https://openaitx.github.io/view.html?user=caiqinghua&project=Open-Claude-Cowork&lang=ko">한국어</a>
        | <a href="https://openaitx.github.io/view.html?user=caiqinghua&project=Open-Claude-Cowork&lang=hi">हिन्दी</a>
        | <a href="https://openaitx.github.io/view.html?user=caiqinghua&project=Open-Claude-Cowork&lang=th">ไทย</a>
        | <a href="https://openaitx.github.io/view.html?user=caiqinghua&project=Open-Claude-Cowork&lang=fr">Français</a>
        | <a href="https://openaitx.github.io/view.html?user=caiqinghua&project=Open-Claude-Cowork&lang=de">Deutsch</a>
        | <a href="https://openaitx.github.io/view.html?user=caiqinghua&project=Open-Claude-Cowork&lang=es">Español</a>
        | <a href="https://openaitx.github.io/view.html?user=caiqinghua&project=Open-Claude-Cowork&lang=it">Italiano</a>
        | <a href="https://openaitx.github.io/view.html?user=caiqinghua&project=Open-Claude-Cowork&lang=ru">Русский</a>
        | <a href="https://openaitx.github.io/view.html?user=caiqinghua&project=Open-Claude-Cowork&lang=pt">Português</a>
        | <a href="https://openaitx.github.io/view.html?user=caiqinghua&project=Open-Claude-Cowork&lang=nl">Nederlands</a>
        | <a href="https://openaitx.github.io/view.html?user=caiqinghua&project=Open-Claude-Cowork&lang=pl">Polski</a>
        | <a href="https://openaitx.github.io/view.html?user=caiqinghua&project=Open-Claude-Cowork&lang=ar">العربية</a>
        | <a href="https://openaitx.github.io/view.html?user=caiqinghua&project=Open-Claude-Cowork&lang=fa">فارسی</a>
        | <a href="https://openaitx.github.io/view.html?user=caiqinghua&project=Open-Claude-Cowork&lang=tr">Türkçe</a>
        | <a href="https://openaitx.github.io/view.html?user=caiqinghua&project=Open-Claude-Cowork&lang=vi">Tiếng Việt</a>
        | <a href="https://openaitx.github.io/view.html?user=caiqinghua&project=Open-Claude-Cowork&lang=id">Bahasa Indonesia</a>
        | <a href="https://openaitx.github.io/view.html?user=caiqinghua&project=Open-Claude-Cowork&lang=as">অসমীয়া</
      </div>
    </div>
  </details>
</div>

# Example: Please help me organize my work folder

https://github.com/user-attachments/assets/48743a51-705a-4c66-9fdb-4d7147f8098b


[简体中文](README_ZH.md)

# Claude Cowork

A **desktop AI assistant** that helps you with **programming, file management, and any task you can describe**.

It is **fully compatible with the exact same configuration as Claude Code**, which means you can run it with **any Anthropic-compatible large language model**.

**✨ No Claude Max subscription required** - Supports any Anthropic-compatible API model, including Zhipu GLM 4.7, MiniMax 2.1, Moonshot Kimi, DeepSeek, and more.

> Not just a GUI.  
> A real AI collaboration partner.  
> No need to learn the Claude Agent SDK — just create tasks and choose execution paths.


---

## ✨ Why Claude Cowork?

Claude Code is powerful — but it **only runs in the terminal**.

That means:
- ❌ No visual feedback for complex tasks
- ❌ Hard to track multiple sessions
- ❌ Tool outputs are inconvenient to inspect

**Open Claude Cowork solves these problems:**

- 🖥️ Runs as a **native desktop application**
- 🤖 Acts as your **AI collaboration partner** for any task
- 🔁 Reuses your **existing `~/.claude/settings.json`**
- 🧠 **100% compatible** with Claude Code

If Claude Code works on your machine —  
**Open Claude Cowork works too.**

---

## 🚀 Quick Start

> **💡 Tip:** This app is fully compatible with Claude Code configuration. No Claude Max subscription needed - you can use Zhipu GLM, MiniMax, Kimi, DeepSeek, or any other Anthropic-compatible API model.

Before using Open Claude Cowork, make sure Claude Code is installed and properly configured.

### Option 1: Download a Release

👉 [Go to Releases](https://github.com/caiqinghua/open-claude-cowork/releases)

---

### Option 2: Build from Source

#### Prerequisites

- [Bun](https://bun.sh/) or Node.js 22+
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated

```bash
# Clone the repository
git clone https://github.com/caiqinghua/open-claude-cowork.git
cd open-claude-cowork

# Install dependencies
bun install

# Configure environment (copy .env.example to .env)
cp .env.example .env

# Run in development mode
bun run dev

# Or build production binaries
bun run dist:mac    # macOS
bun run dist:win    # Windows
bun run dist:linux  # Linux
```

---

## 🧠 Core Capabilities

### 🤖 AI Collaboration Partner — Not Just a GUI

Open Claude Cowork is your AI partner that can:

* **Write and edit code** — in any programming language
* **Manage files** — create, move, and organize
* **Create PPTs** — generate presentation content and structure
* **Topic analysis** — in-depth analysis of research themes and directions
* **Article writing** — write various types of articles and documents
* **Do anything** — as long as you can describe it in natural language

---

### 📂 Session Management

* Create sessions with **custom working directories**
* Resume any previous conversation
* Complete local session history (stored in SQLite)
* Safe deletion and automatic persistence

---

### 🎯 Real-Time Streaming Output

* **Token-by-token streaming output**
* View Claude’s reasoning process
* Markdown rendering with syntax-highlighted code
* Visualized tool calls with status indicators

---

### 🔐 Tool Permission Control

* Explicit approval required for sensitive actions
* Allow or deny per tool
* Interactive decision panels
* Full control over what Claude is allowed to do

---

## 🔁 Fully Compatible with Claude Code

Open Claude Cowork **shares configuration with Claude Code**.

It directly reuses:

text
~/.claude/settings.json


This means:

* Same API keys
* Same base URL
* Same models
* Same behavior

**Supported models include:**
- Zhipu GLM 4.7
- MiniMax 2.1
- Moonshot Kimi
- DeepSeek
- All other Anthropic-compatible API models

> Configure Claude Code once — use it everywhere.

---

## 🔧 Troubleshooting

### better-sqlite3 Module Error

If you encounter an error like:

```
Error: The module was compiled against a different Node.js version using
NODE_MODULE_VERSION 127. This version of Node.js requires NODE_MODULE_VERSION 140.
```

This happens because Electron bundles its own Node.js version and native modules need to be recompiled for it.

**Solution:**

```bash
# Install electron-rebuild as a dev dependency
npm install --save-dev electron-rebuild

# Rebuild better-sqlite3 for Electron
npx electron-rebuild -f -w better-sqlite3

# Run the app again
bun run dev
```

This ensures that native modules are compiled against Electron's Node.js version rather than your system's Node.js version.

---

## 🧩 Architecture Overview

| Layer            | Technology                     |
| ---------------- | ------------------------------ |
| Framework        | Electron 39                    |
| Frontend         | React 19, Tailwind CSS 4       |
| State Management | Zustand                        |
| Database         | better-sqlite3 (WAL mode)      |
| AI               | @anthropic-ai/claude-agent-sdk |
| Build            | Vite, electron-builder         |

---

## 🛠 Development

bash
# Start development server (hot reload)
bun run dev

# Type checking / build
bun run build


---

## 🗺 Roadmap

Planned features:

* GUI-based configuration for models and API keys
* 🚧 More features coming soon

---

## 🤝 Contributing

Pull requests are welcome.

1. Fork this repository
2. Create your feature branch
3. Commit your changes
4. Open a Pull Request

---

## ⭐ Final Words

If you’ve ever wanted:

* A persistent desktop AI collaboration partner
* Visual insight into how Claude works
* Convenient session management across projects

This project is built for you.

👉 **If it helps you, please give it a Star.**

---

## License

MIT



