// The moai tabs of a core.grid value. core reports each tab with its params (the launch of the tab, as core.layout.open takes it) and
// its program state, `null` or {state} with state idle, working or blocked (docs/spec/program-state.md). A tab is a moai tab when its
// params name a role that the moai group defines, so the title and the plugin of a tab do not decide it.
const STATES = ["idle", "working", "blocked"];

// moaiTabs returns {tab, title, role, live, state} for each moai tab in the order of the cards. live is true when the tab has a
// program state, and state is that state or null. agentNames are the agent names of the moai group.
export function moaiTabs(grid, agentNames) {
  if (grid === null || typeof grid !== "object") throw new Error("core.grid is not an object");
  if (!Array.isArray(grid.cards)) throw new Error("core.grid has no cards list");
  const rows = [];
  for (const card of grid.cards) {
    if (!Array.isArray(card.tabs)) throw new Error(`card ${card.id} has no tabs list`);
    for (const tab of card.tabs) {
      if (!Object.hasOwn(tab, "program")) throw new Error(`tab ${tab.tab} has no program member`);
      const program = tab.program;
      if (program !== null && (typeof program !== "object" || !STATES.includes(program.state))) {
        throw new Error(`tab ${tab.tab} program state must be one of ${STATES.join(", ")}`);
      }
      const role = tab.params?.role;
      if (typeof role !== "string" || !agentNames.includes(role)) continue;
      rows.push({ tab: tab.tab, title: tab.title, role, live: program !== null, state: program?.state ?? null });
    }
  }
  return rows;
}
