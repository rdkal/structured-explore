# Structured explore: <what it looks at>.
# Needs DATA, the data root. Reads what explore.yaml names under $(DATA), writes $(OUT).

ifndef DATA
$(error DATA is not set, e.g. make DATA=/path/to/data)
endif

D := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
OUT := $(DATA)/analysis/explore/<date>-<name>
# The tool. Pin a tag once the explore is published, e.g. ...structured-explore@v0.1.0.
SE ?= uvx --from git+https://github.com/rdkal/structured-explore structured-explore

.PHONY: build

# Build the page, explore.json and the figures' data from explore.yaml.
build:
	cd $(DATA) && $(SE) build $(D) $(OUT)
