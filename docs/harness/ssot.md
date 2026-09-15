# SSOT — 단일 원본

**목적:** 요구사항·아키텍처 핵심 기준  
**용도:** 판단·참고 (상세는 원본 문서)

---

## 1. 요구사항

### 핵심
5개 거점의 유통기한 기반 재고 관리. Lot(SKU×거점×유통기한) 최소 단위. 출고=FEFO(임박), 발송=LEFO(넉넉). 팝업 반출→판매/시식/반품 역산.

[자세히](../01-requirements.md)

### 기능 F1~F11
F1 상품 | F2 거점 | F3 재고조회 | F4 입고 | F5 출고 | F6 이동 | F7 팝업 | F8 조정 | F9 만료 | F10 이력 | F11 로그인

[자세히](../01-requirements.md)

### DoD (완료기준)
Lot분리 ✓ | FEFO ✓ | LEFO ✓ | 배송중 ✓ | 팝업역산 ✓ | 시식분리 ✓ | 파손집계 ✓ | 사유필수 ✓ | 임박알림 ✓ | 반응형 ✓ | 이력 ✓ | 재시작 ✓

[자세히](../01-requirements.md)

---

## 2. 아키텍처

### 스택
Next.js 16 + TypeScript + SQLite + Server Actions

[자세히](../06-architecture.md)

### 핵심 모델
- **User** (id, email, password_hash, role)
- **Movement** (type, lot_id, qty, reason, user_id, created_at) ← 감사로그
- **Lot** (product_id, location_id, expiry_date, quantity)

모든 재고변경은 Movement를 통해서만 (트랜잭션 보호)

[자세히](../06-architecture.md)

### 핵심 로직 3가지
1. **applyMovement()** — 재고증감 유일통로 (미정: 구현 순서)
2. **FEFO/LEFO** — 자동배분 규칙 (미정: UI 상세)
3. **팝업 정산** — 역산 계산 (미정: 손실 사유 분류)

[자세히](../06-architecture.md)

---

## 3. 보호 영역과 소유권

SSOT를 보호하는 영역별 역할 분담.

| 영역 | AI(Claude) | 사람 |
|------|-----------|------|
| **애플리케이션 코드** | Issue 범위 내 수정 | ✓ 최종 승인 |
| **Issue별 테스트** | 작성·수정 | ✓ 전체 검토 |
| **요구사항·아키텍처** | 읽기만 | ✓ 변경·승인 |
| **하니스 핵심 규칙** | 읽기만 | ✓ 변경·승인 |
| **검증 스크립트** | 실행 | ✓ 정책 변경 승인 |

---

## 4. 정책 (사람에게 넘길 판단)

### F5 출고

| 충돌 | 판단 기준 |
|------|---------|
| FEFO vs 사용자 우선 선택 | 요구사항(FEFO 강제) 우선 |
| 사유 필수 vs 사유 생략 | 아키텍처(필수) 우선 |
| 임박 로트 부족 시 차감 | 요구사항(차감 후 다음) 우선 |
| 2개 SSOT 상충 | 사람이 기준 고쳐질 때까지 구현 금지 |

[F5 상세](../01-requirements.md)

---

## 5. 검증

`npm run verify` — prepare → types → lint → test → build. 실패하면 멈춘다.
검증 전용 `verify.db` 를 쓴다. `dev.db` 는 건드리지 않는다.
보호 영역 변경은 `spec-approved` 라벨 없이 통과하지 못한다 (§3).

[자세히](verification.md)

---

## 6. 구현루프
**상태:** 미정 (구현 중 채우기)

[추후](ssot.md)
---

## 참고
- [요구사항](../01-requirements.md) | [아키텍처](../06-architecture.md) | [시나리오](../03-scenarios.md) | [계획](../07-plan.md)
