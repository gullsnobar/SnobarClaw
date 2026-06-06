import type { Telegraf, Context } from "telegraf";
import { message } from "telegraf/filters";
import { isOwner } from "./auth";
import { WELCOME } from "./constants";
import { clip, commandArg } from "./text";
import { runAgent, runAsk, runPlanSteps } from "./agent-run";
import { generatePlan } from "../plan/planner";
import { planKeyboard, planMessage, planSessions, refreshPlanUi, type PlanSession } from "./plan-session";
import { approvalDiff, approvalSessions } from "./approval-session";

export function registerHandlers(bot: Telegraf) {
  bot.command("start", async (ctx: Context) => {
    const chatId = ctx.chat?.id;
    if (!chatId || !isOwner(chatId)) return;
    await ctx.reply(WELCOME, { parse_mode: "Markdown" });
  });

  bot.command("ask", async (ctx: Context) => {
    const chatId = ctx.chat?.id;
    if (!chatId || !isOwner(chatId)) return;
    const q = commandArg((ctx.message as any)?.text, "ask");
    if (!q)
      return ctx.reply("Usage: `/ask <your question>`", {
        parse_mode: "Markdown",
      });

    await ctx.reply("Researching your question…");
    void runAsk(ctx, q).catch(console.error);
  });

  bot.command("agent", async (ctx: Context) => {
    const chatId = ctx.chat?.id;
    if (!chatId || !isOwner(chatId)) return;
    const goal = commandArg((ctx.message as any)?.text, "agent");
    if (!goal)
      return ctx.reply("Usage: `/agent <task description>`", {
        parse_mode: "Markdown",
      });
    await ctx.reply("Agent is working on your task…");
    void runAgent(ctx, chatId, goal).catch(console.error);
  });

  bot.command("plan", async (ctx: Context) => {
    const chatId = ctx.chat?.id;
    if (!chatId || !isOwner(chatId)) return;
    const goal = commandArg((ctx.message as any)?.text, "plan");

    if (!goal)
      return ctx.reply("Usage: `/plan <your goal>`", {
        parse_mode: "Markdown",
      });

    await ctx.reply("Generating a plan…");

    void (async ()=>{
        const plan = await generatePlan(goal)
        const session:PlanSession = {plan , selected:new Set(plan.steps.map((s)=>s.id))}
        await ctx.reply(planMessage(session) , {parse_mode:"Markdown", ...planKeyboard(session)});
         planSessions.set(chatId, session);
    })().catch(console.error)
  });

    bot.action(/^plan_toggle:(.+)$/, async (ctx: Context) => {
    const chatId = ctx.chat?.id;
    if (!chatId || !isOwner(chatId)) return ctx.answerCbQuery();
    const s = planSessions.get(chatId);
    if (!s) return ctx.answerCbQuery();

    const id = (ctx as any).match?.[1];
    if (!id) return ctx.answerCbQuery();
    if (s.selected.has(id)) s.selected.delete(id);
    else s.selected.add(id);

    await refreshPlanUi(ctx, s);
    await ctx.answerCbQuery();
  });

  
  bot.action('plan_all', async (ctx: Context) => {
    const chatId = ctx.chat?.id;
    if (!chatId || !isOwner(chatId)) return ctx.answerCbQuery();
    const s = planSessions.get(chatId);
    if (!s) return ctx.answerCbQuery();
    for (const step of s.plan.steps) s.selected.add(step.id);
    await refreshPlanUi(ctx, s);
    await ctx.answerCbQuery();
  });

    bot.action('plan_none', async (ctx: Context) => {
    const chatId = ctx.chat?.id;
    if (!chatId || !isOwner(chatId)) return ctx.answerCbQuery();
    const s = planSessions.get(chatId);
    if (!s) return ctx.answerCbQuery();
    s.selected.clear();
    await refreshPlanUi(ctx, s);
    await ctx.answerCbQuery();
  });

   bot.action('plan_proceed', async (ctx: Context) => {
    const chatId = ctx.chat?.id;
    if (!chatId || !isOwner(chatId)) return ctx.answerCbQuery();
    const s = planSessions.get(chatId);
    if (!s) return ctx.answerCbQuery();

    const steps = s.plan.steps.filter((step) => s.selected.has(step.id));
    if (steps.length === 0) return ctx.answerCbQuery();

    const { plan } = s;
    planSessions.delete(chatId);
    const list = steps.map((step, i) => `${i + 1}. ${step.title}`).join('\n');
    await ctx.editMessageText(`🚀 Executing ${steps.length} step(s)…\n\n${list}`);
    await ctx.answerCbQuery();

    void runPlanSteps(ctx, chatId, plan, steps).catch(console.error);
  });

  bot.action('approval_diff', async (ctx: Context) => {
    const chatId = ctx.chat?.id;
    if (!chatId || !isOwner(chatId)) return ctx.answerCbQuery();
    const s = approvalSessions.get(chatId);
    if (!s) return ctx.answerCbQuery();
    await ctx.answerCbQuery();
    await ctx.reply(clip(approvalDiff(s.pending)));
  });

  bot.action('approval_accept', async (ctx: Context) => {
    const chatId = ctx.chat?.id;
    if (!chatId || !isOwner(chatId)) return ctx.answerCbQuery();
    const s = approvalSessions.get(chatId);
    if (!s) return ctx.answerCbQuery();

    approvalSessions.delete(chatId);
    for (const a of s.pending) s.tracker.updateStatus(a.id, 'approved', true);
    const { errors } = s.executor.applyApprovedFromTracker();
    s.executor.clearStaging();

    await ctx.editMessageText('All changes applied.');
    await ctx.answerCbQuery('Applied!');
    if (errors.length) console.error(errors);
  });

  bot.action('approval_reject', async (ctx: Context) => {
    const chatId = ctx.chat?.id;
    if (!chatId || !isOwner(chatId)) return ctx.answerCbQuery();
    const s = approvalSessions.get(chatId);
    if (!s) return ctx.answerCbQuery();

    approvalSessions.delete(chatId);
    for (const a of s.pending) s.tracker.updateStatus(a.id, 'rejected', false);
    s.executor.clearStaging();

    await ctx.editMessageText('All changes rejected. Nothing was applied.');
    await ctx.answerCbQuery('Rejected');
  });

}