import { spawnSync, type SpawnSyncOptions } from "node:child_process"

export function spawnNpmSync(args: string[], options: SpawnSyncOptions = {}) {
  const npmExecPath = process.env.npm_execpath?.trim()
  if (npmExecPath) {
    return spawnSync(process.execPath, [npmExecPath, ...args], {
      ...options,
      shell: false,
    })
  }

  const executable = process.platform === "win32" ? "npm.cmd" : "npm"
  return spawnSync(executable, args, {
    ...options,
    // Modern Node versions cannot spawn .cmd files directly on Windows.
    shell: process.platform === "win32",
  })
}
