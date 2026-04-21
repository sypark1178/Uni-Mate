# Backend Notes

## 목표

- FastAPI 연결 전제의 API 계층 준비
- PostgreSQL 스키마 설계를 반영한 도메인 모델 분리
- 대학별 환산 점수 계산과 전략 리포트 생성을 순수 함수로 제공

## 예상 엔드포인트

- `POST /profiles`
- `POST /scores/convert`
- `GET /guidelines/search`
- `GET /strategy-report/{user_id}`
- `GET /checklist/{user_id}`

## PostgreSQL 테이블 초안

- `users`
- `profiles`
- `univ_guidelines`
- `strategy_reports`
- `checklist_tasks`
