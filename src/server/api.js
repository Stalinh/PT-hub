const { HttpError } = require("./errors");
const { resolveDatasetKey } = require("./datasets");
const { readRequestBody, sendJson } = require("./http");
const { readDataset, updateDataset } = require("./repository");

async function handleApiRequest(req, res, pathname) {
  const datasetKey = resolveDatasetKey(pathname);
  if (!datasetKey) {
    sendJson(res, 404, { error: "Unknown API route." });
    return;
  }

  if (req.method === "GET") {
    const datasetValue = await readDataset(datasetKey);
    sendJson(res, 200, { [datasetKey]: datasetValue });
    return;
  }

  if (req.method === "PUT") {
    const body = await readRequestBody(req);
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new HttpError(400, "Request body must be a JSON object.");
    }

    if (!(datasetKey in body)) {
      throw new HttpError(400, `Request body must include "${datasetKey}".`);
    }

    const nextValue = await updateDataset(datasetKey, body[datasetKey]);
    sendJson(res, 200, { [datasetKey]: nextValue });
    return;
  }

  res.setHeader("Allow", "GET, PUT");
  sendJson(res, 405, { error: "Method not allowed." });
}

module.exports = {
  handleApiRequest,
};

