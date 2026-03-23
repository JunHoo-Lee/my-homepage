const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const nodeMajor = Number(process.versions.node.split(".")[0]);
const preferredNodeCandidates = [
  "/opt/homebrew/opt/node@22/bin/node",
  "/usr/local/opt/node@22/bin/node",
];

const preloadPath = path.resolve(__dirname, "disable-next-telemetry.cjs");
const preloadArg = `--require=${preloadPath}`;
const compileCacheDir = path.resolve(
  process.cwd(),
  ".next/cache/node-compile-cache",
);

function pickNodeExecutable() {
  if (process.env.MY_HOMEPAGE_NODE22_REEXEC || nodeMajor < 23) {
    return process.execPath;
  }

  return (
    preferredNodeCandidates.find((candidate) => fs.existsSync(candidate)) ||
    process.execPath
  );
}

function normalizeNodeOptions(value) {
  if (!value) {
    return preloadArg;
  }

  const cleaned = value
    .replace(/(^|\s)--enable-source-maps(?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.includes(preloadArg)) {
    return cleaned;
  }

  return cleaned ? `${preloadArg} ${cleaned}` : preloadArg;
}

function parseArgs(argv) {
  const options = {};
  const positionals = [];
  let portSource = "default";

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (!arg.startsWith("-")) {
      positionals.push(arg);
      continue;
    }

    if (arg === "-p" || arg === "--port") {
      options.port = Number(argv[i + 1]);
      portSource = "cli";
      i += 1;
      continue;
    }

    if (arg.startsWith("--port=")) {
      options.port = Number(arg.slice("--port=".length));
      portSource = "cli";
      continue;
    }

    if (arg === "-H" || arg === "--hostname") {
      options.hostname = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg.startsWith("--hostname=")) {
      options.hostname = arg.slice("--hostname=".length);
      continue;
    }

    if (arg === "--disable-source-maps") {
      options.disableSourceMaps = true;
      continue;
    }

    if (arg === "--webpack") {
      options.webpack = true;
      continue;
    }

    if (arg === "--turbo" || arg === "--turbopack") {
      options.turbopack = true;
      options.turbo = true;
      continue;
    }

    if (arg === "--experimental-next-config-strip-types") {
      options.experimentalNextConfigStripTypes = true;
      continue;
    }

    if (arg === "--experimental-https") {
      options.experimentalHttps = true;
      continue;
    }

    if (arg === "--experimental-https-key") {
      options.experimentalHttpsKey = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === "--experimental-https-cert") {
      options.experimentalHttpsCert = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === "--experimental-https-ca") {
      options.experimentalHttpsCa = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === "--debug") {
      options.debug = true;
      continue;
    }

    if (arg === "--profile") {
      options.profile = true;
      continue;
    }

    if (arg === "--experimental-app-only") {
      options.experimentalAppOnly = true;
      continue;
    }

    if (arg === "--no-mangling") {
      options.mangling = false;
      continue;
    }

    if (arg === "--experimental-analyze") {
      options.experimentalAnalyze = true;
      continue;
    }

    if (arg === "--keepAliveTimeout") {
      options.keepAliveTimeout = Number(argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg.startsWith("--keepAliveTimeout=")) {
      options.keepAliveTimeout = Number(
        arg.slice("--keepAliveTimeout=".length),
      );
      continue;
    }
  }

  return {
    directory: positionals[0],
    options,
    portSource,
  };
}

async function runLocally() {
  require(preloadPath);
  process.env.NEXT_TELEMETRY_DISABLED = "1";
  process.env.NODE_OPTIONS = normalizeNodeOptions(process.env.NODE_OPTIONS);
  process.env.NODE_COMPILE_CACHE =
    process.env.NODE_COMPILE_CACHE || compileCacheDir;

  const [command = "dev", ...rest] = process.argv.slice(2);
  const { directory, options, portSource } = parseArgs(rest);

  if (command === "dev") {
    const { nextDev } = require("next/dist/cli/next-dev.js");
    await nextDev(options, portSource, directory);
    return;
  }

  if (command === "build") {
    const { nextBuild } = require("next/dist/cli/next-build.js");
    await nextBuild(options, directory);
    return;
  }

  if (command === "start") {
    const { nextStart } = require("next/dist/cli/next-start.js");
    await nextStart(options, directory);
    return;
  }

  throw new Error(`Unsupported Next command: ${command}`);
}

if (!process.env.MY_HOMEPAGE_NODE22_REEXEC && nodeMajor >= 23) {
  const nodeExecutable = pickNodeExecutable();
  const result = spawnSync(nodeExecutable, process.argv.slice(1), {
    stdio: "inherit",
    env: {
      ...process.env,
      MY_HOMEPAGE_NODE22_REEXEC: "1",
      NEXT_TELEMETRY_DISABLED: "1",
      NODE_OPTIONS: normalizeNodeOptions(process.env.NODE_OPTIONS),
      NODE_COMPILE_CACHE:
        process.env.NODE_COMPILE_CACHE || compileCacheDir,
    },
  });

  process.exit(result.status ?? 1);
}

runLocally().catch((error) => {
  console.error(error);
  process.exit(1);
});
