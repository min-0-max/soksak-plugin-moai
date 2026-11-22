# moai plugin repository: the test, check and pack targets (docs/features.md).
.PHONY: install test check pack

# The installation stage (core docs/spec/plugins.md#repositories): it installs the locked dependencies; the tests, checks and packs consume them without installing.
install:
	pnpm install --frozen-lockfile

test:
	pnpm test

# check runs the document check of the kit release that package.json pins, and the command name check.
check:
	pnpm exec sok-check docs
	pnpm exec sok-check commands

pack: check
	@test -n "$(OUT)" || { echo "make pack OUT=<folder>" >&2; exit 2; }
	pnpm pack --pack-destination $(OUT)
