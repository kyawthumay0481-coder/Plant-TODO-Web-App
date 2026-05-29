import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./lib/supabase";
import "./App.css";

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// ─── 식물 단계 ───────────────────────────────────────
const TW = "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg";
const PLANT_STAGES = [
  { min: 0,  icon: `${TW}/1f331.svg` },  // 🌱
  { min: 3,  icon: `${TW}/1f33f.svg` },  // 🌿
  { min: 7,  icon: `${TW}/1f338.svg` },  // 🌸
  { min: 14, icon: `${TW}/1f34e.svg` },  // 🍎
];
const DEAD_ICON = `${TW}/1f940.svg`;
const STAGE_MINS = PLANT_STAGES.map(s => s.min); // [0, 3, 7, 14]

// 죽었을 때 후퇴할 streak 값 (한 단계 아래 최솟값)
const getRegression = (streak) => {
  const cur = [...STAGE_MINS].reverse().find(m => streak >= m) ?? 0;
  const idx = STAGE_MINS.indexOf(cur);
  return idx > 0 ? STAGE_MINS[idx - 1] : 0;
};

// ─── 날씨 ─────────────────────────────────────────────
const getWeatherInfo = (code) => {
  if (code == null) return { emoji: "🌤", label: "확인 중",    dailyGoal: 1, witherDays: 3 };
  if (code === 0)   return { emoji: "☀️",  label: "맑음",      dailyGoal: 1, witherDays: 3 };
  if (code <= 2)    return { emoji: "🌤",  label: "구름 조금",  dailyGoal: 1, witherDays: 3 };
  if (code <= 3)    return { emoji: "⛅",  label: "흐림",      dailyGoal: 2, witherDays: 2 };
  if (code <= 48)   return { emoji: "🌫",  label: "안개",      dailyGoal: 2, witherDays: 2 };
  if (code <= 67)   return { emoji: "🌧",  label: "비",        dailyGoal: 3, witherDays: 2 };
  if (code <= 77)   return { emoji: "❄️",  label: "눈",        dailyGoal: 2, witherDays: 3 };
  if (code <= 82)   return { emoji: "🌦",  label: "소나기",    dailyGoal: 3, witherDays: 2 };
  return                    { emoji: "⛈", label: "폭풍",      dailyGoal: 5, witherDays: 1 };
};

// ─── 날짜 헬퍼 ──────────────────────────────────────
const toDateStr = (d = new Date()) => d.toLocaleDateString("en-CA");
const daysDiff  = (s) => s ? Math.floor((new Date(toDateStr()) - new Date(s)) / 86400000) : Infinity;

// ─── Supabase plant_stats ────────────────────────────
const fetchStats = async () => {
  const { data } = await supabase.from("plant_stats").select("*").eq("id", 1).single();
  return data ? { streak: data.streak, lastGoalDate: data.last_goal_date } : { streak: 0, lastGoalDate: null };
};
const saveStats = async (streak, lastGoalDate) => {
  await supabase.from("plant_stats")
    .update({ streak, last_goal_date: lastGoalDate, updated_at: new Date().toISOString() })
    .eq("id", 1);
};

