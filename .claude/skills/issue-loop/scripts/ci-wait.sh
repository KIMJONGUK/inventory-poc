#!/usr/bin/env bash
# CI 한 번을 기다리고 사실만 보고한다 (loop.md §6).
# 재실행 버튼은 누르지 않는다 — 초록불이 날 때까지 돌리는 것은 기계의 몫을 AI 가 침범하는 것이다.
#
#   bash .claude/skills/issue-loop/scripts/ci-wait.sh [SHA]      # 없으면 HEAD
#   오래 걸리면 run_in_background: true 로 띄우고 결과를 읽는다.
#
# exit 0 통과 · 1 실패 · 2 취소(새 커밋이 앞질렀다) · 3 run 이 안 뜬다(푸시했나)
set -uo pipefail

sha="$(git rev-parse "${1:-HEAD}")"
echo "## CI 대기 · $(git rev-parse --short "$sha") $(git log -1 --format=%s "$sha")"

id=""
for _ in $(seq 1 30); do
  id="$(gh run list --commit "$sha" --json databaseId --jq '.[0].databaseId' 2>/dev/null)"
  [ -n "$id" ] && [ "$id" != "null" ] && break
  sleep 5
done

if [ -z "$id" ] || [ "$id" = "null" ] ; then
  echo "이 커밋으로 도는 run 이 150초 안에 뜨지 않았다."
  echo "→ 푸시했는지 · PR 이 main 을 향하는지 확인한다. 워크플로는 push(main) 과 PR 에서만 돈다."
  exit 3
fi

gh run watch "$id" --interval 10 --exit-status >/dev/null 2>&1

conclusion="$(gh run view "$id" --json conclusion --jq '.conclusion')"
echo
echo "## 결과: ${conclusion:-unknown}"
gh run view "$id" --json url,jobs --jq '"링크: \(.url)", (.jobs[] | "  \(.conclusion // .status)\t\(.name)")'

# protected-areas 는 경고만 남기고 통과한다 (verification.md §6). 떴으면 사람에게 그대로 전한다.
# 로그에는 스텝 이름("보호 영역 변경 확인")과 스크립트 원문(##[group] 블록)이 같이 섞여 오므로
# 탭 앞 접두와 group 블록을 먼저 걷어내고 실제 출력만 본다.
pid="$(gh run view "$id" --json jobs --jq '.jobs[] | select(.name=="protected-areas") | .databaseId')"
if [ -n "$pid" ]; then
  out="$(gh run view "$id" --job "$pid" --log 2>/dev/null     | tr -d '
'     | awk '/##\[group\]/{skip=1} /##\[endgroup\]/{skip=0;next} !skip'     | sed -E 's/^.*	//; s/^[^ ]*Z //')"
  if printf '%s
' "$out" | grep -q '보호 영역이 변경되었습니다'; then
    echo
    echo "## 보호 영역 경고 (SSOT §3 · 막지 않는다 · 승인은 PR 리뷰에서)"
    printf '%s
' "$out" | grep -E '^( *- |SSOT)' | sed 's/^/  /'
  fi
fi

case "$conclusion" in
  success)
    echo
    echo "→ 루프 안이면 ⑥-b LLM review 로 간다 (별도 컨텍스트 · CI 통과 1건당 한 번)."
    echo "  루프 밖 변경(문서·하니스·도구)이면 여기서 끝이다 — 리뷰할 계약 3번 네 줄이 없다. 사람 리뷰로 넘긴다."
    exit 0 ;;
  cancelled|skipped)
    echo
    echo "→ 새 커밋이 앞질렀다 (concurrency cancel-in-progress). 최신 SHA 로 다시 기다린다. 회차는 쓰지 않는다."
    exit 2 ;;
  *)
    echo
    echo "## 실패 로그 (마지막 80줄)"
    gh run view "$id" --log-failed 2>/dev/null | tail -80 | sed 's/^/  /'
    echo
    echo "→ 로컬에서 재현되나?  재현되면 고친다 (CI 실패는 0회 · 고쳐서 verify 를 돌릴 때 n+1)."
    echo "  재현 안 되면 NEED_HUMAN · 환경 · n/N — 추측으로 고치지 않는다."
    exit 1 ;;
esac
