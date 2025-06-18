#!/bin/bash
set -e

# Build the CLI (uncomment if you have a build step)
# npm run build

# Find the .nuspec file (assumes it's named domoapps-cli.nuspec)
NUSPEC_FILE="domoapps-cli.nuspec"

if [ ! -f "$NUSPEC_FILE" ]; then
  echo "Error: $NUSPEC_FILE not found. Please create a .nuspec file for your Chocolatey package."
  exit 1
fi

# Pack the Chocolatey package
choco pack "$NUSPEC_FILE"

# Find the generated .nupkg file
NUPKG_FILE=$(ls *.nupkg | sort | tail -n 1)

if [ -z "$NUPKG_FILE" ]; then
  echo "Error: .nupkg file not found after packing."
  exit 1
fi

# Check for API key
if [ -z "$CHOCO_API_KEY" ]; then
  echo "Error: CHOCO_API_KEY environment variable not set."
  echo "Please add 'export CHOCO_API_KEY=your-choco-api-key' to your shell profile."
  exit 1
fi

# Push the package to Chocolatey
choco push "$NUPKG_FILE" --source https://push.chocolatey.org/ --api-key "$CHOCO_API_KEY"