// ─── 컴포넌트 ────────────────────────────────────────
function App() {
  const [view, setView]           = useState("home");
  const [text, setText]           = useState("");
  const [todos, setTodos]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [feedback, setFeedback]   = useState("오늘 첫 할 일을 완료해보세요!");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [grown, setGrown]         = useState(false);
  const [watering, setWatering]   = useState(false);
  const [garden, setGarden]       = useState({ streak: 0, lastGoalDate: null });
  const [weather, setWeather]     = useState(null);

  const todayStr    = toDateStr();
  const weatherInfo = getWeatherInfo(weather?.code);
  const { dailyGoal, witherDays } = weatherInfo;
  const { streak, lastGoalDate }  = garden;
  const daysSince   = daysDiff(lastGoalDate);

  // 상태 판정
  const isDead     = lastGoalDate !== null && daysSince > witherDays + 1;
  const isWithered = !isDead && lastGoalDate !== null && daysSince >= witherDays;

  // 단계 계산
  const currentStage   = [...PLANT_STAGES].reverse().find(s => streak >= s.min);
  const nextStage      = PLANT_STAGES.find(s => s.min > streak);
  const plantIcon      = isDead ? DEAD_ICON : currentStage.icon;

  // 다음 단계까지 진행도
  const stageProgress  = nextStage
    ? Math.round(((streak - currentStage.min) / (nextStage.min - currentStage.min)) * 100)
    : 100;
  const daysToNext     = nextStage ? nextStage.min - streak : 0;

  // 오늘 완료 수
  const todayCompleted = todos.filter(t =>
    t.done && t.completed_at && toDateStr(new Date(t.completed_at)) === todayStr
  ).length;

  const completedCount = todos.filter(t => t.done).length;
  const fruits = ["🍓","🍊","🍋","🍇","🍎","🍑","🍒","🥝"];
  const dateLabel = new Date().toLocaleDateString("ko-KR", {
    year:"numeric", month:"long", day:"numeric", weekday:"long"
  });

  // 단계 변화 → grow-in 재생
  const prevStageRef = useRef(currentStage.min);
  useEffect(() => {
    if (currentStage.min !== prevStageRef.current) {
      setGrown(false);
      prevStageRef.current = currentStage.min;
    }
  }, [currentStage.min]);

  // 차트
  const chartData = {
    labels: ["전체","완료","미완료"],
    datasets: [{ label:"통계", data:[todos.length, completedCount, todos.length-completedCount], backgroundColor:["#81c784","#43a047","#c8e6c9"], borderRadius:12 }],
  };
  const calendarEvents = todos.filter(t => t.done && t.completed_at).map(t => ({ title: t.text, date: toDateStr(new Date(t.completed_at)) }));

  // 초기 로드
  useEffect(() => {
    (async () => {
      const [stats, { data: todosData }] = await Promise.all([
        fetchStats(),
        supabase.from("todos").select("*").order("created_at", { ascending: true }),
      ]);
      setGarden(stats);
      const loadedTodos = todosData ?? [];
      setTodos(loadedTodos);
      setLoading(false);

      // 초기 피드백: 죽음/시듦 상태 즉시 반영
      const { streak: s, lastGoalDate: lgd } = stats;
      const { witherDays: wd } = getWeatherInfo(null); // 날씨 로드 전이므로 기본값
      const ds = lgd ? Math.floor((new Date(toDateStr()) - new Date(lgd)) / 86400000) : Infinity;
      if (lgd !== null && ds > wd + 1) {
        setFeedback("식물이 시들어버렸어요. 한 단계 내려가서 다시 시작할까요? 🥀");
      } else if (lgd !== null && ds >= wd) {
        setFeedback("식물이 시들고 있어요! 얼른 할 일을 완료해주세요 🌿");
      } else if (loadedTodos.length > 0) {
        // todo가 있으면 AI 피드백 요청
        fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completedCount: loadedTodos.filter(t=>t.done).length, totalCount: loadedTodos.length, todos: loadedTodos }),
        }).then(r => r.json()).then(d => { if (d.feedback) setFeedback(d.feedback); }).catch(() => {});
      }
    })();
  }, []);

  // 날씨
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const res  = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=weather_code,temperature_2m`);
        const data = await res.json();
        setWeather({ code: data.current.weather_code, temp: Math.round(data.current.temperature_2m) });
      } catch { /* 무시 */ }
    }, () => {});
  }, []);

  // AI 피드백
  const fetchFeedback = useCallback(async (currentTodos) => {
    if (isDead)     { setFeedback("식물이 시들어버렸어요. 한 단계 내려가서 다시 시작할까요? 🥀"); return; }
    if (isWithered) { setFeedback("식물이 시들고 있어요! 얼른 할 일을 완료해주세요 🌿"); return; }
    if (currentTodos.length === 0) { setFeedback("오늘 첫 할 일을 완료해보세요!"); return; }
    setFeedbackLoading(true);
    try {
      const res  = await fetch("/api/feedback", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ completedCount: currentTodos.filter(t=>t.done).length, totalCount: currentTodos.length, todos: currentTodos }) });
      const data = await res.json();
      if (data.feedback) setFeedback(data.feedback);
    } catch { /* 유지 */ } finally { setFeedbackLoading(false); }
  }, [isDead, isWithered]);

  // 오늘 목표 달성 체크 → Supabase 저장
  const checkStreak = async (updatedTodos) => {
    const count = updatedTodos.filter(t =>
      t.done && t.completed_at && toDateStr(new Date(t.completed_at)) === todayStr
    ).length;
    if (count >= dailyGoal && lastGoalDate !== todayStr) {
      const yesterday = toDateStr(new Date(Date.now() - 86400000));
      const newStreak = lastGoalDate === yesterday ? streak + 1 : 1;
      await saveStats(newStreak, todayStr);
      setGarden({ streak: newStreak, lastGoalDate: todayStr });
    }
  };

  // 죽음 → 한 단계 후퇴
  const applyPenalty = async () => {
    const regressedStreak = getRegression(streak);
    await saveStats(regressedStreak, todayStr);
    setGarden({ streak: regressedStreak, lastGoalDate: todayStr });
    setFeedback("한 단계 내려갔어요. 다시 키워봐요! 💪");
  };

  // 처음부터 시작 (전체 초기화)
  const resetFull = async () => {
    if (!window.confirm("처음부터 시작할까요?\n모든 할 일이 삭제됩니다.")) return;
    await supabase.from("todos").delete().neq("id", 0);
    setTodos([]);
    await saveStats(0, null);
    setGarden({ streak: 0, lastGoalDate: null });
    setFeedback("새 씨앗을 심었어요. 오늘부터 다시! 🌱");
  };

  const addTodo = async () => {
    if (text.trim() === "") return;
    const { data, error } = await supabase.from("todos").insert({ text: text.trim(), done: false }).select().single();
    if (!error && data) { const u = [...todos, data]; setTodos(u); fetchFeedback(u); }
    setText("");
  };

  const toggleTodo = async (id, currentDone) => {
    const completed_at = currentDone ? null : new Date().toISOString();
    const { error } = await supabase.from("todos").update({ done: !currentDone, completed_at }).eq("id", id);
    if (!error) {
      const u = todos.map(t => t.id === id ? { ...t, done: !currentDone, completed_at } : t);
      setTodos(u);
      fetchFeedback(u);
      if (!currentDone) {
        await checkStreak(u);
        setWatering(true);
        setTimeout(() => setWatering(false), 1200);
      }
    }
  };

  const deleteTodo = async (id) => {
    const { error } = await supabase.from("todos").delete().eq("id", id);
    if (!error) { const u = todos.filter(t => t.id !== id); setTodos(u); fetchFeedback(u); }
  };

  const editTodo = async (id) => {
    const newText = prompt("새로운 할 일을 입력하세요");
    if (!newText) return;
    const { error } = await supabase.from("todos").update({ text: newText }).eq("id", id);
    if (!error) setTodos(todos.map(t => t.id === id ? { ...t, text: newText } : t));
  };

  // 죽음 상태일 때 후퇴 후 단계 미리보기
  const regressionStage = isDead
    ? [...PLANT_STAGES].reverse().find(s => getRegression(streak) >= s.min)
    : null;


  return (
    <div className="app">
      <div className="fruit-background">
        {fruits.map((f, i) => <span key={i} className={`floating-fruit fruit-${i}`}>{f}</span>)}
      </div>

      <nav className="nav">
        <button className={`nav-btn ${view==="home"?"active":""}`} onClick={() => setView("home")}>🌿 홈</button>
        <button className={`nav-btn ${view==="stats"?"active":""}`} onClick={() => setView("stats")}>📊 통계</button>
      </nav>

      {view === "home" && (<>

        {/* 날짜 + 날씨 */}
        <div className="info-bar">
          <span className="date-label">{dateLabel}</span>
          <span className="weather-badge">
            {weatherInfo.emoji} {weatherInfo.label}
            {weather?.temp != null && ` ${weather.temp}°C`}
          </span>
        </div>

        {/* 일일 목표 도트 */}
        <div className="daily-goal">
          <span className="goal-label">오늘 목표</span>
          <div className="goal-dots">
            {[...Array(Math.min(dailyGoal, 10))].map((_, i) => (
              <span key={i} className={`goal-dot ${i < todayCompleted ? "filled" : ""}`} />
            ))}
          </div>
          <span className="goal-count">{Math.min(todayCompleted, dailyGoal)}/{dailyGoal}</span>
        </div>

        {/* 식물 */}
        <div className="plant-section">
          {watering && (
            <div className="rain-overlay" aria-hidden="true">
              {[...Array(14)].map((_, i) => <span key={i} className={`rain-drop rain-drop-${i}`} />)}
            </div>
          )}
          <img
            key={plantIcon}
            src={plantIcon}
            alt="plant"
            className={["plant-img", grown?"floating":"growing", isWithered?"withered":"", isDead?"dead":"", watering?"watered":""].join(" ").trim()}
            onAnimationEnd={(e) => { if (e.animationName === "grow-in") setGrown(true); }}
          />
          {streak > 0 && !isDead && <div className="streak-badge">🔥 {streak}일 연속</div>}

          {/* 죽음 → 한 단계 후퇴 버튼 */}
          {isDead && (
            <div className="death-actions">
              <button className="penalty-btn" onClick={applyPenalty}>
                한 단계 내려가기
                <img src={regressionStage?.icon} alt="" className="btn-plant-icon" />
              </button>
              <button className="reset-link" onClick={resetFull}>처음부터 시작</button>
            </div>
          )}
        </div>

        <p className={`feedback ${feedbackLoading?"feedback--loading":""}`}>
          {feedbackLoading ? "AI가 피드백을 작성 중..." : feedback}
        </p>

        {/* streak 기반 성장 진행도 */}
        <div className="progress-area">
          <div className="progress-text">
            {nextStage
              ? `다음 단계까지 ${daysToNext}일`
              : "🏆 최고 단계 달성!"}
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width:`${stageProgress}%` }} />
          </div>
        </div>

        {!isDead && (
          <div className="input-box">
            <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key==="Enter" && addTodo()} placeholder="할 일을 입력하세요" disabled={loading} />
            <button onClick={addTodo} disabled={loading}>추가</button>
          </div>
        )}

        {loading ? <p className="loading-text">불러오는 중...</p> : (
          <ul>
            {todos.map(todo => (
              <li key={todo.id} className={todo.done?"done":""}>
                <div className="todo-left">
                  <input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo.id, todo.done)} />
                  <span>{todo.text}</span>
                </div>
                <div className="todo-buttons">
                  <button className="edit-btn" onClick={() => editTodo(todo.id)}>수정</button>
                  <button className="delete-btn" onClick={() => deleteTodo(todo.id)}>삭제</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && todos.length > 0 && (
          <div className="summary">전체 {todos.length}개 &nbsp;/&nbsp; 완료 {completedCount}개</div>
        )}
      </>)}

      {view === "stats" && (<>
        <div className="chart-box">
          <h3>📊 생산성 통계</h3>
          <Bar data={chartData} />
        </div>
        <div className="calendar-box">
          <h3>📅 완료 히스토리</h3>
          <FullCalendar plugins={[dayGridPlugin]} initialView="dayGridMonth" events={calendarEvents} height="auto" />
        </div>
      </>)}
    </div>
  );
}

export default App;
