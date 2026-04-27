const fs = require("fs/promises");
const path = require("path");

const { ARCHIVE_DIR, DATA_DIR } = require("./config");
const { HttpError } = require("./errors");
const { DATASET_CONFIG, getDatasetConfig, validateDatasetPayload } = require("./datasets");

const writeChains = new Map();

function getDatasetFilePath(datasetKey) {
  return path.join(DATA_DIR, getDatasetConfig(datasetKey).fileName);
}

function timestampForArchive(date = new Date()) {
  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    "-",
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
    "-",
    String(date.getMilliseconds()).padStart(3, "0"),
  ];

  return parts.join("");
}

async function ensureDataDirs() {
  await fs.mkdir(ARCHIVE_DIR, { recursive: true });
}

async function writeDatasetAtomically(datasetKey, value) {
  const filePath = getDatasetFilePath(datasetKey);
  const tempFile = `${filePath}.tmp`;
  await writeDatasetToFile(tempFile, datasetKey, value);
  await fs.rename(tempFile, filePath);
}

async function writeDatasetToFile(filePath, datasetKey, value) {
  const serialized = `${JSON.stringify({ [datasetKey]: value }, null, 2)}\n`;
  await fs.writeFile(filePath, serialized, "utf8");
}

async function archiveDatasetFile(datasetKey) {
  const { fileName } = getDatasetConfig(datasetKey);
  const filePath = getDatasetFilePath(datasetKey);

  try {
    await fs.access(filePath);
  } catch (_error) {
    return;
  }

  const baseName = fileName.replace(/\.json$/i, "");
  const archiveName = `${baseName}-${timestampForArchive()}.json`;
  await fs.copyFile(filePath, path.join(ARCHIVE_DIR, archiveName));
}

async function ensureDatasetFile(datasetKey) {
  const config = getDatasetConfig(datasetKey);
  const filePath = getDatasetFilePath(datasetKey);

  try {
    await fs.access(filePath);
  } catch (_error) {
    await writeDatasetAtomically(datasetKey, config.defaultValue());
  }
}

async function ensureAllDatasetFiles() {
  await ensureDataDirs();
  await Promise.all(Object.keys(DATASET_CONFIG).map((datasetKey) => ensureDatasetFile(datasetKey)));
}

async function validateAllDatasets() {
  await Promise.all(Object.keys(DATASET_CONFIG).map((datasetKey) => readDataset(datasetKey)));
}

async function readDataset(datasetKey) {
  let raw;
  try {
    raw = await fs.readFile(getDatasetFilePath(datasetKey), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new HttpError(500, `${getDatasetConfig(datasetKey).fileName} is missing.`);
    }
    throw error;
  }
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (_error) {
    throw new HttpError(500, `${getDatasetConfig(datasetKey).fileName} is not valid JSON.`);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new HttpError(500, `${getDatasetConfig(datasetKey).fileName} must contain a JSON object.`);
  }

  if (!(datasetKey in parsed)) {
    throw new HttpError(
      500,
      `${getDatasetConfig(datasetKey).fileName} must contain the "${datasetKey}" field.`
    );
  }

  validateDatasetPayload(datasetKey, parsed[datasetKey]);
  return parsed[datasetKey];
}

function queueWrite(datasetKey, operation) {
  const previous = writeChains.get(datasetKey) || Promise.resolve();
  const next = previous.catch(() => {}).then(operation);
  writeChains.set(datasetKey, next.catch(() => {}));
  return next;
}

async function updateDataset(datasetKey, nextValue) {
  validateDatasetPayload(datasetKey, nextValue);

  return queueWrite(datasetKey, async () => {
    await ensureDatasetFile(datasetKey);
    const filePath = getDatasetFilePath(datasetKey);
    const tempFile = `${filePath}.tmp`;

    try {
      await writeDatasetToFile(tempFile, datasetKey, nextValue);
      await archiveDatasetFile(datasetKey);
      await fs.rename(tempFile, filePath);
      return nextValue;
    } catch (error) {
      await fs.unlink(tempFile).catch(() => {});
      throw error;
    }
  });
}

module.exports = {
  ensureAllDatasetFiles,
  readDataset,
  updateDataset,
  validateAllDatasets,
};
