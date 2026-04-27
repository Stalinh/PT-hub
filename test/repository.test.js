const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

async function withRepository(t, callback) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "pt-hub-repo-"));
  const dataDir = path.join(tempRoot, "data");
  const archiveDir = path.join(dataDir, "old");

  process.env.DATA_DIR = dataDir;
  process.env.ARCHIVE_DIR = archiveDir;

  const configPath = require.resolve("../src/server/config");
  const repositoryPath = require.resolve("../src/server/repository");
  delete require.cache[configPath];
  delete require.cache[repositoryPath];

  const repository = require("../src/server/repository");

  t.after(async () => {
    delete require.cache[configPath];
    delete require.cache[repositoryPath];
    delete process.env.DATA_DIR;
    delete process.env.ARCHIVE_DIR;
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  await callback({ repository, dataDir, archiveDir });
}

test("updateDataset keeps current data and creates an archive copy", async (t) => {
  await withRepository(t, async ({ repository, dataDir, archiveDir }) => {
    await repository.ensureAllDatasetFiles();

    const projectFile = path.join(dataDir, "project_data.json");
    const before = await fs.readFile(projectFile, "utf8");
    const current = JSON.parse(before);
    const nextProjectData = current.projectData.map((project, index) =>
      index === 0 ? { ...project, name: "Updated Project Name", version: project.version + 1 } : project
    );

    await repository.updateDataset("projectData", nextProjectData);

    const after = JSON.parse(await fs.readFile(projectFile, "utf8"));
    assert.equal(after.projectData[0].name, "Updated Project Name");

    const archives = await fs.readdir(archiveDir);
    assert.equal(archives.length, 1);

    const archived = JSON.parse(await fs.readFile(path.join(archiveDir, archives[0]), "utf8"));
    assert.deepEqual(archived, current);
  });
});

test("updateDataset preserves current data when the final replace fails", async (t) => {
  await withRepository(t, async ({ repository, dataDir }) => {
    await repository.ensureAllDatasetFiles();

    const projectFile = path.join(dataDir, "project_data.json");
    const before = await fs.readFile(projectFile, "utf8");
    const current = JSON.parse(before);
    const nextProjectData = current.projectData.map((project, index) =>
      index === 0 ? { ...project, name: "Replace Failure", version: project.version + 1 } : project
    );

    const originalRename = fs.rename;
    let renameCalls = 0;
    fs.rename = async (...args) => {
      renameCalls += 1;
      if (renameCalls === 1) {
        throw new Error("rename failed");
      }
      return originalRename(...args);
    };

    try {
      await assert.rejects(
        repository.updateDataset("projectData", nextProjectData),
        /rename failed/
      );
    } finally {
      fs.rename = originalRename;
    }

    const after = await fs.readFile(projectFile, "utf8");
    assert.equal(after, before);
    await assert.rejects(fs.access(`${projectFile}.tmp`));
  });
});

test("readDataset does not recreate a missing file during runtime", async (t) => {
  await withRepository(t, async ({ repository, dataDir }) => {
    await repository.ensureAllDatasetFiles();

    const projectFile = path.join(dataDir, "project_data.json");
    await fs.rm(projectFile);

    await assert.rejects(
      repository.readDataset("projectData"),
      /project_data\.json is missing/
    );
    await assert.rejects(fs.access(projectFile));
  });
});

test("updateDataset validates task project snapshot fields", async (t) => {
  await withRepository(t, async ({ repository }) => {
    await repository.ensureAllDatasetFiles();

    const currentTaskData = await repository.readDataset("taskData");
    const invalidTaskData = currentTaskData.map((task, index) =>
      index === 0 ? { ...task, projectName: "" } : task
    );

    await assert.rejects(
      repository.updateDataset("taskData", invalidTaskData),
      /taskData\[0\]\.projectName must be a non-empty string/
    );
  });
});

test("updateDataset rejects project dates when due date is earlier than start date", async (t) => {
  await withRepository(t, async ({ repository }) => {
    await repository.ensureAllDatasetFiles();

    const currentProjectData = await repository.readDataset("projectData");
    const invalidProjectData = currentProjectData.map((project, index) =>
      index === 0
        ? { ...project, startDate: "2026-04-27", dueDate: "2026-04-16" }
        : project
    );

    await assert.rejects(
      repository.updateDataset("projectData", invalidProjectData),
      /projectData\[0\]\.dueDate cannot be earlier than startDate/
    );
  });
});
