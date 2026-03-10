import { spawn } from "child_process";

const commands: Record<string, string[]> = {
  darwin: ["open"],
  win32: ["cmd", "/c", "start"],
  linux: ["xdg-open"],
};

export function openBrowser(url: string): void {
  const platform = process.platform;
  const args = platform === "win32" ? ["", url] : [url];
  const command = commands[platform] ?? commands.linux;

  spawn(command[0], [...command.slice(1), ...args], {
    detached: true,
    stdio: "ignore",
  }).unref();
}
