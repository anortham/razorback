/**
 * Razorback plugin for OpenCode.ai
 *
 * Registers razorback's skills directory via the config hook — no symlinks required.
 * Injects razorback bootstrap on the first user message via messages.transform
 * (not system.transform) to avoid per-turn token bloat and multi-system-message
 * issues with some models (Qwen, etc).
 *
 * The bootstrap's "Execution Model" section is string-replaced with an
 * opencode-specific variant that names subagent-driven-development as primary
 * (Agent Teams are a Claude Code feature not available in opencode).
 */

import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Simple frontmatter extraction (avoid dependency on skills-core for bootstrap)
const extractAndStripFrontmatter = (content) => {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, content };

  const frontmatterStr = match[1];
  const body = match[2];
  const frontmatter = {};

  for (const line of frontmatterStr.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
      frontmatter[key] = value;
    }
  }

  return { frontmatter, content: body };
};

// Normalize a path: trim whitespace, expand ~, resolve to absolute
const normalizePath = (p, homeDir) => {
  if (!p || typeof p !== 'string') return null;
  let normalized = p.trim();
  if (!normalized) return null;
  if (normalized.startsWith('~/')) {
    normalized = path.join(homeDir, normalized.slice(2));
  } else if (normalized === '~') {
    normalized = homeDir;
  }
  return path.resolve(normalized);
};

const OPENCODE_EXECUTION_MODEL = `## Execution Model

When executing implementation plans:

- **2+ independent tasks:** Use \`razorback:subagent-driven-development\` (fresh subagent per task, inline review by lead)
- **1 task or sequential:** Use \`razorback:executing-plans\` (single agent, batch execution)
- **Ad-hoc parallel work:** Use \`razorback:dispatching-parallel-agents\` (independent agent dispatch)

Subagent-driven is the primary execution path in opencode. Agent Teams are not available in opencode — use subagents via @mention. Lead does inline review of each subagent's output (spec compliance + code quality).
`;

// Replace the "## Execution Model" section with the opencode variant.
// Matches from "## Execution Model" header up to the next "## " header (exclusive).
// If the section is not found, returns the body unchanged (defensive).
const replaceExecutionModel = (body) => {
  const re = /^## Execution Model\n[\s\S]*?(?=^## )/m;
  if (!re.test(body)) return body;
  return body.replace(re, OPENCODE_EXECUTION_MODEL + '\n');
};

export const RazorbackPlugin = async ({ client, directory }) => {
  const homeDir = os.homedir();
  const razorbackSkillsDir = path.resolve(__dirname, '../../skills');
  const envConfigDir = normalizePath(process.env.OPENCODE_CONFIG_DIR, homeDir);
  const configDir = envConfigDir || path.join(homeDir, '.config/opencode');

  // Helper to generate bootstrap content
  const getBootstrapContent = () => {
    const skillPath = path.join(razorbackSkillsDir, 'using-razorback', 'SKILL.md');
    if (!fs.existsSync(skillPath)) return null;

    const fullContent = fs.readFileSync(skillPath, 'utf8');
    const { content } = extractAndStripFrontmatter(fullContent);
    const opencodeBody = replaceExecutionModel(content);

    const toolMapping = `**Tool Mapping for OpenCode:**
When skills reference tools, substitute OpenCode equivalents:
- \`TodoWrite\` → \`todowrite\`
- \`Task\` with subagents → opencode's \`@mention\` syntax
- \`Skill\` tool → opencode's native \`skill\` tool
- \`Read\`/\`Write\`/\`Edit\`/\`Bash\` → your native tools

Use OpenCode's native \`skill\` tool to list and load skills.`;

    return `<EXTREMELY_IMPORTANT>
You have razorback.

**IMPORTANT: The using-razorback skill content is included below. It is ALREADY LOADED - you are currently following it. Do NOT use the skill tool to load "using-razorback" again - that would be redundant.**

${opencodeBody}

${toolMapping}
</EXTREMELY_IMPORTANT>`;
  };

  return {
    // Inject skills path into live config so OpenCode discovers razorback skills
    // without requiring manual symlinks or config file edits.
    // This works because Config.get() returns a cached singleton — modifications
    // here are visible when skills are lazily discovered later.
    config: async (config) => {
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      if (!config.skills.paths.includes(razorbackSkillsDir)) {
        config.skills.paths.push(razorbackSkillsDir);
      }
    },

    // Inject bootstrap into the first user message of each session.
    // Using a user message instead of a system message avoids:
    //   1. Token bloat from system messages repeated every turn
    //   2. Multiple system messages breaking Qwen and other models
    'experimental.chat.messages.transform': async (_input, output) => {
      const bootstrap = getBootstrapContent();
      if (!bootstrap || !output.messages.length) return;
      const firstUser = output.messages.find(m => m.info.role === 'user');
      if (!firstUser || !firstUser.parts.length) return;
      // Only inject once
      if (firstUser.parts.some(p => p.type === 'text' && p.text.includes('EXTREMELY_IMPORTANT'))) return;
      const ref = firstUser.parts[0];
      firstUser.parts.unshift({ ...ref, type: 'text', text: bootstrap });
    }
  };
};
