#!/usr/bin/env node
import { verifyProductionAssistantConfigFile } from "../workers/portfolio-assistant/src/productionConfig.js";

const result = verifyProductionAssistantConfigFile();
if (!result.ok) {
  console.error("portfolio-assistant production config check failed:");
  for (const err of result.errors) console.error(`- ${err}`);
  process.exit(1);
}
console.log("portfolio-assistant production config OK");
