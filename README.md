# leetcode-commit

LeetCode의 최근 Accepted 제출 코드를 자동으로 GitHub 레포지토리에 커밋&푸시하는 TypeScript CLI 도구입니다. LLM(Claude Code 등)에서 프로그래밍 방식으로 호출하는 용도로 설계되었습니다.

CLI 명령어는 `leetcode-commit` 또는 단축형 `lcp`로 실행할 수 있습니다.

---

## ⭐ 핵심 명령어 3종

이 도구의 일상 워크플로우는 단 3개의 명령어로 구성됩니다.

| 명령어 | 역할 | 사용 빈도 |
|--------|------|-----------|
| **`lcp init`** | 최초 1회 — 세션 쿠키 + 레포 경로를 설정 | 설치 후 한 번 |
| **`lcp cookie`** | 브라우저에서 `LEETCODE_SESSION` 쿠키 자동 추출/갱신 | 로그인 만료 시 |
| **`lcp submit`** | LeetCode에서 Accepted 제출 코드를 가져와 커밋 & 푸시 | 매 풀이마다 |

### 1️⃣ `lcp init` — 최초 설정

```bash
lcp init                # 대화형 설정 (쿠키를 직접 붙여넣기)
lcp init --auto-cookie  # 브라우저에서 쿠키 자동 추출 후 설정
```

설정 파일은 `~/.leetcode-commit/config.json`에 저장됩니다. 한 번만 실행하면 됩니다.

```
Welcome to leetcode-commit setup!

LeetCode session cookie (LEETCODE_SESSION value): eyJ0eXAiOiJKV1QiLCJhbGci...
CSRF token (optional, press Enter to skip):
Local path to GitHub repository: /Users/yourname/leetcode-solutions

✓ Config saved to ~/.leetcode-commit/config.json
```

### 2️⃣ `lcp cookie` — 쿠키 자동 추출 / 갱신

로컬 브라우저(Chrome / Firefox / Edge / Brave / Arc)에서 `LEETCODE_SESSION` 쿠키를 자동으로 추출해 설정에 반영합니다. **세션이 만료될 때마다 한 줄로 갱신** 가능합니다 (macOS 지원).

```bash
lcp cookie                    # 감지된 브라우저에서 자동 추출
lcp cookie --browser chrome   # 특정 브라우저 지정
lcp cookie --list             # 감지된 브라우저 및 쿠키 DB 경로 확인
lcp cookie refresh            # 강제 갱신 (cookie 와 동일하지만 명시적)
```

> 💡 **자동 갱신**: `lcp submit` 실행 중 인증 실패가 발생하면 자동으로 브라우저 쿠키를 다시 추출해서 재시도합니다. 끄려면 `--no-auto-refresh`.

### 3️⃣ `lcp submit` — Accepted 제출 코드 커밋 & 푸시

문제 번호만 넘기면 → LeetCode에서 최신 Accepted 제출 조회 → 파일 생성 → 메타데이터 주석 삽입 → 커밋 → 푸시 → README 통계 갱신까지 한 번에 처리합니다.

```bash
lcp submit                    # 인자 없이 실행 → 가장 최근 Accepted 제출 1건
lcp submit 1                  # 문제 번호 1번
lcp submit 1 15 42 121        # 여러 문제 한 번에
lcp submit 1 --dry-run        # 파일만 생성, 커밋/푸시 생략
lcp submit 1 --no-push        # 커밋만, 푸시 생략
lcp submit 1 --no-readme      # README 자동 갱신 생략
```

**출력 예시:**

```
→ Fetching problem #1...
ℹ Problem: #1 - Two Sum (Easy)
ℹ Language: Python3
✓ File saved: /Users/yourname/leetcode-solutions/0001-two-sum/solution.py
✓ Committed: feat: solve #1 - Two Sum (Easy) [python3]
ℹ Commit hash: a3f8c21
→ Pushing to remote...
✓ Pushed to remote repository
```

