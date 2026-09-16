# inventory-poc — 진입점

재고관리 PoC. **이 파일이 문서 진입점이다.** 질문을 받으면 아래 규칙대로 필요한 문서 하나만 찾아 읽는다.

## 읽기 규칙

1. 시작은 항상 `docs/harness/ssot.md` **하나만** — 요구사항·아키텍처 핵심 판단표
2. SSOT로 답이 나오면 **거기서 멈춘다**
3. 부족하면 라우팅 표에서 **1차 문서 1개만** 연다
4. 그래도 부족할 때만 **확장 열 순서대로 한 번에 하나씩** 넓힌다
5. **전체 문서를 한꺼번에 읽지 않는다**

## 라우팅 표

| 질문 유형 | 1차 문서 | 확장 (순서대로) |
|---|---|---|
| 기능 범위 · 무엇을 만드나 · 완료 기준 | `docs/01-requirements.md` | 03-scenarios → HANDOVER |
| 화면 흐름 · 이 단계에서 사용자가 뭘 보나 | `docs/03-scenarios.md` | 01-requirements → 05-design |
| 데이터 모델 · 코드 위치 · 트랜잭션 · 동시성 | `docs/06-architecture.md` | HANDOVER → 01-requirements |
| UI 스펙 · 색 · 컴포넌트 · 반응형 | `docs/05-design.md` | 03-scenarios |
| 검증 · 테스트 · CI · 무엇이 자동으로 지켜지나 | `docs/harness/verification.md` | 07-plan §2 → 06-architecture §9 |
| 작업을 요청하려면 · 계약 6개 항목 · 이슈 여는 법 | `docs/harness/ssot.md` §4 | loop §1 → 요청 템플릿 |
| 재시도 한도 · 언제 멈추나 · 세션 끊김 복구 | `docs/harness/loop.md` | ssot §7 → verification |
| 무엇부터 구현 · 마일스톤 · QA 순서 | `docs/07-plan.md` | 01-requirements §7 |
| 이미 정해진 것 · 왜 이 방향인가 · 함정 | `docs/HANDOVER.md` | 06-architecture |
| 사용자가 누구 · 왜 이 기능이 필요한가 | `docs/02-personas.md` | 04-engagement |
| 차별화 장치 (할 일 카드 · 정산 · 빠른 입력) | `docs/04-engagement.md` | 03-scenarios |
| 실행 · 셋업 · 명령어 | `README.md` | HANDOVER §7 |

## 멈춤 조건 (사람에게 넘긴다)

- **문서끼리 충돌** → `docs/harness/ssot.md` §정책 확인 → 해소 안 되면 **구현하지 말고 사람에게 묻는다**
- **요구사항·아키텍처를 바꿔야 함** → AI는 읽기만. **변경은 사람 승인** (SSOT §보호 영역)
- **SSOT에 "미정"으로 적힌 항목** → 임의로 정하지 않는다
- **라우팅 표에 없는 질문** → 어느 영역인지 사람에게 먼저 확인한다

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
