import chalk from "chalk";
import { text, isCancel } from "@clack/prompts";
import { getAgentModel } from "../../ai/ai.config";
import { ActionTracker } from "../agent/action-tracker";
import { ToolExecutor } from "../agent/tool-executor";
import { defaultAgentConfig } from "../agent/types";
import { createWebTools } from "./web-tools";
import { ToolLoopAgent, stepCountIs } from "ai";
import { renderTerminalMarkdown } from "../../tui/terminal-md";
import { runApprovalFlow } from "../agent/approval";

export async function runPlanMode() {
  console.log(chalk.bold("\n📋 Plan Mode\n"));

  const goal = await text({
    message: "What would you like to plan?",
    placeholder: "Describe your planning goal…",
  });

  if (isCancel(goal) || !goal.trim()) return;

  const config = defaultAgentConfig();
  const tracker = new ActionTracker();
  const executor = new ToolExecutor(tracker, config);
  const tools = createWebTools(tracker);

  const agent = new ToolLoopAgent({
    model: getAgentModel(),
    stopWhen: stepCountIs(20),
    instructions: [
      `Workspace root: ${config.codebasePath}`,
      "Use web tools to research and plan.",
    ].join("\n"),
    tools,
  });

  const result = await agent.generate({
    prompt: goal.trim(),
    onStepFinish: ({ toolCalls }) => {
      for (const tc of toolCalls) {
        const preview = JSON.stringify(tc.input).slice(0, 160);
        console.log(
          chalk.green("  ✓"),
          chalk.bold(String(tc.toolName)),
          chalk.dim(preview + (preview.length >= 160 ? "..." : "")),
        );
      }
    },
  });

  if (result.text?.trim()) console.log("\n" + renderTerminalMarkdown(result.text) + "\n");

  executor.clearStaging();
}
