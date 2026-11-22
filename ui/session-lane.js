// The lane of the moai records: a record `<sessionID>.json` of .moai/state/goal or .moai/state/todo is assigned to the moai tab whose
// agent process is the pid of the session's entry in .moai/state/active-sessions.json.
// Sources (moai-adk v3.1.2 source): the goal file is `.moai/state/goal/<session-id>.json` (internal/goal/schema.go:99-102), the
// registry is `.moai/state/active-sessions.json` (internal/session/registry.go:39), its Entry type holds session_id and pid
// (internal/session/registry.go:86), and resolveSessionPID records the agent process as the pid (internal/session/session_pid.go:71). A tab's agent process is the
// foreground {pid, group} of its terminal (core docs/spec/process-list.md): the entry pid matches the foreground pid, or the leader
// of the foreground group, which is the pid of the group. Members of the group are not listed, so a member pid does not match.
// A record without an entry, or with an entry that no tab matches, is an unassigned row; no record is dropped.

// activeEntries reads the text of active-sessions.json, an array of entries, into {sessionID, pid} rows. A text that is not such an
// array throws with the field that is wrong.
export function activeEntries(text) {
  let document;
  try {
    document = JSON.parse(text);
  } catch (error) {
    throw new Error(`active-sessions.json is not JSON: ${error.message}`);
  }
  if (!Array.isArray(document)) throw new Error("active-sessions.json must be an array");
  return document.map((entry, i) => {
    const field = `active-sessions.json[${i}]`;
    if (typeof entry !== "object" || entry === null) throw new Error(`${field} must be an object`);
    if (typeof entry.session_id !== "string" || entry.session_id === "") {
      throw new Error(`${field}.session_id must be a non-empty string`);
    }
    if (!Number.isInteger(entry.pid) || entry.pid <= 0) throw new Error(`${field}.pid must be a positive integer`);
    return { sessionID: entry.session_id, pid: entry.pid };
  });
}

// laneRows returns one row per record: {record, sessionID, assigned, reason, value, error}. assigned is {tab, plugin, title} of the
// matching tab or null, and reason states why no tab matches. tabs holds {tab, plugin, title, foreground} with foreground {pid, group}
// or null; a pid that two tabs hold throws with both tab ids.
export function laneRows(records, entries, tabs) {
  return records.map((record) => {
    const sessionID = record.name.split("/").pop().replace(/\.json$/, "");
    const row = { record: record.name, sessionID, assigned: null, reason: null, value: record.value, error: record.error };
    const entry = entries.find((candidate) => candidate.sessionID === sessionID);
    if (entry === undefined) {
      row.reason = `no active-sessions entry for session ${sessionID}`;
      return row;
    }
    const matches = tabs.filter((tab) => tab.foreground !== null && (tab.foreground.pid === entry.pid || tab.foreground.group === entry.pid));
    if (matches.length > 1) {
      throw new Error(`pid ${entry.pid} is the foreground of tabs ${matches.map((tab) => tab.tab).join(" and ")}`);
    }
    if (matches.length === 0) {
      row.reason = `no moai tab has the foreground process pid ${entry.pid}`;
      return row;
    }
    const [tab] = matches;
    row.assigned = { tab: tab.tab, plugin: tab.plugin, title: tab.title };
    return row;
  });
}
