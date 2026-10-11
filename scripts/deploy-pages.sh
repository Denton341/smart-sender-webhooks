#!/usr/bin/env bash
# Builds the app for GitHub Pages and publishes dist/ to the gh-pages branch.
set -euo pipefail

cd "$(dirname "$0")/.."
origin=$(git remote get-url origin)
repo_name=$(basename -s .git "$origin")
revision=$(git rev-parse --short HEAD)

npm run lint
npm test
BASE_PATH="/${repo_name}/" npm run build

# Pages has no SPA rewrites: serve the app for deep links such as /webhooks/5?page=2.
cp dist/index.html dist/404.html
touch dist/.nojekyll

cd dist
git init -q -b gh-pages
git add -A
git commit -q -m "Deploy ${revision}"
git push -q -f "$origin" gh-pages
rm -rf .git
echo "Published ${revision} to the gh-pages branch of ${origin}"
