#!/usr/bin/env bash
set -euo pipefail

REPO_NAME="${1:-mobile-block-duel-wu01}"
OWNER="${GITHUB_USER:-gt10300407}"

command -v git >/dev/null || { echo "git이 필요해."; exit 1; }
command -v gh >/dev/null || { echo "GitHub CLI(gh)가 필요해: brew install gh"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "먼저 gh auth login 실행이 필요해."; exit 1; }

cd "$(dirname "$0")"

if [ ! -d .git ]; then
  git init -b main
fi

git add .
if ! git diff --cached --quiet; then
  git commit -m "WU01 mobile touch playable"
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  if gh repo view "$OWNER/$REPO_NAME" >/dev/null 2>&1; then
    git remote add origin "git@github.com:$OWNER/$REPO_NAME.git"
  else
    gh repo create "$OWNER/$REPO_NAME" --public --source=. --remote=origin
  fi
fi

git push -u origin main

echo
echo "GitHub Actions 배포가 끝나면 아래 주소로 접속해."
echo "https://$OWNER.github.io/$REPO_NAME/"
echo "진행 상태: https://github.com/$OWNER/$REPO_NAME/actions"
