import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";

type Question = {
  id?: number;
  questionText?: string;
  answerA?: string;
  answerB?: string;
  answerC?: string;
  answerD?: string;
  correctAnswer?: "A" | "B" | "C" | "D";
  points?: number;
  order?: number;
};

type Score = {
  sessionId: number;
  groupNumber: "1" | "2";
  totalPoints: number;
};

export default function LiveDisplay() {
  const [match, params] = useRoute("/live/:sessionId");
  const sessionId = params?.sessionId ? parseInt(params.sessionId) : 0;

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [showAnswer, setShowAnswer] = useState(false);
  const [scores, setScores] = useState<Score[]>([]);

  const { data: session } = trpc.session.get.useQuery(
    { id: sessionId },
    { enabled: !!sessionId, refetchInterval: 1000 }
  );

  const { data: questions = [] } = trpc.session.getQuestions.useQuery(
    { sessionId },
    { enabled: !!sessionId }
  );

  const { data: scoresData = [] } = trpc.scoring.getScores.useQuery(
    { sessionId },
    { enabled: !!sessionId, refetchInterval: 1000 }
  );

  // Update scores
  useEffect(() => {
    if (scoresData.length > 0) {
      setScores(scoresData);
    }
  }, [scoresData]);

  // Set current question
  useEffect(() => {
    if (
      session &&
      questions.length > 0 &&
      session.currentQuestionIndex >= 0 &&
      session.currentQuestionIndex < questions.length
    ) {
      setCurrentQuestion(questions[session.currentQuestionIndex]);
      setShowAnswer(false);
      setTimeLeft(30);
    }
  }, [session?.currentQuestionIndex, questions]);

  // Countdown timer
  useEffect(() => {
    if (!currentQuestion || showAnswer) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setShowAnswer(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestion, showAnswer]);

  if (!match || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFF0E6] to-[#FFE6D5] flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold">Loading...</p>
        </div>
      </div>
    );
  }

  const group1Score = scores.find((s) => s.groupNumber === "1")?.totalPoints || 0;
  const group2Score = scores.find((s) => s.groupNumber === "2")?.totalPoints || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF0E6] to-[#FFE6D5] p-8">
      {/* Scoreboard */}
      <div className="grid grid-cols-2 gap-6 mb-8 max-w-2xl mx-auto">
        <div className="memphis-card text-center">
          <h2 className="text-2xl font-bold uppercase mb-2">{session.groupOneName}</h2>
          <div className="text-6xl font-bold text-[#FF6B9D]">{group1Score}</div>
          <p className="text-sm text-gray-600 mt-2">Points</p>
        </div>
        <div className="memphis-card text-center">
          <h2 className="text-2xl font-bold uppercase mb-2">{session.groupTwoName}</h2>
          <div className="text-6xl font-bold text-[#A8E6CF]">{group2Score}</div>
          <p className="text-sm text-gray-600 mt-2">Points</p>
        </div>
      </div>

      {/* Question Display */}
      {currentQuestion ? (
        <div className="max-w-4xl mx-auto">
          {/* Question */}
          <div className="memphis-card mb-8">
            <div className="text-center mb-6">
              <p className="text-sm text-gray-600 font-bold mb-2">
                Question {session.currentQuestionIndex + 1} of {questions.length}
              </p>
              <h1 className="text-4xl md:text-5xl font-bold uppercase memphis-shadow">
                {currentQuestion.questionText}
              </h1>
            </div>

            {/* Timer */}
            <div className="flex justify-center mb-8">
              <div
                className={`w-32 h-32 rounded-full flex items-center justify-center text-6xl font-bold border-4 ${
                  showAnswer
                    ? "bg-green-100 border-green-500 text-green-600"
                    : timeLeft <= 5
                    ? "bg-red-100 border-red-500 text-red-600 animate-pulse"
                    : "bg-[#FFE66D] border-[#FFE66D] text-black"
                }`}
              >
                {timeLeft}
              </div>
            </div>

            {/* Answers */}
            <div className="grid grid-cols-2 gap-4">
              {["A", "B", "C", "D"].map((letter) => {
                const answerText =
                  currentQuestion[`answer${letter}` as keyof Question];
                const isCorrect = letter === currentQuestion.correctAnswer;
                const shouldHighlight = showAnswer && isCorrect;

                return (
                  <div
                    key={letter}
                    className={`p-6 rounded-xl border-4 font-bold text-lg uppercase transition-all ${
                      shouldHighlight
                        ? "bg-green-300 border-green-600 scale-105 shadow-lg"
                        : "bg-white border-black"
                    }`}
                  >
                    <span className="font-black text-2xl">{letter}.</span> {answerText}
                  </div>
                );
              })}
            </div>

            {/* Points */}
            {showAnswer && (
              <div className="mt-8 text-center bg-[#A8E6CF] bg-opacity-30 p-4 rounded-lg border-2 border-black">
                <p className="text-sm font-bold">Points for this question:</p>
                <p className="text-4xl font-bold">{currentQuestion.points}</p>
              </div>
            )}
          </div>
        </div>
      ) : session.status === "completed" ? (
        <div className="memphis-card max-w-2xl mx-auto text-center py-12">
          <h1 className="text-5xl font-bold uppercase memphis-shadow mb-4">
            Quiz Complete!
          </h1>
          <div className="text-2xl font-bold mb-8">
            {group1Score > group2Score
              ? `${session.groupOneName} wins!`
              : group2Score > group1Score
              ? `${session.groupTwoName} wins!`
              : "It's a tie!"}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-bold">{session.groupOneName}</p>
              <p className="text-4xl font-bold text-[#FF6B9D]">{group1Score}</p>
            </div>
            <div>
              <p className="font-bold">{session.groupTwoName}</p>
              <p className="text-4xl font-bold text-[#A8E6CF]">{group2Score}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="memphis-card max-w-2xl mx-auto text-center py-12">
          <p className="text-2xl font-bold">Waiting for quiz to start...</p>
        </div>
      )}
    </div>
  );
}
