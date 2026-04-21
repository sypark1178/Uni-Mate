# AI Module Notes

## 구성

- `parser_pipeline.py`: LlamaParse 입력/출력 파이프라인 설계
- `scoring.py`: 합격 가능성 Score 계산
- `evidence.py`: 근거 상태와 확인 불가 처리

## Score 규칙

- `W1`: 내신 적합도
- `W2`: 전공 적합도
- `W3`: 최저 충족 확률

최종 점수는 가중합으로 계산합니다.
