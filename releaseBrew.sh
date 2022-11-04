#!/bin/bash
#
# This script accepts the following parameters:
#
# * owner
# * repo
# * tag
# * filename
# * github_api_token
#
# Script to upload a release asset using the GitHub API v3.
#
# Example:
#
# upload-github-release-asset.sh github_api_token=TOKEN owner=DomoApps repo=homebrew-ryuu tag=v4.2.5 filename=./build.zip
#

for ARGUMENT in "$@"
do
   KEY=$(echo $ARGUMENT | cut -f1 -d=)

   KEY_LENGTH=${#KEY}
   VALUE="${ARGUMENT:$KEY_LENGTH+1}"

   export "$KEY"="$VALUE"
done

cd dist
pkg .

mv ryuu-linux domo-linux
mv ryuu-macos domo
mv ryuu-win.exe domo.exe

zip domo-linux.zip domo-linux
zip domo.zip domo
zip domo.exe.zip domo.exe

CHECKSUM_LINUX=$(shasum -a 256 domo-linux.zip | awk '{print $1;}')
CHECKSUM_MACOS=$(shasum -a 256 domo.zip | awk '{print $1;}')
CHECKSUM_WIN=$(shasum -a 256 domo.exe.zip | awk '{print $1;}')




DIRECTORY_MACOS="$HOME/$repo/domo.rb"
DIRECTORY_LINUX="$HOME/$repo/domo-linux.rb"
LINUX_FILE="domo-linux.zip"
MACOS_FILE="domo.zip"
WIN_FILE="domo.exe.zip"
DOWNLOAD_SED_MACOS="https:\/\/github.com\/$owner\/$repo\/releases\/download\/$tag\/$MACOS_FILE"
DOWNLOAD_SED_LINUX="https:\/\/github.com\/$owner\/$repo\/releases\/download\/$tag\/$LINUX_FILE"




GH_API="https://api.github.com"
GH_REPO="$GH_API/repos/$owner/$repo"
GH_RELEASE="$GH_REPO/releases"
GH_TAGS="$GH_RELEASE/tags/$tag"
AUTH="Authorization: $github_api_token"
WGET_ARGS="--content-disposition --auth-no-challenge --no-cookie"
CURL_ARGS="-LJO#"
BODY='{"tag_name": "'"$tag"'"}'

# # Validate token.
curl -o /dev/null -sH "$AUTH" $GH_REPO || { echo "Error: Invalid repo, token or network issue!";  exit 1; }

echo "Creating draft release..."

ID=$(curl -X POST -H "$AUTH" -d "$BODY" $GH_RELEASE | jq -r '.id')

echo "Uploading linux binary..."

LINUX_ASSET="https://uploads.github.com/repos/$owner/$repo/releases/$ID/assets?name=$(basename $LINUX_FILE)"

LINUX_ASSET_RESULT=$(curl -H "Content-Type: application/zip" --data-binary @"$LINUX_FILE" -X POST -H "$AUTH" $LINUX_ASSET)

echo "Uploading mac binary..."

MACOS_ASSET="https://uploads.github.com/repos/$owner/$repo/releases/$ID/assets?name=$(basename $MACOS_FILE)"

MACOS_ASSET_RESULT=$(curl -H "Content-Type: application/zip" --data-binary @"$MACOS_FILE" -X POST -H "$AUTH" $MACOS_ASSET)

echo "Uploading windows binary..."

WIN_ASSET="https://uploads.github.com/repos/$owner/$repo/releases/$ID/assets?name=$(basename $WIN_FILE)"

WIN_ASSET_RESULT=$(curl -H "Content-Type: application/zip" --data-binary @"$WIN_FILE" -X POST -H "$AUTH" $WIN_ASSET)

sed -i '' -e '/sha256\ /s/".*"/"'$CHECKSUM_MACOS'"/'\
    -e '/download/s/".*"/"'$DOWNLOAD_SED_MACOS'"/' $DIRECTORY_MACOS
sed -i '' -e '/sha256\ /s/".*"/"'$CHECKSUM_LINUX'"/'\
    -e '/download/s/".*"/"'$DOWNLOAD_SED_LINUX'"/' $DIRECTORY_LINUX

cd $HOME/homebrew-ryuu
git add .
git commit -m "new formula version $tag"
git push