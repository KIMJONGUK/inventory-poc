#!/usr/bin/env bash
# 루프 상태를 이슈와 git 에서 복원한다 — 세션이 끊기면 남는 것은 이 둘뿐이다 (loop.md §5).
# 쓰기는 하지 않는다. 판단도 하지 않는다. 읽어서 보여주기만 한다.
#
#   bash .claude/skills/issue-loop/scripts/loop-state.sh [이슈번호]
#
# 번호를 주지 않으면 현재 브랜치(issue-N-*)에서 찾고, 그것도 없으면 후보 이슈를 보여준다.
set -uo pipefail

issue="${1:-}"
branch="$(git branch --show-current 2>/dev/null)"

if [ -z "$issue" ]; then
  case "$branch" in
    issue-[0-9]*) issue="$(printf '%s' "$branch" | sed -E 's/^issue-([0-9]+).*/\1/')" ;;
  esac
fi

if [ -z "$issue" ]; then
  echo "## 대상 미정 — 브랜치($branch)에서 이슈 번호를 못 읽었다"
  echo
  echo "### 후보 (열린 maintenance · contract-draft·need-human 없음)"
  gh issue list --state open --label maintenance --json number,title,labels \
    --jq '.[] | select([.labels[].name] | (contains(["contract-draft"]) or contains(["need-human"])) | not)
          | "#\(.number) \(.title)"'
  echo
  echo "둘 이상이면 사람에게 한 번 묻는다. 없으면 이슈를 만들지 않고 알린다."
  exit 2
fi

body="$(gh issue view "$issue" --json body --jq .body)"
labels="$(gh issue view "$issue" --json labels --jq '[.labels[].name] | join(" ")')"

echo "## 이슈 #$issue"
gh issue view "$issue" --json title,state,url --jq '"제목: \(.title)\n상태: \(.state)\n링크: \(.url)"'
echo "라벨: ${labels:-(없음)}"
echo

echo "## 관문 — 확정 (loop.md §1 · 부록)"
case " $labels " in
  *" contract-draft "*) echo "  ✗ contract-draft 라벨이 붙어 있다 → 루프를 열지 않는다. 라벨은 AI 가 떼지 않는다" ;;
  *)                    echo "  ✓ contract-draft 없음" ;;
esac
case " $labels " in
  *" need-human "*) echo "  ! need-human 라벨이 붙어 있다 → 사람 답을 먼저 찾는다" ;;
esac
if gh issue view "$issue" --json comments --jq '.comments[].body' | grep -qE '^계약 확정'; then
  echo "  ✓ 「계약 확정」 댓글 있음"
else
  echo "  ✗ 「계약 확정」 댓글 없음 → 사람이 확정해야 시작한다"
fi
echo

echo "## 계약 6개 항목 (비면 시작하지 않는다 · ssot.md §4)"
for h in "1. 배경" "2. 변경할 내용" "3. 종료 조건" "4. 테스트 코드 기능명" "5. 건드리면 안 되는 것" "6. 구현 루프 최대 횟수"; do
  if printf '%s' "$body" | grep -qF "## $h"; then echo "  ✓ $h"; else echo "  ✗ $h — 없다"; fi
done
cap="$(printf '%s' "$body" | sed -n '/^## 6\./,/^## /p' | tail -n +2 | grep -oE '[0-9]+' | head -1)"
echo "  상한 N: ${cap:-비어 있음 → ssot.md §7 전역 기본값 3}"
echo

echo "## 종료 조건 (3번) ↔ 테스트 (4번) — 앞 네 줄과 뒤 네 줄이 라벨·순서까지 1:1 인가"
printf '%s' "$body" | sed -n '/^## 3\./,/^## 5\./p' | grep -E '^\s*-\s*(정상|경계|거부|불변)' || echo "  (네 줄을 못 찾았다 → 관문 1:1 실패)"
echo

echo "## 상태 댓글 (시간순 · 첫 줄만)"
comments="$(gh issue view "$issue" --json comments --jq '.comments[].body')"
printf '%s\n' "$comments" | grep -E '^(루프|NEED_HUMAN|LLM review|선택)' || echo "  (없음 → 루프가 아직 열리지 않았다. SKILL.md §2 관문부터)"
echo

last="$(printf '%s\n' "$comments" | grep -E '^(루프|NEED_HUMAN|LLM review|선택)' | tail -1)"
if [ -n "$last" ]; then
  echo "## 마지막 상태: $last"
  echo "   회차: $(printf '%s' "$last" | grep -oE '[0-9]+/[0-9]+' | head -1)"
  echo
  echo "## 마지막 댓글 전문"
  printf '%s\n' "$comments" | awk 'BEGIN{RS="\n\n\n"} END{print}' >/dev/null 2>&1
  gh issue view "$issue" --json comments --jq '.comments[-1].body' | sed 's/^/   /'
  echo
fi

echo "## git"
echo "브랜치: ${branch:-(detached)}"
echo "기대 브랜치: issue-$issue-<슬러그>"
# 이어받기 세션이 슬러그를 다시 지어내지 않도록 이미 있는 브랜치를 그대로 보여준다
existing="$(git branch -a --format='%(refname:short)' 2>/dev/null | grep -E "(^|/)issue-$issue-" | sort -u)"
if [ -n "$existing" ]; then
  echo "이미 있는 브랜치 (새로 짓지 말고 이것을 쓴다):"
  printf '%s
' "$existing" | sed 's/^/   /'
fi
echo "HEAD: $(git log -1 --format='%h %s')"
dirty="$(git status --porcelain)"
if [ -n "$dirty" ]; then
  echo "작업 트리: 변경 있음"
  printf '%s\n' "$dirty" | sed 's/^/   /' | head -20
else
  echo "작업 트리: 깨끗함"
fi
echo
echo "## PR"
pr="$(gh pr list --head "${branch:-none}" --state all --json number,state,url --jq '.[] | "#\(.number) \(.state) \(.url)"')"
echo "${pr:-  (이 브랜치로 열린 PR 없음)}"
