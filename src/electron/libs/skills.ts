import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { exec } from "child_process";

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);
const rm = promisify(fs.rm);

const execAsync = promisify(exec);

export interface SkillCard {
  name: string;
  path: string;
  description?: string;
}

export interface ExecResult {
  ok: boolean;
  status: number;
  stdout: string;
  stderr: string;
}

export function resolveSkillRoot(projectDir: string): string {
  const base = path.join(projectDir, ".claude");
  const skillsPath = path.join(base, "skills");

  if (!fs.existsSync(skillsPath)) {
    fs.mkdirSync(skillsPath, { recursive: true });
  }

  return skillsPath;
}

function extractSkillNameFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname === 'github.com') {
      const pathParts = urlObj.pathname.split('/').filter(Boolean);

      if (pathParts.length >= 2) {
        const repoOwner = pathParts[0];
        const repoName = pathParts[1];

        const treeIndex = pathParts.indexOf('tree');
        if (treeIndex !== -1 && treeIndex + 2 < pathParts.length) {
          const skillsIndex = pathParts.indexOf('skills');
          if (skillsIndex !== -1 && skillsIndex + 1 < pathParts.length) {
            return pathParts[skillsIndex + 1];
          }
          if (treeIndex + 2 < pathParts.length) {
            return pathParts[treeIndex + 2];
          }
        }

        return `${repoOwner}-${repoName}`;
      }
    }

    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart) {
      return lastPart.replace(/\.git$/, '');
    }

    return null;
  } catch {
    return null;
  }
}

function validateSkillName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error("Skill name is required");
  }

  const kebabCaseRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!kebabCaseRegex.test(trimmed)) {
    throw new Error("Skill name must be kebab-case");
  }

  return trimmed;
}

async function gatherSkills(root: string, seen: Set<string>, out: string[]): Promise<void> {
  try {
    const stats = await stat(root);
    if (!stats.isDirectory()) {
      return;
    }
  } catch {
    return;
  }

  const entries = await readdir(root);

  for (const entry of entries) {
    const entryPath = path.join(root, entry);
    try {
      const stats = await stat(entryPath);
      if (!stats.isDirectory()) {
        continue;
      }

      const skillMdPath = path.join(entryPath, "SKILL.md");
      try {
        await stat(skillMdPath);
      } catch {
        continue;
      }

      if (seen.add(entry)) {
        out.push(entryPath);
      }
    } catch {
      continue;
    }
  }
}

