// The values and the renderer of the .moai seed. The seed is the .moai folder of the pinned release, and eight of its files are
// templates that moai init renders. The values follow the non-interactive init of moai-adk v3.1.2 where it names a value, and
// the project and the application locale otherwise (the seed decision of M2-2).
// Sources (moai-adk v3.1.2): internal/template/context.go (NewTemplateContext defaults, With* setters), internal/cli/init.go
// (flag defaults), internal/cli/init_gitdetect.go (detectGitConfig and hostFromRemoteURL), internal/config/defaults.go
// (DefaultTestCoverageTarget), pkg/models/lang.go (LangNameMap and GetLanguageName).

import { createEngine } from "./vendor/go-template.js";

// Renderer candidates checked on npm (2026-11-22). @promptctl/go-template-js 0.12.0 (MIT, published 2026-11-02, pure ESM, Go
// text/template syntax with custom functions) is used: its output for the eight seed templates equals the output of the previous
// renderer, which handles the same syntax. @evertdespiegeleer/go-template 1.0.3 (ISC) wraps the Go engine as WebAssembly, and its
// parse call is asynchronous, so the page could not render with it synchronously. gotemplate-node 0.7.6 (MIT, last modified
// 2023-02-24) converts templates to JavaScript and declares typescript and esbuild as dependencies, so it is not kept for this use.
const GITHUB_HOST = "github.com";

// LANGUAGE_NAMES is pkg/models/lang.go LangNameMap. An application locale outside this set is an error.
const LANGUAGE_NAMES = {
  ko: "Korean (한국어)",
  en: "English",
  ja: "Japanese (日本語)",
  zh: "Chinese (中文)",
  es: "Spanish (Español)",
  fr: "French (Français)",
  de: "German (Deutsch)",
};

// parseOriginUrl returns the url of the [remote "origin"] section of a git config text, or null.
export function parseOriginUrl(configText) {
  let inOrigin = false;
  for (const raw of configText.split("\n")) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#") || line.startsWith(";")) continue;
    const header = /^\[(.+)\]$/.exec(line);
    if (header) {
      inOrigin = header[1].trim() === 'remote "origin"';
      continue;
    }
    const url = /^url\s*=\s*(.+)$/.exec(line);
    if (inOrigin && url) return url[1].trim();
  }
  return null;
}

// remoteParts splits a remote URL into its host and path the way hostFromRemoteURL does (internal/cli/init_gitdetect.go).
// A local path has no host.
function remoteParts(url) {
  let rest = url.trim();
  if (rest === "") return { host: "", path: "" };
  if (rest.includes("://")) {
    rest = rest.slice(rest.indexOf("://") + 3);
  } else if (rest.includes(":") && !rest.startsWith("/")) {
    rest = rest.replace(":", "/");
  } else {
    return { host: "", path: "" };
  }
  if (rest.includes("@")) rest = rest.slice(rest.indexOf("@") + 1);
  const slash = rest.indexOf("/");
  const hostPart = slash >= 0 ? rest.slice(0, slash) : rest;
  const path = slash >= 0 ? rest.slice(slash + 1) : "";
  const host = hostPart.includes(":") ? hostPart.slice(0, hostPart.indexOf(":")) : hostPart;
  return { host, path };
}

// gitValues returns the git mode, provider, GitHub username and GitLab instance URL of the project.
// The config is the text of .git/config, or null when the folder has no .git/config.
// detectGitConfig (init_gitdetect.go): no configured remote gives manual; any remote gives personal; the provider is github
// unless the origin host is not github.com. The username and the instance URL are not set by moai init: its flag defaults are
// empty (cli/init.go). They are taken here from the origin remote, as the seed decision states.
export function gitValues(configText) {
  const values = { GitMode: "manual", GitProvider: "github", GitHubUsername: "", GitLabInstanceURL: "" };
  if (configText === null) return values;
  const hasRemote = /^\[remote "/m.test(configText);
  if (!hasRemote) return values;
  values.GitMode = "personal";
  const origin = parseOriginUrl(configText);
  if (origin === null) return values;
  const { host, path } = remoteParts(origin);
  if (host === "") return values;
  if (host.toLowerCase() === GITHUB_HOST) {
    values.GitHubUsername = path.split("/")[0] ?? "";
  } else {
    values.GitProvider = "gitlab";
    values.GitLabInstanceURL = `https://${host}`;
  }
  return values;
}

// templateValues returns every value that the seed templates use. `locale` is the application locale (for example "ko").
export function templateValues({ projectName, locale, git, createdAt, version, groupBinPath }) {
  const code = String(locale).toLowerCase().split("-")[0];
  if (!Object.hasOwn(LANGUAGE_NAMES, code)) {
    throw new Error(`locale ${locale} is not a language that moai names`);
  }
  return {
    ProjectName: projectName,
    UserName: "", // init has no user name flag (cli/init.go), and WithUser("") sets an empty name (template/context.go)
    ConversationLanguage: code,
    ConversationLanguageName: LANGUAGE_NAMES[code],
    AgentPromptLanguage: code,
    GitCommitMessages: code,
    CodeComments: code,
    Documentation: code,
    ErrorMessages: code,
    DevelopmentMode: "tdd", // the --mode flag default is tdd (cli/init.go:76); the context default is ModeTDD
    GitMode: git.GitMode,
    GitProvider: git.GitProvider,
    GitHubUsername: git.GitHubUsername,
    GitLabInstanceURL: git.GitLabInstanceURL,
    TestCoverageTarget: 85, // config.DefaultTestCoverageTarget (internal/config/defaults.go:19), the context default
    EnforceQuality: true, // the context default (template/context.go NewTemplateContext)
    CreatedAt: createdAt,
    Version: version,
    ResolvedMoaiPath: groupBinPath,
  };
}

// posixPath (template/renderer.go:27-29) replaces each backslash with a slash.
const engine = createEngine({
  fromString: (text) => text,
  isT: () => false,
  funcs: {
    posixPath: { fn: (value) => String(value).replaceAll("\\", "/"), argTypes: ["string"], arity: { kind: "exact" }, returnType: "string" },
  },
});

// renderTemplate renders a seed template with the engine. Every field that the template names must have a value: a missing
// field is an error that names it, so no placeholder is left in a seeded file.
export function renderTemplate(text, values) {
  for (const action of text.match(/\{\{[^}]*\}\}/g) ?? []) {
    for (const [, name] of action.matchAll(/\.(\w+)/g)) {
      if (!Object.hasOwn(values, name)) throw new Error(`template field ${name} has no value`);
    }
  }
  return engine.parse(text).evaluate(values).join("");
}
