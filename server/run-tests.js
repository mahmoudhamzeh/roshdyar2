const { spawnSync } = require("child_process");
const path = require("path");

const tests = ["test-relational-db.js", "test-api.js"];

for (const file of tests) {
  const result = spawnSync(process.execPath, [path.join(__dirname, file)], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status == null ? 1 : result.status);
  }
}
