import { select, isCancel } from "@clack/prompts";
import chalk from "chalk";
import figlet from "figlet";

const BANNER_FONT = "ANSI Shadow"; 

const SHADOW = chalk.hex('#5b4d9e');
const FACE = chalk.hex('#e8dcf8').bold;

function printBannerWithShadow(ascii: string): void {
    const bannerLines = ascii.replace(/\s+$/, '').split('\n');
    const maxLen = Math.max(...bannerLines.map(l => l.length));
    const rowWidth = maxLen + 2;

    for (const line of bannerLines) {
        console.log(SHADOW((" " + line + " ").padEnd(rowWidth)));
    }

    process.stdout.write(`\x1b[${bannerLines.length}A`);

    for (const line of bannerLines) {
        console.log(FACE((" " + line + " ").padEnd(rowWidth)));
    }
}

async function runCliMode(): Promise<void> {
    console.log(chalk.cyan("\nStarting in CLI mode..."));
    // TODO: implement CLI mode logic here
}

async function runTelegramMode(): Promise<void> {
    console.log(chalk.green("\nStarting in Telegram mode..."));
    // TODO: implement Telegram mode logic here
}

export async function runWakeup(): Promise<void> {
    let ascii: string;

    try {
        ascii = figlet.textSync("SnobarClaw", { font: BANNER_FONT });
    } catch {
        ascii = figlet.textSync("SnobarClaw", { font: "Standard" });
    }

    printBannerWithShadow(ascii);

    const mode = await select({
        message: "Pick a mode to continue:",
        options: [
            { value: "cli",      label: "CLI Mode"      },
            { value: "telegram", label: "Telegram Mode" },
            { value: "exit",     label: "Exit"          },
        ],
    });

    if (isCancel(mode)) {
        console.log(chalk.red("\nCancelled. Goodbye!"));
        process.exit(0);
    }

    if (mode === "exit") {
        console.log(chalk.yellow("\nExiting. Goodbye!"));
        process.exit(0);
    }

    if (mode === "cli") {
        await runCliMode();
    } else if (mode === "telegram") {
        await runTelegramMode();
    }
}