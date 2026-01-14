import { claudeCodeEnv } from "./claude-settings.js";
import { unstable_v2_prompt } from "@anthropic-ai/claude-agent-sdk";
import type { SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";

export const generateSessionTitle = async (userIntent: string | null) => {
  if (!userIntent) return "New Session";
  const result: SDKResultMessage = await unstable_v2_prompt(
    `please analynis the following user input to generate a short but clearly title to identify this conversation theme:
    ${userIntent}
    directly output the title, do not include any other content`, {
    model: claudeCodeEnv.ANTHROPIC_MODEL,
  });
  
  if (result.subtype === "success") {
    return result.result;
  }
  return "New Session";
};