---

## 기능

- 문제 번호 입력만으로 최근 Accepted 제출 코드 자동 조회
- 파일명/디렉토리 자동 생성 (`0001-two-sum/solution.py` 형식)
- 파일 상단에 문제 메타데이터(제목, 난이도, URL, 제출일) 자동 삽입
- 동일 코드 중복 커밋 방지
- Git push conflict 발생 시 자동 `pull --rebase` 재시도
- 인증 실패 시 브라우저에서 세션 쿠키 자동 추출 후 재시도
- 여러 문제를 한 번에 처리 가능
- 풀이 레포의 `README.md`에 난이도별 원형 차트 / 토픽별 막대 차트 자동 갱신 (Mermaid)

## 사전 요구사항

- Node.js 18 이상
- LeetCode 계정 (Accepted 제출 이력)
- 로컬에 git clone된 GitHub 레포지토리
- (선택) 자동 쿠키 추출은 현재 **macOS** 에서만 지원

## 설치

### npm global 설치 (권장)

```bash
npm install -g leetcode-commit
```

### 소스에서 빌드

```bash
git clone https://github.com/yourname/leetcode-commit
cd leetcode-commit
npm install
npm run build
npm link
```

## 빠른 시작

```bash
# 1. 설치
npm install -g leetcode-commit

# 2. 최초 설정 (브라우저 쿠키 자동 추출)
lcp init --auto-cookie

# 3. 풀이 커밋
lcp submit 1
```

---

## 전체 명령어 레퍼런스

### `lcp submit [problems...]` — 핵심

Accepted 제출 코드를 가져와 커밋 & 푸시. 문제 번호를 생략하면 가장 최근 Accepted 제출 1건을 처리합니다.

| 옵션 | 설명 |
|------|------|
| `--dry-run` | 파일만 생성, 커밋/푸시 생략 |
| `--no-push` | 커밋만 하고 푸시 생략 |
| `--no-readme` | README 자동 갱신 생략 |
| `--no-auto-refresh` | 인증 실패 시 자동 쿠키 갱신 비활성 |
| `--no-interactive-refresh` | 브라우저 로그인 인터랙티브 프롬프트 비활성 |
| `--no-open-browser` | LeetCode 로그인 페이지 자동 열기 비활성 |

### `lcp cookie` — 핵심

로컬 브라우저에서 `LEETCODE_SESSION` 쿠키 자동 추출 (macOS).

| 옵션 / 서브명령 | 설명 |
|---------------|------|
| `--browser <name>` | `chrome` / `firefox` / `edge` / `brave` / `arc` |
| `--list` | 감지된 브라우저와 쿠키 DB 경로 출력 |
| `lcp cookie refresh` | 동일 동작의 명시적 별칭 |

### `lcp init` — 핵심

대화형 초기 설정. `~/.leetcode-commit/config.json` 생성.

| 옵션 | 설명 |
|------|------|
| `--auto-cookie` | 쿠키 입력 대신 브라우저에서 자동 추출 |

### `lcp latest`

가장 최근 Accepted 제출(문제 번호 무관) 1건만 가져와 커밋. `lcp submit`을 인자 없이 실행한 것과 동일하며, `submit`과 같은 옵션을 모두 지원합니다.

### `lcp readme`

풀이 레포의 `README.md`에 난이도/토픽 차트(Mermaid)를 갱신합니다. `submit` / `migrate` 직후 자동 실행되지만 수동으로도 호출할 수 있습니다.

| 옵션 | 설명 |
|------|------|
| `--dry-run` | 통계만 출력, 파일 미수정 |
| `--no-commit` | 파일 갱신만, 커밋 생략 |
| `--no-push` | 커밋만, 푸시 생략 |

기존 README의 사용자 영역은 보존되며, 다음 마커 사이만 갱신됩니다:

