const { startServer } = require("./src/server/app");

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});

