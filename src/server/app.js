const http = require("http");

const { DATA_DIR, HOST, PORT } = require("./config");
const { handleApiRequest } = require("./api");
const { sendJson } = require("./http");
const { ensureAllDatasetFiles, validateAllDatasets } = require("./repository");
const { serveStaticFile } = require("./static");

function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
    const { pathname } = url;

    try {
      if (pathname.startsWith("/api/")) {
        await handleApiRequest(req, res, pathname);
        return;
      }

      await serveStaticFile(res, pathname);
    } catch (error) {
      sendJson(res, error.statusCode || 500, {
        error: error.message || "Internal server error.",
      });
    }
  });
}

async function startServer() {
  await ensureAllDatasetFiles();
  await validateAllDatasets();
  const server = createServer();

  server.listen(PORT, HOST, () => {
    console.log(`PT Hub server running at http://${HOST}:${PORT}`);
    console.log(`Data directory: ${DATA_DIR}`);
  });

  return server;
}

module.exports = {
  startServer,
};
