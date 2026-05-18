import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, Play, SkipForward, Square } from "lucide-react";

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

export default function HostPanel() {
  const [match, params] = useRoute("/host/:sessionId");
  const sessionId = params?.sessionId ? parseInt(params.sessionId) : 0;

  const [showPointDialog, setShowPointDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<"1" | "2" | null>(null);
  const [liveUrl, setLiveUrl] = useState("");

  const { data: session, refetch: refetchSession } = trpc.session.get.useQuery(
    { id: sessionId },
    { enabled: !!sessionId, refetchInterval: 1000 }
  );

  const { data: questions = [] } = trpc.session.getQuestions.useQuery(
    { sessionId },
    { enabled: !!sessionId }
  );

  const { data: scores = [] } = trpc.scoring.getScores.useQuery(
    { sessionId },
    { enabled: !!sessionId, refetchInterval: 1000 }
  );

  const startMutation = trpc.session.start.useMutation();
  const nextMutation = trpc.session.nextQuestion.useMutation();
  const endMutation = trpc.session.end.useMutation();
  const awardPointsMutation = trpc.scoring.awardPoints.useMutation();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLiveUrl(`${window.location.origin}/live/${sessionId}`);
    }
  }, [sessionId]);

  const handleStartQuiz = async () => {
    try {
      await startMutation.mutateAsync({ id: sessionId });
      await refetchSession();
      toast.success("Quiz started!");
    } catch (error) {
      toast.error("Failed to start quiz");
    }
  };

  const handleNextQuestion = async () => {
    try {
      const result = await nextMutation.mutateAsync({ id: sessionId });
      await refetchSession();
      if (result.completed) {
        toast.success("Quiz completed!");
      } else {
        toast.success("Next question!");
      }
    } catch (error) {
      toast.error("Failed to advance question");
    }
  };

  const handleEndQuiz = async () => {
    if (confirm("Are you sure you want to end the quiz?")) {
      try {
        await endMutation.mutateAsync({ id: sessionId });
        await refetchSession();
        toast.success("Quiz ended!");
      } catch (error) {
        toast.error("Failed to end quiz");
      }
    }
  };

  const handleAwardPoints = async (groupNumber: "1" | "2") => {
    const currentQuestion = questions[session?.currentQuestionIndex || 0];
    if (!currentQuestion || !currentQuestion.id || !currentQuestion.points) {
      toast.error("No question selected");
      return;
    }

    try {
      await awardPointsMutation.mutateAsync({
        sessionId,
        groupNumber,
        points: currentQuestion.points,
        questionId: currentQuestion.id,
      });
      await refetchSession();
      setShowPointDialog(false);
      setSelectedGroup(null);
      toast.success("Points awarded!");
    } catch (error) {
      toast.error("Failed to award points");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(liveUrl);
    toast.success("Live URL copied!");
  };

  if (!match || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFF0E6] to-[#FFE6D5] flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold">Loading...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[session.currentQuestionIndex];
  const group1Score = scores.find((s) => s.groupNumber === "1")?.totalPoints || 0;
  const group2Score = scores.find((s) => s.groupNumber === "2")?.totalPoints || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF0E6] to-[#FFE6D5] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold uppercase memphis-shadow mb-2">
            Host Control Panel
          </h1>
          <p className="text-lg text-gray-600">Manage your quiz in real-time</p>
        </div>

        {/* Live URL */}
        <div className="memphis-card mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-2">Live Display URL:</p>
              <p className="font-mono text-sm break-all">{liveUrl}</p>
            </div>
            <Button
              onClick={copyToClipboard}
              className="memphis-btn bg-[#A8E6CF] text-black"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>
        </div>

        {/* Status and Scores */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="memphis-card text-center">
            <p className="text-sm font-bold mb-2">Status</p>
            <p className="text-2xl font-bold uppercase">{session.status}</p>
          </div>
          <div className="memphis-card text-center">
            <p className="text-sm font-bold mb-2">{session.groupOneName}</p>
            <p className="text-4xl font-bold text-[#FF6B9D]">{group1Score}</p>
          </div>
          <div className="memphis-card text-center">
            <p className="text-sm font-bold mb-2">{session.groupTwoName}</p>
            <p className="text-4xl font-bold text-[#A8E6CF]">{group2Score}</p>
          </div>
        </div>

        {/* Quiz Controls or Completion Screen */}
        {session.status === "completed" ? (
          // Completion Screen
          <div className="memphis-card mb-6">
            <h2 className="text-3xl font-bold uppercase mb-6 text-center">
              🎉 Quiz Complete!
            </h2>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-[#FF6B9D] bg-opacity-20 p-6 rounded-xl border-2 border-black text-center">
                <h3 className="text-2xl font-bold mb-2">{session.groupOneName}</h3>
                <p className="text-5xl font-bold text-[#FF6B9D]">{group1Score}</p>
              </div>
              <div className="bg-[#A8E6CF] bg-opacity-20 p-6 rounded-xl border-2 border-black text-center">
                <h3 className="text-2xl font-bold mb-2">{session.groupTwoName}</h3>
                <p className="text-5xl font-bold text-[#A8E6CF]">{group2Score}</p>
              </div>
            </div>
            <div className="text-center bg-[#FFE66D] bg-opacity-30 p-6 rounded-xl border-2 border-black">
              <p className="text-2xl font-bold">
                {group1Score > group2Score
                  ? `🏆 ${session.groupOneName} wins!`
                  : group2Score > group1Score
                  ? `🏆 ${session.groupTwoName} wins!`
                  : "🤝 It's a tie!"}
              </p>
            </div>
          </div>
        ) : (
          // Quiz Controls
          <div className="memphis-card mb-6">
            <h2 className="text-2xl font-bold uppercase mb-4">Quiz Controls</h2>
            <div className="flex gap-4 flex-wrap">
              {session.status === "setup" && (
                <Button
                  onClick={handleStartQuiz}
                  className="memphis-btn bg-green-500 text-white"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Quiz
                </Button>
              )}

              {session.status === "in_progress" && (
                <>
                  <Button
                    onClick={handleNextQuestion}
                    className="memphis-btn bg-blue-500 text-white"
                  >
                    <SkipForward className="h-4 w-4 mr-2" />
                    Next Question
                  </Button>
                  <Button
                    onClick={() => setShowPointDialog(true)}
                    className="memphis-btn bg-[#FFE66D] text-black"
                  >
                    Award Points
                  </Button>
                </>
              )}

              {session.status === "in_progress" && (
                <Button
                  onClick={handleEndQuiz}
                  className="memphis-btn bg-red-500 text-white"
                >
                  <Square className="h-4 w-4 mr-2" />
                  End Quiz
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Current Question */}
        {currentQuestion && session.status === "in_progress" && (
          <div className="memphis-card">
            <h2 className="text-2xl font-bold uppercase mb-4">
              Question {session.currentQuestionIndex + 1} of {questions.length}
            </h2>
            <div className="bg-white p-4 rounded-lg border-2 border-black mb-4">
              <p className="text-xl font-bold mb-4">{currentQuestion.questionText}</p>
              <div className="grid grid-cols-2 gap-3">
                {["A", "B", "C", "D"].map((letter) => (
                  <div
                    key={letter}
                    className={`p-3 rounded-lg border-2 ${
                      letter === currentQuestion.correctAnswer
                        ? "bg-green-100 border-green-600"
                        : "bg-gray-100 border-gray-300"
                    }`}
                  >
                    <span className="font-bold">{letter}:</span>{" "}
                    {currentQuestion[`answer${letter}` as keyof Question]}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-4">
                <div className="flex-1 bg-[#FFE66D] bg-opacity-30 p-3 rounded-lg border-2 border-black">
                  <p className="text-sm font-bold">Correct Answer</p>
                  <p className="text-2xl font-bold">
                    {currentQuestion.correctAnswer}
                  </p>
                </div>
                <div className="flex-1 bg-blue-100 p-3 rounded-lg border-2 border-black">
                  <p className="text-sm font-bold">Points</p>
                  <p className="text-2xl font-bold">{currentQuestion.points}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Point Award Dialog */}
      <Dialog open={showPointDialog} onOpenChange={setShowPointDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase">
              Award Points
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-lg font-bold">
              Which group answered correctly?
            </p>

            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => handleAwardPoints("1")}
                className="memphis-btn py-6 text-lg bg-[#FF6B9D] text-white hover:bg-[#FF5A8C]"
              >
                {session.groupOneName}
              </Button>
              <Button
                onClick={() => handleAwardPoints("2")}
                className="memphis-btn py-6 text-lg bg-[#A8E6CF] text-black hover:bg-[#99D9BB]"
              >
                {session.groupTwoName}
              </Button>
            </div>

            <Button
              onClick={() => setShowPointDialog(false)}
              variant="outline"
              className="w-full border-2 border-black"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
