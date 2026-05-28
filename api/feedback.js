export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { completedCount, totalCount, todos } = req.body;

  const doneTodos = todos.filter((t) => t.done).map((t) => t.text);
  const pendingTodos = todos.filter((t) => !t.done).map((t) => t.text);

  const prompt = `당신은 사용자의 하루를 응원하는 따뜻한 코치입니다.

완료한 할 일: ${doneTodos.length > 0 ? doneTodos.join(", ") : "없음"}
아직 남은 할 일: ${pendingTodos.length > 0 ? pendingTodos.join(", ") : "없음"}

규칙:
1. 완료한 할 일 중 한 가지를 직접 언급하며 칭찬해주세요.
2. 딱 한 문장, 이모지 1개 포함.
3. 숫자("4개" 등)는 쓰지 말고, 구체적인 활동 이름을 사용해주세요.
4. 자연스러운 한국어로 작성해주세요.`;

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
        temperature: 0.8,
      }),
    });

    const data = await response.json();
    const feedback = data.choices?.[0]?.message?.content?.trim();

    if (!feedback) throw new Error("No feedback returned");
    res.status(200).json({ feedback });
  } catch (err) {
    console.error(err);
    res.status(500).json({ feedback: "오늘도 꾸준히 나아가고 있어요. 잘하고 있습니다! 💪" });
  }
}