```markdown
<!-- LEETCODE-STATS:START -->
... 자동 생성 ...
<!-- LEETCODE-STATS:END -->
```

### `lcp migrate`

평면 디렉토리(`0001-two-sum/`)를 난이도 폴더(`Easy/0001-two-sum/`) 구조로 일괄 이동합니다.

| 옵션 | 설명 |
|------|------|
| `--dry-run` | 이동 미리보기만 |
| `--no-push` | 커밋만, 푸시 생략 |
| `--no-readme` | README 자동 갱신 생략 |

### `lcp config`

설정 파일(`~/.leetcode-commit/config.json`) 관리.

```bash
lcp config list                                    # 전체 설정 조회
lcp config get github.repoPath                     # 특정 키 조회
lcp config set github.repoPath /path/to/repo       # 키 설정
lcp config set leetcode.sessionCookie eyJ0eXA...   # 쿠키 수동 설정
```

---

## GitHub 레포지토리 파일 구조

커밋되는 파일은 다음 구조로 저장됩니다:

```
leetcode-solutions/
├── Easy/
│   └── 0001-two-sum/
│       └── solution.py
├── Medium/
│   ├── 0015-3sum/
│   │   └── solution.cpp
│   └── 0121-best-time-to-buy-and-sell-stock/
│       └── solution.ts
└── Hard/
    └── 0042-trapping-rain-water/
        └── solution.java
```

각 파일 상단에는 메타데이터 주석이 자동으로 추가됩니다:

```python
# Problem: #1 - Two Sum
# Difficulty: Easy
# Language: Python3
# URL: https://leetcode.com/problems/two-sum/
# Submitted: 2024-11-15

class Solution:
    def twoSum(self, nums, target):
        ...
```

## LLM에서 사용하기

Claude Code 등의 LLM에서 다음과 같이 호출할 수 있습니다:

```bash
# 문제 풀고 나서 자동으로 커밋
lcp submit 42

# 여러 문제 한꺼번에 처리
lcp submit 1 2 3 4 5
```

모든 진단 출력은 stderr로, 실제 오류 코드는 exit code로 구분됩니다.

## 트러블슈팅

### "session expired" 에러

LeetCode 세션 쿠키가 만료된 경우입니다. 가장 빠른 방법:

```bash
lcp cookie     # 브라우저에서 자동 추출
```

수동 설정도 가능합니다:

```bash
lcp config set leetcode.sessionCookie <새 쿠키 값>
```

### "No accepted submissions found" 에러

해당 문제에 Accepted 제출 기록이 없습니다. LeetCode에서 문제를 먼저 풀고 제출이 Accept되어야 합니다.

### "not a git repository" 에러

설정된 `repoPath`가 유효한 git 레포지토리가 아닙니다:

```bash
cd /path/to/your/repo
git init  # 또는
git clone https://github.com/yourname/leetcode-solutions .
```

### Git push 실패

자동으로 `pull --rebase` 후 재시도합니다. 재시도도 실패하면 수동으로 해결하세요:

```bash
cd /path/to/your/repo
git pull --rebase
git push
```

### `lcp cookie` 가 "Browser is running" 에러

브라우저가 쿠키 DB를 잠그고 있는 경우입니다. 해당 브라우저를 완전히 종료하거나 `--browser` 로 다른 브라우저를 지정하세요.

## 설정 파일 직접 편집

`~/.leetcode-commit/config.json`:

```json
{
  "leetcode": {
    "sessionCookie": "LEETCODE_SESSION=eyJ0eXAiOiJKV1Qi...",
    "csrfToken": "optional-csrf-token"
  },
  "github": {
    "repoPath": "/Users/yourname/leetcode-solutions"
  }
}
```

## 개발

```bash
# 의존성 설치
npm install

# 개발 모드 실행
npm run dev -- submit 1

# 테스트 실행
npm test

# 커버리지 포함 테스트
npm run test:coverage

# 빌드
npm run build
```

## 라이선스

MIT
