package main

import (
	"fmt"

	"github.com/modu-ai/moai-adk/internal/mark"
	"github.com/modu-ai/moai-adk/pkg/version"
)

func main() {
	fmt.Println(version.Version, version.Commit, mark.Source)
}
