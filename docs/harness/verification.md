# 검증 하네스

**한 줄:** `npm run verify` — 앞 단계가 실패하면 그 자리에서 멈춘다.
판단 기준은 [ssot.md](ssot.md), 규칙 원문은 [06-architecture.md](../06-architecture.md).

---

## 핵심 규칙

1. **검증은 `npm run verify` 하나다.** 통과한 단계만 골라 보고하지 않는다.
2. **실패하면 멈춘다.** 건너뛰거나(`--no-verify`, `skip`) 우회하지 않는다.
3. **게이트가 막으면 규칙이 아니라 코드를 고친다.** 규칙이 틀렸다고 판단되면 고치지 말고 사람에게 묻는다.
4. **검증은 `verify.db` 만 건드린다.** `dev.db` 는 개발자의 작업 데이터다.
5. **보호 영역은 사람 승인 없이 못 바꾼다.** `spec-approved` 라벨이 곧 승인이다 ([§3](ssot.md)).

---

## 1. 파이프라인

| 단계 | 명령 | 보장 |
|---|---|---|
| Prepare | `verify:prepare` | 매번 같은 시드에서 출발 (재고 1194 · 이동 59) |
| Types | `typecheck` | `tsc --noEmit` |
| Lint | `lint` | `eslint` |
| Test | `test` | `vitest run` 19건 |
| Build | `build` | `prisma generate` + `next build` |

---

## 2. DB 격리 — 검증은 `prisma/verify.db`

테스트가 재고를 실제로 움직이므로 `dev.db` 를 쓰면 ① 이전 실행 잔재 위에서 검증하고 ② 개발 서버가 파일을 잠가 초기화가 실패한다(`EPERM`).

| 무엇 | 어디 |
|---|---|
| DB 삭제 + 재생성 + 시드 (저널·WAL 포함) | `scripts/prepare-verify.ts` |
| 테스트가 볼 DB 고정 | `vitest.config.ts` → `test.env.DATABASE_URL` |

→ 개발 서버를 켜둔 채 검증해도 되고, 검증이 로컬 데이터를 지우지 않는다.

---

## 3. 자동 테스트 (19건, 순차 실행)

| 파일 | 건수 | 지키는 것 |
|---|---|---|
| `fefo.test.ts` | 8 | 출고는 임박분(FEFO), 발송은 넉넉분(LEFO) — 같은 재고를 정반대로 고른다 |
| `stock-invariant.test.ts` | 6 | 거점 이동은 총량 불변 · 초과 출고는 전부 롤백 · `Lot` = `Movement` 합계 |
| `popup-settle.test.ts` | 5 | 누적 반출 기준 역산 · 되돌리면 재고 복귀 · 반출보다 많이 못 돌아옴 |

---

## 4. 반자동 (필요할 때 직접, `dev.db` 대상)

| 명령 | 쓰임 |
|---|---|
| `npx tsx scripts/verify-m1.ts` | 시드 상태 7항목 점검 |
| `npx tsx scripts/verify-headline.ts` | 대표 유통기한 단일 로트 회귀 |
| `npx tsx scripts/snapshot.ts` | 거점별 재고 총량 대조 |
| `npx tsx scripts/make-token.ts` | 세션 JWT 발급 |
| `npx prisma studio` | DB 직접 조회 |

---

## 5. 사람 몫

시나리오 재현([S1~S9](../03-scenarios.md)) · QA 체크리스트([07-plan §2](../07-plan.md)) · 화면 대조(`docs/screenshots/` 31장) · 동시 조작 · 한글 IME

---

## 6. CI — `.github/workflows/verify.yml`

| 잡 | 언제 | 하는 일 |
|---|---|---|
| `verify` | main 푸시 · PR | `npm ci` → `npm run verify` (ubuntu, Node 24) |
| `protected-areas` | PR 만 | 보호 영역 변경 시 `spec-approved` 라벨 없으면 실패 |

**보호 영역:** `01-requirements.md` · `06-architecture.md` · `ssot.md` · `AGENTS.md` · `CLAUDE.md` · 검증 스크립트 · 워크플로
에이전트는 라벨을 붙일 수 없다 → 라벨 요구가 곧 사람 승인 요구다 (SSOT §3).
**한계:** main 직접 푸시는 PR 이 없어 지나간다 — 브랜치 보호 설정이 별도로 필요하다.

`.env` 는 커밋하지 않으므로 `DATABASE_URL`·`SESSION_SECRET` 을 CI 에서 준다 (없으면 각각 `migrate deploy` 와 `session.ts` 가 실패). CI 의 시크릿은 더미다.

---

## 7. 아직 못 덮는 것

| 항목 | 이유 |
|---|---|
| 아키텍처 경로 규칙 | `scripts/check-architecture.ts` 는 있으나 파이프라인 미연결 |
| F8 실사 · F9 폐기 · F10 이력 · 설정 화면 | M7 미구현 (라우트 없음) |
| 브라우저 E2E | Playwright 설치됨, 자동화 시나리오 없음 |
| 동시성 · IME | §5 참조 |
