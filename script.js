
const $ = id => document.getElementById(id);

let questions = [];
let currentQuestion = 0;
let score = 0;
let userAnswers = [];
let answered = false;
let currentCategory = "";
let currentLanguage = "en";

const categoryNames = {
    9: "General Knowledge",
    23: "History",
    17: "Science",
    22: "Geography",
    18: "Computers",
    21: "Sports",
    11: "Entertainment"
};

function decodeHTML(text) {
    const element = document.createElement("textarea");
    element.innerHTML = text;
    return element.value;
}

function getHistory() {
    try {
        return JSON.parse(localStorage.getItem("quizHistory")) || [];
    } catch {
        return [];
    }
}

function saveHistory(attempt) {
    const history = getHistory();
    history.unshift(attempt);

    // Keep the most recent 50 completed quizzes.
    localStorage.setItem(
        "quizHistory",
        JSON.stringify(history.slice(0, 50))
    );

    renderHistory();
}

async function startQuiz() {
    currentCategory = $("category").value;
    currentLanguage = $("language").value;

    $("setup").hidden = true;
    $("results").hidden = true;
    $("review").hidden = true;
    $("quiz").hidden = false;

    $("question").textContent = "Loading questions...";
    $("answers").replaceChildren();
    $("feedback").textContent = "";

    try {
        const url =
            `https://opentdb.com/api.php?amount=10` +
            `&category=${currentCategory}&type=multiple`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Could not connect to the quiz server.");
        }

        const data = await response.json();

        if (data.response_code !== 0 || !data.results.length) {
            throw new Error(
                "No questions found in this category. Try another category."
            );
        }

        questions = data.results.map(item => ({
            question: decodeHTML(item.question),
            correct: decodeHTML(item.correct_answer),
            options: [
                ...item.incorrect_answers,
                item.correct_answer
            ].map(decodeHTML).sort(() => Math.random() - 0.5)
        }));

        currentQuestion = 0;
        score = 0;
        userAnswers = [];
        showQuestion();

    } catch (error) {
        $("question").textContent = error.message;
        $("feedback").textContent =
            "Check your internet connection and try again.";
        $("nextBtn").hidden = true;
        $("retryBtn").textContent = "Back to Categories";
        $("results").hidden = true;
        $("setup").hidden = false;
        $("quiz").hidden = true;
    }
}

function showQuestion() {
    answered = false;

    const q = questions[currentQuestion];

    $("progress").textContent =
        `Question ${currentQuestion + 1} of ${questions.length}`;

    $("progressFill").style.width =
        `${(currentQuestion / questions.length) * 100}%`;

    $("question").textContent = q.question;
    $("answers").replaceChildren();
    $("feedback").textContent = "";
    $("nextBtn").disabled = true;
    $("nextBtn").hidden = false;

    $("nextBtn").textContent =
        currentQuestion === questions.length - 1
            ? "Finish Quiz"
            : "Next Question";

    q.options.forEach(option => {
        const button = document.createElement("button");
        button.className = "answer";
        button.textContent = option;

        button.addEventListener("click", () => {
            checkAnswer(button, option);
        });

        $("answers").appendChild(button);
    });
}

function checkAnswer(button, selected) {
    if (answered) return;

    answered = true;

    const q = questions[currentQuestion];
    userAnswers[currentQuestion] = selected;

    document.querySelectorAll(".answer").forEach(btn => {
        btn.disabled = true;

        if (btn.textContent === q.correct) {
            btn.classList.add("correct");
        }
    });

    if (selected === q.correct) {
        score++;
        $("feedback").textContent = "✅ Correct! Well done!";
        $("feedback").style.color = "green";
    } else {
        button.classList.add("wrong");
        $("feedback").textContent =
            `💡 Correct answer: ${q.correct}`;
        $("feedback").style.color = "#b91c1c";
    }

    $("progressFill").style.width =
        `${((currentQuestion + 1) / questions.length) * 100}%`;

    $("nextBtn").disabled = false;
}

$("nextBtn").addEventListener("click", () => {
    if (!answered) return;

    currentQuestion++;

    if (currentQuestion < questions.length) {
        showQuestion();
    } else {
        showResults();
    }
});

function showResults() {
    $("quiz").hidden = true;
    $("results").hidden = false;

    let emoji, title, message;

    if (score === 10) {
        emoji = "🏆🎉";
        title = "Excellent!";
        message = "Perfect score! You are amazing!";
    } else if (score >= 8) {
        emoji = "🌟👏";
        title = "Great Job!";
        message = "Wonderful work! Keep it up!";
    } else if (score >= 6) {
        emoji = "😊👍";
        title = "Good Effort!";
        message = "You're improving. Keep practising!";
    } else if (score >= 4) {
        emoji = "💪📚";
        title = "Keep Learning!";
        message = "Review your mistakes and try again.";
    } else if (score >= 2) {
        emoji = "💙🙂";
        title = "You Can Do Better!";
        message = "Revise these questions and give it another try.";
    } else {
        emoji = "🌱💙";
        title = "Better Luck Next Time!";
        message = "Every mistake helps you learn. Don't give up!";
    }

    $("emoji").textContent = emoji;
    $("resultTitle").textContent = title;
    $("resultScore").textContent =
        `Your score: ${score}/${questions.length}`;
    $("resultMessage").textContent = message;

    $("progressFill").style.width = "100%";

    saveHistory({
        id: Date.now(),
        date: new Date().toLocaleString(),
        category: categoryNames[currentCategory],
        language: currentLanguage,
        score,
        total: questions.length,
        questions: questions.map((q, index) => ({
            question: q.question,
            options: q.options,
            correct: q.correct,
            selected: userAnswers[index] ?? null
        }))
    });
}

$("startBtn").addEventListener("click", startQuiz);

$("retryBtn").addEventListener("click", () => {
    $("results").hidden = true;
    $("setup").hidden = false;
    $("quiz").hidden = true;
});

function renderHistory() {
    const history = getHistory();
    const container = $("history");
    container.replaceChildren();

    if (history.length === 0) {
        container.textContent =
            "No completed quizzes yet. Take your first quiz!";
        return;
    }

    history.forEach(attempt => {
        const card = document.createElement("div");
        card.className = "history-item";

        const details = document.createElement("p");
        details.textContent =
            `${attempt.category} — ${attempt.score}/${attempt.total} ` +
            `(${attempt.date})`;

        const reviewBtn = document.createElement("button");
        reviewBtn.textContent = "Review Answers 📖";
        reviewBtn.addEventListener("click", () => {
            showReview(attempt);
        });

        card.append(details, reviewBtn);
        container.appendChild(card);
    });
}

function showReview(attempt) {
    $("review").hidden = false;
    $("reviewContent").replaceChildren();

    attempt.questions.forEach((q, index) => {
        const card = document.createElement("div");
        card.className = "review-item";

        const question = document.createElement("p");
        question.textContent = `${index + 1}. ${q.question}`;

        const yourAnswer = document.createElement("p");
        yourAnswer.textContent =
            "Your answer: " + (q.selected ?? "Not answered");

        const correctAnswer = document.createElement("p");
        correctAnswer.textContent = "Correct answer: " + q.correct;
        correctAnswer.style.color = "green";

        card.append(question, yourAnswer, correctAnswer);
        $("reviewContent").appendChild(card);
    });

    $("review").scrollIntoView({ behavior: "smooth" });
}

$("closeReviewBtn").addEventListener("click", () => {
    $("review").hidden = true;
});

renderHistory();
