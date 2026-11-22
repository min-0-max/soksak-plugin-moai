// Checks the group module with a release-shaped fixture: the shipped maker/index.json is read over HTTP from the plugin modules path, as the application serves it.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { once } from "node:events";
import test from "node:test";

const FIXTURE = new URL("./fixtures/release/", import.meta.url);
const PREFIX = "/modules/@soksak/plugin-moai/";

// Serves the fixture at the modules path of the plugin, as the application serves an installed plugin.
async function serve() {
  const server = createServer((request, response) => {
    const path = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    const relative = path.startsWith(PREFIX) ? path.slice(PREFIX.length) : null;
    const file = relative && !relative.split("/").some((segment) => segment === "" || segment === "." || segment === "..") ? new URL(relative, FIXTURE) : null;
    if (!file || !existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-type": "application/json" }).end(readFileSync(file));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server;
}

test("the group reads the shipped index through the plugin modules path and lists its agents and skills", async () => {
  const { groupFromIndex } = await import("../ui/makers/moai.js");
  const server = await serve();
  try {
    const { port } = server.address();
    const group = await groupFromIndex(new URL(`http://127.0.0.1:${port}${PREFIX}maker/index.json`));
    assert.deepEqual(group.agents, [
      { name: "manager-spec", path: "agents/manager-spec.md", cli: "claude", model: "opus" },
      { name: "manager-develop", path: "agents/manager-develop.md", cli: "claude" },
    ]);
    assert.deepEqual(group.skills, ["skills/moai-run", "skills/moai-workflow-spec"]);
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("the group declares the moai identity, the claude-only CLI, the home variable, the bin path and the project folder", async () => {
  const { groupFromIndex } = await import("../ui/makers/moai.js");
  const server = await serve();
  try {
    const { port } = server.address();
    const group = await groupFromIndex(new URL(`http://127.0.0.1:${port}${PREFIX}maker/index.json`));
    assert.equal(group.id, "moai");
    assert.equal(group.name, "moai");
    assert.equal(group.plugin, "plugin");
    assert.deepEqual(group.clis, ["claude"]);
    assert.deepEqual(group.variables, { MOAI_HOME: "{home}/.moai" });
    assert.deepEqual(group.path, ["bin"]);
    assert.deepEqual(group.folders, [".moai/"]);
    assert.equal(group.rules.length, 1);
    // No group field holds a port: the moai web server belongs to the launch of the plugin (M4).
    assert.equal(JSON.stringify(group).includes('"port"'), false);
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("the group refuses an index that does not match the shape, and names the index and the field", async () => {
  const { groupFromIndex } = await import("../ui/makers/moai.js");
  const server = createServer((request, response) => {
    response.writeHead(200, { "content-type": "application/json" }).end('{"agents":[{"name":"x","path":"../x.md","cli":"claude"}],"skills":[]}');
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const { port } = server.address();
    const url = new URL(`http://127.0.0.1:${port}${PREFIX}maker/index.json`);
    await assert.rejects(groupFromIndex(url), (error) => error.message.includes("maker/index.json") && error.message.includes("agents[0].path"));
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("an agent model that is not a non-empty string is an error that names the index field", async () => {
  const server = createServer((request, response) => {
    response.writeHead(200, { "content-type": "application/json" }).end('{"agents":[{"name":"x","path":"agents/x.md","cli":"claude","model":5}],"skills":[]}');
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const url = new URL(`http://127.0.0.1:${server.address().port}/maker/index.json`);
    const { groupFromIndex } = await import("../ui/makers/moai.js");
    await assert.rejects(groupFromIndex(url), (error) => error.message.includes("agents[0].model"));
  } finally {
    server.close();
  }
});
