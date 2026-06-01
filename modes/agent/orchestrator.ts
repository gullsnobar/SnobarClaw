import { isCancel, text } from "@clack/prompts"
import { defaultAgentConfig } from "./types"
import {ActionTracker} from "./action-tracker"
import chalk from "chalk";



export async function runAgentMode(){
    console.log(chalk.bold("\nStarting in Agent mode..."));

    const goal = await text({
        message: "What is the goal of this agent?",
        placeholder:"Enter the goal..."
    });

    if(isCancel(goal) || !goal.trim() ) return;

    const config = defaultAgentConfig()
    const tracker = new ActionTracker();
    const executor = new ToolExecutor(tracker, )
    
}