function extractDescription(raw: string): string | undefined {
  const lines = raw.split("\n");
  let inFrontmatter = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }
    if (trimmed === "---") {
      inFrontmatter = !inFrontmatter;
      continue;
    }
    if (inFrontmatter) {
      continue;
    }
    if (trimmed.startsWith("#")) {
      continue;
    }

    const cleaned = trimmed.replace(/`/g, "");
    if (cleaned.length === 0) {
      continue;
    }

    const max = 180;
    if (cleaned.length > max) {
      return `${cleaned.substring(0, max)}...`;
    }
    return cleaned;
  }

  return undefined;
}

export async function listLocalSkills(projectDir: string): Promise<SkillCard[]> {
  const projectDirTrimmed = projectDir.trim();
  if (projectDirTrimmed.length === 0) {
    throw new Error("Project directory is required");
  }

  const skillRoot = resolveSkillRoot(projectDirTrimmed);
  const found: string[] = [];
  const seen = new Set<string>();

  await gatherSkills(skillRoot, seen, found);

  const out: SkillCard[] = [];

  for (const skillPath of found) {
    const name = path.basename(skillPath);
    const description = await readFile(path.join(skillPath, "SKILL.md"), "utf-8")
      .then(extractDescription)
      .catch(() => undefined);

    out.push({
      name,
      path: skillPath,
      description
    });
  }

  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export async function installSkillFromUrl(
  projectDir: string,
  url: string,
  overwrite: boolean
): Promise<ExecResult> {
  if (!projectDir || typeof projectDir !== 'string') {
    return {
      ok: false,
      status: 1,
      stdout: "",
      stderr: "Project directory is required and must be a string"
    };
  }

  const projectDirTrimmed = projectDir.trim();
  if (projectDirTrimmed.length === 0) {
    return {
      ok: false,
      status: 1,
      stdout: "",
      stderr: "Project directory is required"
    };
  }

  if (!url || typeof url !== 'string') {
    return {
      ok: false,
      status: 1,
      stdout: "",
      stderr: "URL is required and must be a string"
    };
  }

  const urlTrimmed = url.trim();
  if (urlTrimmed.length === 0) {
    return {
      ok: false,
      status: 1,
      stdout: "",
      stderr: "URL is required"
    };
  }

  const skillName = extractSkillNameFromUrl(urlTrimmed);
  if (!skillName) {
    return {
      ok: false,
      status: 1,
      stdout: "",
      stderr: "Could not extract skill name from URL. Please ensure the URL is in the format: https://github.com/user/repo/tree/main/skills/skill-name"
    };
  }

  const validatedName = validateSkillName(skillName);
  const skillRoot = resolveSkillRoot(projectDirTrimmed);
  const dest = path.join(skillRoot, validatedName);

  if (fs.existsSync(dest)) {
    if (overwrite) {
      await rm(dest, { recursive: true, force: true });
    } else {
      return {
        ok: false,
        status: 1,
        stdout: "",
        stderr: `Skill already exists at ${dest}`
      };
    }
  }

  try {
    const tempDir = path.join(skillRoot, `.temp-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    let cloneUrl = urlTrimmed;
    let subdirectory = '';

    if (urlTrimmed.includes('github.com')) {
      const urlObj = new URL(urlTrimmed);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);

      if (pathParts.length >= 2) {
        cloneUrl = `https://github.com/${pathParts[0]}/${pathParts[1]}.git`;

        const treeIndex = pathParts.indexOf('tree');
        if (treeIndex !== -1) {
          const subPath = pathParts.slice(treeIndex + 2).join('/');
          subdirectory = subPath;
        }
      }
    }

    const { stdout: cloneStdout, stderr: cloneStderr } = await execAsync(
      `git clone --depth 1 --single-branch "${cloneUrl}" "${tempDir}"`
    );

    const sourcePath = subdirectory
      ? path.join(tempDir, subdirectory)
      : tempDir;

    if (!fs.existsSync(sourcePath)) {
      await rm(tempDir, { recursive: true, force: true });
      return {
        ok: false,
        status: 1,
        stdout: cloneStdout,
        stderr: `Subdirectory not found: ${subdirectory}`
      };
    }

    await copyDirectoryRecursive(sourcePath, dest);

    await rm(tempDir, { recursive: true, force: true });

    return {
      ok: true,
      status: 0,
      stdout: `Successfully installed skill "${validatedName}" from ${urlTrimmed}`,
      stderr: cloneStderr
    };
  } catch (error) {
    return {
      ok: false,
      status: 1,
      stdout: "",
      stderr: `Failed to install skill: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function importLocalSkill(
  projectDir: string,
  sourceDir: string,
  overwrite: boolean
): Promise<ExecResult> {
  const projectDirTrimmed = projectDir.trim();
  if (projectDirTrimmed.length === 0) {
    throw new Error("Project directory is required");
  }

  const sourceDirTrimmed = sourceDir.trim();
  if (sourceDirTrimmed.length === 0) {
    throw new Error("Source directory is required");
  }

  const skillMdPath = path.join(sourceDirTrimmed, "SKILL.md");
  try {
    await stat(skillMdPath);
  } catch {
    return {
      ok: false,
      status: 1,
      stdout: "",
      stderr: `SKILL.md not found in ${sourceDirTrimmed}`
    };
  }

  const skillName = path.basename(sourceDirTrimmed);
  const validatedName = validateSkillName(skillName);
  const skillRoot = resolveSkillRoot(projectDirTrimmed);
  const dest = path.join(skillRoot, validatedName);

  if (fs.existsSync(dest)) {
    if (overwrite) {
      await rm(dest, { recursive: true, force: true });
    } else {
      return {
        ok: false,
        status: 1,
        stdout: "",
        stderr: `Skill already exists at ${dest}`
      };
    }
  }

  await mkdir(dest, { recursive: true });

  // Copy all files from source to destination
  const entries = await readdir(sourceDirTrimmed);
  for (const entry of entries) {
    const srcPath = path.join(sourceDirTrimmed, entry);
    const destPath = path.join(dest, entry);

    const stats = await stat(srcPath);
    if (stats.isDirectory()) {
      await copyDirectoryRecursive(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }

  return {
    ok: true,
    status: 0,
    stdout: `Imported skill to ${dest}`,
    stderr: ""
  };
}

async function copyDirectoryRecursive(src: string, dest: string): Promise<void> {
  await mkdir(dest, { recursive: true });

  const entries = await readdir(src);

  for (const entry of entries) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);

    const stats = await stat(srcPath);
    if (stats.isDirectory()) {
      await copyDirectoryRecursive(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

export async function installSkillTemplate(
  projectDir: string,
  name: string,
  content: string,
  overwrite: boolean
): Promise<ExecResult> {
  const projectDirTrimmed = projectDir.trim();
  if (projectDirTrimmed.length === 0) {
    throw new Error("Project directory is required");
  }

  const validatedName = validateSkillName(name);
  const skillRoot = resolveSkillRoot(projectDirTrimmed);
  const dest = path.join(skillRoot, validatedName);

  if (fs.existsSync(dest)) {
    if (overwrite) {
      await rm(dest, { recursive: true, force: true });
    } else {
      return {
        ok: false,
        status: 1,
        stdout: "",
        stderr: `Skill already exists at ${dest}`
      };
    }
  }

  await mkdir(dest, { recursive: true });
  await writeFile(path.join(dest, "SKILL.md"), content);

  return {
    ok: true,
    status: 0,
    stdout: `Installed skill to ${dest}`,
    stderr: ""
  };
}

export async function uninstallSkill(
  projectDir: string,
  name: string
): Promise<ExecResult> {
  const projectDirTrimmed = projectDir.trim();
  if (projectDirTrimmed.length === 0) {
    throw new Error("Project directory is required");
  }

  const validatedName = validateSkillName(name);
  const skillRoot = resolveSkillRoot(projectDirTrimmed);
  const dest = path.join(skillRoot, validatedName);

  if (!fs.existsSync(dest)) {
    return {
      ok: false,
      status: 1,
      stdout: "",
      stderr: `Skill not found at ${dest}`
    };
  }

  await rm(dest, { recursive: true, force: true });

  return {
    ok: true,
    status: 0,
    stdout: `Removed skill ${name}`,
    stderr: ""
  };
}

function writeFile(filePath: string, content: string): Promise<void> {
  return promisify(fs.writeFile)(filePath, content, "utf-8");
}
