import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { getLoginUrl } from "@/const";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, loading, isAuthenticated, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFF0E6] to-[#FFE6D5] flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFF0E6] to-[#FFE6D5] p-6 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <h1 className="text-5xl font-bold uppercase memphis-shadow mb-4">
            Quiz Master
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Create and host live group quizzes with real-time scoring
          </p>
          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            className="memphis-btn bg-[#FF6B9D] text-white w-full text-lg py-6"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF0E6] to-[#FFE6D5] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-5xl font-bold uppercase memphis-shadow mb-2">
              Quiz Master
            </h1>
            <p className="text-lg text-gray-600">
              Welcome, {user?.name || "User"}!
            </p>
          </div>
          <Button
            onClick={() => logout()}
            variant="outline"
            className="border-2 border-black font-bold"
          >
            Sign Out
          </Button>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Manage Questions */}
          <div className="memphis-card hover:shadow-lg transition-all cursor-pointer group">
            <div
              onClick={() => setLocation("/admin")}
              className="h-full flex flex-col justify-between"
            >
              <div>
                <div className="text-5xl mb-4">📝</div>
                <h2 className="text-3xl font-bold uppercase mb-2 group-hover:text-[#FF6B9D] transition-colors">
                  Manage Questions
                </h2>
                <p className="text-gray-600">
                  Create, edit, and delete quiz questions with multiple choice answers
                </p>
              </div>
              <Button className="memphis-btn bg-[#A8E6CF] text-black w-full mt-4 group-hover:bg-[#FFE66D]">
                Go to Admin Panel
              </Button>
            </div>
          </div>

          {/* Start Quiz */}
          <div className="memphis-card hover:shadow-lg transition-all cursor-pointer group">
            <div
              onClick={() => setLocation("/setup")}
              className="h-full flex flex-col justify-between"
            >
              <div>
                <div className="text-5xl mb-4">🎮</div>
                <h2 className="text-3xl font-bold uppercase mb-2 group-hover:text-[#FF6B9D] transition-colors">
                  Start Quiz
                </h2>
                <p className="text-gray-600">
                  Set up teams and launch a live quiz with real-time scoring
                </p>
              </div>
              <Button className="memphis-btn bg-[#FF6B9D] text-white w-full mt-4 group-hover:bg-[#FF5A8C]">
                Create Quiz
              </Button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="memphis-card">
          <h2 className="text-3xl font-bold uppercase mb-6">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex gap-3">
              <div className="text-3xl">⏱️</div>
              <div>
                <h3 className="font-bold mb-1">Timed Questions</h3>
                <p className="text-sm text-gray-600">
                  Customizable countdown timers before answer reveal
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-3xl">🎯</div>
              <div>
                <h3 className="font-bold mb-1">Flexible Points</h3>
                <p className="text-sm text-gray-600">
                  Set custom point values for each question
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-3xl">📊</div>
              <div>
                <h3 className="font-bold mb-1">Live Scoreboard</h3>
                <p className="text-sm text-gray-600">
                  Real-time score tracking for both teams
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-3xl">🎨</div>
              <div>
                <h3 className="font-bold mb-1">Vibrant Design</h3>
                <p className="text-sm text-gray-600">
                  Memphis-inspired playful visual aesthetic
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-3xl">🖥️</div>
              <div>
                <h3 className="font-bold mb-1">Separate Displays</h3>
                <p className="text-sm text-gray-600">
                  Host control panel and public display screens
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-3xl">🎪</div>
              <div>
                <h3 className="font-bold mb-1">Team Events</h3>
                <p className="text-sm text-gray-600">
                  Perfect for team building and creative events
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
