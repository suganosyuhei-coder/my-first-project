#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -n "$(git status --porcelain --untracked-files=all)" ]]; then
  echo '先に変更をコミットしてください。プレビューはコミット済みのソースから公開します。' >&2
  exit 1
fi

source_commit=$(git rev-parse HEAD)
VITE_PREVIEW_COMMIT="${source_commit:0:7}" npm run build

git push origin HEAD:refs/heads/floating-workshop-preview

publish_dir=$(mktemp -d /tmp/floating-workshop-publish.XXXXXX)
trap 'rm -rf -- "$publish_dir"' EXIT
remote_url=$(git remote get-url origin)
git clone --quiet --single-branch --branch gh-pages "$remote_url" "$publish_dir"
git -C "$publish_dir" config user.name "$(git config user.name)"
git -C "$publish_dir" config user.email "$(git config user.email)"
git -C "$publish_dir" rm -r --quiet --ignore-unmatch .
cp -R dist/. "$publish_dir/"
touch "$publish_dir/.nojekyll"
printf '{"sourceCommit":"%s"}\n' "$source_commit" > "$publish_dir/version.json"
git -C "$publish_dir" add .
if git -C "$publish_dir" diff --cached --quiet; then
  echo 'プレビューの公開ファイルは変更ありません。'
else
  git -C "$publish_dir" commit -m "Update preview from $source_commit"
  git -C "$publish_dir" push origin HEAD:refs/heads/gh-pages
fi
printf '公開ファイルを更新しました。対象コミット: %s\n' "$source_commit"
echo 'GitHub Pages のデプロイ完了後にブラウザへ反映されます。'
