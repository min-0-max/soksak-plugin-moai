// Checks the seed of the .moai folder: the values that init renders, derived as the seed decision states, and the renderer.
// Sources (moai-adk v3.1.2): template/context.go (NewTemplateContext defaults, With* setters), cli/init.go (flag defaults),
// cli/init_gitdetect.go (detectGitConfig, hostFromRemoteURL), config/defaults.go, pkg/models/lang.go (LangNameMap).
import assert from "node:assert/strict";
import test from "node:test";
import { gitValues, parseOriginUrl, renderTemplate, templateValues } from "../ui/seed-model.js";

const ORIGIN_GITHUB = '[core]\n\trepositoryformatversion = 0\n[remote "origin"]\n\turl = git@github.com:min-0-max/soksak.git\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n';
const ORIGIN_GITLAB = '[remote "origin"]\n\turl = https://gitlab.example.com/team/app.git\n';
const OTHER_REMOTE = '[remote "upstream"]\n\turl = https://github.com/modu-ai/moai-adk.git\n';

test("parseOriginUrl reads the url of the origin section only", () => {
  assert.equal(parseOriginUrl(ORIGIN_GITHUB), "git@github.com:min-0-max/soksak.git");
  assert.equal(parseOriginUrl(OTHER_REMOTE), null);
  assert.equal(parseOriginUrl("[core]\n\tbare = false\n"), null);
});

test("gitValues: no configuration gives the init default, manual mode with github", () => {
  assert.deepEqual(gitValues(null), { GitMode: "manual", GitProvider: "github", GitHubUsername: "", GitLabInstanceURL: "" });
  assert.deepEqual(gitValues("[core]\n\tbare = false\n"), { GitMode: "manual", GitProvider: "github", GitHubUsername: "", GitLabInstanceURL: "" });
});

test("gitValues: a github origin gives personal mode, the github provider and the owner as username", () => {
  assert.deepEqual(gitValues(ORIGIN_GITHUB), { GitMode: "personal", GitProvider: "github", GitHubUsername: "min-0-max", GitLabInstanceURL: "" });
  assert.deepEqual(gitValues('[remote "origin"]\n\turl = https://github.com/min-0-max/soksak\n'), {
    GitMode: "personal", GitProvider: "github", GitHubUsername: "min-0-max", GitLabInstanceURL: "",
  });
});

test("gitValues: a non-github origin gives the gitlab provider and the instance URL; any remote makes personal mode", () => {
  assert.deepEqual(gitValues(ORIGIN_GITLAB), { GitMode: "personal", GitProvider: "gitlab", GitHubUsername: "", GitLabInstanceURL: "https://gitlab.example.com" });
  assert.deepEqual(gitValues(OTHER_REMOTE), { GitMode: "personal", GitProvider: "github", GitHubUsername: "", GitLabInstanceURL: "" });
});

test("templateValues: project, locale, git and the release values; init's defaults for the rest", () => {
  const values = templateValues({
    projectName: "soksak",
    locale: "ko",
    git: gitValues(ORIGIN_GITHUB),
    createdAt: "2026-11-23T01:02:03Z",
    version: "v3.1.2",
    groupBinPath: "/data/moai/bin/moai",
  });
  assert.equal(values.ProjectName, "soksak");
  assert.equal(values.ConversationLanguage, "ko");
  assert.equal(values.ConversationLanguageName, "Korean (한국어)");
  assert.equal(values.AgentPromptLanguage, "ko");
  assert.equal(values.CodeComments, "ko");
  assert.equal(values.Documentation, "ko");
  assert.equal(values.GitCommitMessages, "ko");
  assert.equal(values.ErrorMessages, "ko");
  assert.equal(values.UserName, "");
  assert.equal(values.DevelopmentMode, "tdd");
  assert.equal(values.TestCoverageTarget, 85);
  assert.equal(values.EnforceQuality, true);
  assert.equal(values.CreatedAt, "2026-11-23T01:02:03Z");
  assert.equal(values.Version, "v3.1.2");
  assert.equal(values.ResolvedMoaiPath, "/data/moai/bin/moai");
  assert.equal(values.GitMode, "personal");
});

test("templateValues: a locale that moai does not name is an error, not a silent English value", () => {
  assert.throws(() => templateValues({ projectName: "p", locale: "xx", git: gitValues(null), createdAt: "t", version: "v", groupBinPath: "/b" }), /locale xx/);
});

test("renderTemplate replaces fields and keeps a block only when the field is set", () => {
  const values = { Name: "soksak", Path: "/bin/moai", Empty: "" };
  assert.equal(renderTemplate("name: {{.Name}}\n{{if .Path}}path: {{.Path}}\n{{end}}", values), "name: soksak\npath: /bin/moai\n");
  assert.equal(renderTemplate("{{if .Empty}}hidden{{end}}shown", values), "shown");
});

test("renderTemplate refuses a field that has no value", () => {
  assert.throws(() => renderTemplate("x: {{.Missing}}", {}), /Missing/);
  assert.throws(() => renderTemplate("{{if .Missing}}x{{end}}", {}), /Missing/);
  assert.throws(() => renderTemplate("{{nosuch .Name}}", { Name: "x" }), /nosuch/);
  assert.equal(renderTemplate("{{range .Items}}<{{.}}>{{end}}", { Items: ["a", "b"] }), "<a><b>");
});

test("renderTemplate applies posixPath, which replaces backslashes with slashes (template/renderer.go:27-29)", () => {
  assert.equal(renderTemplate('exec "{{posixPath .Path}}" run', { Path: "C:\\bin\\moai" }), 'exec "C:/bin/moai" run');
});

test("templateValues refuses a locale that moai does not name, and names the supported languages", () => {
  assert.throws(
    () => templateValues({ projectName: "soksak", locale: "pt", git: gitValues(null), createdAt: "t", version: "v3.1.2", groupBinPath: "$MOAI_HOME/bin/moai" }),
    /^Error: locale pt is not a language moai names; supported: ko, en, ja, zh, es, fr, de$/,
  );
});
