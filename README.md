# 🌱 식물 성장 TODO 앱

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-2.x-3ECF8E?logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?logo=vercel&logoColor=white)
![DeepSeek](https://img.shields.io/badge/AI-DeepSeek-4A90D9)
![License](https://img.shields.io/badge/License-MIT-green)

> 할 일을 완료할수록 화면 속 식물이 자라는 생산성 앱

![screenshot](./screenshot.png)

---

## ✨ 주요 기능

- ✅ **할 일 CRUD** — 추가 / 수정 / 삭제 / 완료 체크
- 🌱 **식물 성장 시스템** — streak 기반 4단계 성장
  - 🌱 씨앗 (0일~) → 🌿 새싹 (3일~) → 🌸 꽃 (7일~) → 🍎 열매 (14일~)
  - 목표 미달성 시 시듦 → 죽음 → 단계 후퇴
- 🌦 **날씨 연동** — 위치 기반 실시간 날씨, 날씨별 일일 목표 자동 조정
- 🤖 **AI 피드백** — 완료한 할 일을 읽고 맞춤 응원 메시지 생성 (DeepSeek)
- 💧 **애니메이션** — 체크 시 빗방울 이펙트, 성장 시 grow-in 애니메이션
- 📊 **통계 차트** — Chart.js 막대 그래프 (전체 / 완료 / 미완료)
- 📅 **완료 달력** — FullCalendar 월간 히스토리

---

## 🛠 기술 스택

| 분류 | 기술 | 용도 |
|---|---|---|
| Frontend | React 19 + Vite 8 | UI 프레임워크 / 빌드 도구 |
| Database | Supabase (PostgreSQL) | 할 일 · streak 데이터 저장 |
| AI | DeepSeek API | 맞춤 응원 메시지 생성 |
| 날씨 | Open-Meteo API | 무료 위치 기반 날씨 (API 키 불필요) |
| 차트 | Chart.js + react-chartjs-2 | 생산성 통계 시각화 |
| 달력 | FullCalendar | 완료 히스토리 달력 |
| 배포 | Vercel + Serverless Function | AI API 키 보호 및 배포 |
| 이모지 | Twemoji CDN | 플랫폼 일관된 SVG 이모지 |

---

## 🚀 실행 방법

### 1. 저장소 클론

```bash
git clone https://github.com/kyawthumay0481-coder/Plant-TODO-Web-App.git
cd Plant-TODO-Web-App
npm install
```

### 2. 환경변수 설정

루트에 `.env.local` 파일 생성:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
DEEPSEEK_API_KEY=sk-...
```

Vercel Serverless Function 환경변수 등록 (AI 피드백용):

```bash
vercel env add DEEPSEEK_API_KEY
# → Development 선택 후 키 입력
```

### 3. 개발 서버 실행

```bash
vercel dev   # AI 피드백 포함 전체 실행 (권장)
# 또는
npm run dev  # Vite만 실행 (AI 피드백 미작동)
```

---

## 🗄 Supabase 테이블 설정

Supabase SQL Editor에서 아래 쿼리 실행:

```sql
-- todos 테이블
CREATE TABLE todos (
  id bigint generated always as identity primary key,
  text text not null,
  done boolean default false,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- plant_stats 테이블 (streak 관리)
CREATE TABLE plant_stats (
  id bigint primary key default 1,
  streak int4 default 0,
  last_goal_date date,
  updated_at timestamptz default now()
);

INSERT INTO plant_stats (id, streak) VALUES (1, 0);

-- RLS 정책
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE plant_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public access" ON todos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public access" ON plant_stats FOR ALL USING (true) WITH CHECK (true);
```

---

## 🔐 환경변수 설명

`.env.example` 참고:

```env
# Supabase 프로젝트 URL
VITE_SUPABASE_URL=https://xxxx.supabase.co

# Supabase anon 공개 키
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# DeepSeek API 키 (서버 사이드 전용 — 절대 프론트에 노출 금지)
DEEPSEEK_API_KEY=sk-...
```

> ⚠️ `.env.local`은 `.gitignore`에 포함되어 있습니다. 절대 커밋하지 마세요.

---

## 🌿 브랜치 전략

```
main          ← 안정 배포 버전 (PR 머지만 허용)
dev           ← 개발 통합 브랜치
feature/xxx   ← 기능 개발 브랜치
fix/xxx       ← 버그 수정 브랜치
```

---

## 📝 커밋 컨벤션

```
feat     - 새 기능
fix      - 버그 수정
security - 보안 관련
refactor - 리팩토링
style    - CSS / 포맷팅
docs     - 문서 수정
chore    - 설정, 패키지 등
```

---

## 🤝 기여 방법

1. 이 저장소를 **Fork**합니다
2. 기능 브랜치를 생성합니다 (`git checkout -b feature/새기능`)
3. 변경 사항을 커밋합니다 (`git commit -m 'feat: 새기능 추가'`)
4. 브랜치에 Push합니다 (`git push origin feature/새기능`)
5. **Pull Request**를 생성합니다

---

## 👥 팀원

| 이름 | GitHub | 담당 |
|---|---|---|
| 팀원 A | [@juhyeonju](https://github.com/juhyeonju) | Supabase 연동, AI API, 식물 로직, 날씨, 애니메이션 |
| 팀원 B | [@kyawthumay0481-coder](https://github.com/kyawthumay0481-coder) | 프로젝트 초기 세팅, CRUD, 통계 차트, 달력 |

---

## 📄 라이선스

MIT License © 2025 Plant-TODO Team
