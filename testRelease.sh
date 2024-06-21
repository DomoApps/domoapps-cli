# Parse arguments directly without the loop
while [[ "$#" -gt 0 ]]; do
    case $1 in
        github_api_token=*) github_api_token="${1#*=}";;
        owner=*) owner="${1#*=}";;
        repo=*) repo="${1#*=}";;
        tag=*) tag="${1#*=}";;
        directory=*) directory="${1#*=}";;
        *) echo "Unknown parameter passed: $1"; exit 1;;
    esac
    shift
done

# Validate required parameters
if [[ -z $github_api_token || -z $owner || -z $repo || -z $tag || -z $directory ]]; then
    echo "Error: Missing required parameters!"
    exit 1
fi

# Move and compress files
cd dist || { echo "Error: Directory 'dist' not found!"; exit 1; }
mv ryuu-linux domo-linux
mv ryuu-macos domo
mv ryuu-win.exe domo.exe
zip -q domo-linux.zip domo-linux
zip -q domo.zip domo
zip -q domo.exe.zip domo.exe

# Calculate checksums
CHECKSUM_LINUX=$(shasum -a 256 domo-linux.zip | awk '{print $1}')
CHECKSUM_MACOS=$(shasum -a 256 domo.zip | awk '{print $1}')
CHECKSUM_WIN=$(shasum -a 256 domo.exe.zip | awk '{print $1}')

# Define file paths and URLs
DIRECTORY_MACOS="$HOME/$directory/$repo/domo.rb"
DIRECTORY_LINUX="$HOME/$directory/$repo/domo-linux.rb"
LINUX_FILE="domo-linux.zip"
MACOS_FILE="domo.zip"
WIN_FILE="domo.exe.zip"
DOWNLOAD_SED_MACOS="https://github.com/$owner/$repo/releases/download/$tag/$MACOS_FILE"
DOWNLOAD_SED_LINUX="https://github.com/$owner/$repo/releases/download/$tag/$LINUX_FILE"

# GitHub API URLs
GH_API="https://api.github.com"
GH_RELEASE="$GH_API/repos/$owner/$repo/releases"
AUTH="Authorization: Bearer $github_api_token"

# Create draft release
echo "Creating draft release..."
BODY='{"tag_name": "'"$tag"'"}'
ID=$(curl -s -X POST -H "$AUTH" -d "$BODY" "$GH_RELEASE" | jq -r '.id')
[ "$ID" ] || { echo "Error: Failed to get release id for tag: $tag"; exit 1; }
