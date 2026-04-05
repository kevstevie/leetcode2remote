# leetcode-commit

LeetCode의 최근 Accepted 제출 코드를 자동으로 GitHub 레포지토리에 커밋&푸시하는 TypeScript CLI 도구입니다. LLM(Claude Code 등)에서 프로그래밍 방식으로 호출하는 용도로 설계되었습니다.

## 기능

- 문제 번호 입력만으로 최근 Accepted 제출 코드 자동 조회
- 파일명/디렉토리 자동 생성 (`0001-two-sum/solution.py` 형식)
- 파일 상단에 문제 메타데이터(제목, 난이도, URL, 제출일) 자동 삽입
- 동일 코드 중복 커밋 방지
- Git push conflict 발생 시 자동 pull --rebase 재시도
- `--dry-run` 옵션으로 파일만 생성하고 커밋 생략 가능
- 여러 문제를 한 번에 처리 가능

## 사전 요구사항

- Node.js 18 이상
- LeetCode 계정 (Accepted 제출 이력)
- 로컬에 git clone된 GitHub 레포지토리

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

## 초기 설정

### 1. LeetCode 세션 쿠키 가져오기

1. [leetcode.com](https://leetcode.com)에 로그인
2. 브라우저 개발자 도구 열기 (F12)
3. Application → Cookies → `https://leetcode.com`
4. `LEETCODE_SESSION` 쿠키 값 복사

### 2. GitHub 레포지토리 로컬 클론

```bash
git clone https://github.com/yourname/leetcode-solutions
```

### 3. 대화형 초기 설정 실행

```bash
leetcode-commit init
```

```
Welcome to leetcode-commit setup!

LeetCode session cookie (LEETCODE_SESSION value): eyJ0eXAiOiJKV1QiLCJhbGci...
CSRF token (optional, press Enter to skip): 
Local path to GitHub repository: /Users/yourname/leetcode-solutions

✓ Config saved to ~/.leetcode-commit/config.json
```

설정 파일은 `~/.leetcode-commit/config.json`에 저장됩니다.

## 사용법

### 문제 제출 코드 커밋

```bash
# 문제 번호 하나
leetcode-commit submit 1

# 여러 문제 한 번에
leetcode-commit submit 1 15 42 121

# 파일만 생성하고 커밋/푸시는 생략 (dry-run)
leetcode-commit submit 1 --dry-run

# 커밋은 하되 push는 생략
leetcode-commit submit 1 --no-push
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

### 설정 관리

```bash
# 현재 설정 전체 보기
leetcode-commit config list

# 특정 설정 값 조회
leetcode-commit config get github.repoPath

# 설정 값 변경
leetcode-commit config set github.repoPath /new/path/to/repo
leetcode-commit config set leetcode.sessionCookie eyJ0eXAiOiJKV1Qi...
```

## GitHub 레포지토리 파일 구조

커밋되는 파일은 다음 구조로 저장됩니다:

```
leetcode-solutions/
├── 0001-two-sum/
│   └── solution.py
├── 0015-3sum/
│   └── solution.cpp
├── 0042-trapping-rain-water/
│   └── solution.java
└── 0121-best-time-to-buy-and-sell-stock/
    └── solution.ts
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
leetcode-commit submit 42

# 여러 문제 한꺼번에 처리
leetcode-commit submit 1 2 3 4 5
```

모든 진단 출력은 stderr로, 실제 오류 코드는 exit code로 구분됩니다.

## 트러블슈팅

### "session expired" 에러

LeetCode 세션 쿠키가 만료된 경우입니다. 브라우저에서 다시 로그인하고 새 쿠키를 설정하세요:

```bash
leetcode-commit config set leetcode.sessionCookie <새 쿠키 값>
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
