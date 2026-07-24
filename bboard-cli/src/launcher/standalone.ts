import { createLogger } from "../logger-utils.js";
import { run } from "../index.js";
import { StandaloneConfig } from "../config.js";

const config = new StandaloneConfig();
const logger = await createLogger(config.logDir);
const testEnvironment = config.getEnvironment(logger);

const originalStart = testEnvironment.start.bind(testEnvironment);
testEnvironment.start = async (...args) => {
  const envConfig = await originalStart(...args);
  return { ...envConfig, proofServer: envConfig.proofServer };
};

await run(config, testEnvironment, logger);
