// Centralized system/environment checks for CLI commands
import { log } from './log';

export function checkSystemRequirements() {
  // Node.js version check
  const requiredMajor = 18;
  const nodeVersion = process.versions.node;
  const [major] = nodeVersion.split('.').map(Number);
  if (major < requiredMajor) {
    log.fail(
      `Node.js v${requiredMajor}+ required`,
      `Current version: v${nodeVersion}. Please upgrade Node.js.`
    );
    process.exit(1);
  }
}
