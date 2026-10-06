import { DeepPartial } from "../lib/settings.js";
import type { AppConfig } from "../config.js";
import defaults from "./defaults.js";
import test_fixture from "./instances/test_fixture.ts";
const presets: Record<string, DeepPartial<AppConfig>> = {
   defaults: defaults,
   test_fixture: test_fixture
};
export default presets;