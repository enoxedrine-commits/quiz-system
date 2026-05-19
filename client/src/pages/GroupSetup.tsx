import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function GroupSetup() {
  const [, setLocation] = useLocation();
  const [groupOneName, setGroupOneName] = useState("");
  const [groupTwoName, setGroupTwoName] = useState("");
  const [selectedBankId, setSelectedBankId] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const { data: banks = [] } = trpc.questionBanks.list.useQuery();
  const { data: questions = [] } = trpc.questions.list.useQuery(
    selectedBankId ? { bankId: selectedBankId } : undefined,
    { enabled: !!selectedBankId }
  );
  const createSessionMutation = trpc.session.create.useMutation();

  useEffect(() => {
    if (!selectedBankId && banks.length > 0) {
      setSelectedBankId(banks[0].id);
    }
  }, [banks, selectedBankId]);

  const handleStartQuiz = async () => {
    if (!groupOneName.trim() || !groupTwoName.trim()) {
      toast.error("Please enter both group names");
      return;
    }

    if (!selectedBankId) {
      toast.error("Please select a question bank");
      return;
    }

    if (questions.length === 0) {
      toast.error("Please create at least one question before starting");
      return;
    }

    setIsLoading(true);
    try {
      const result = await createSessionMutation.mutateAsync({
        groupOneName: groupOneName.trim(),
        groupTwoName: groupTwoName.trim(),
        questionIds: questions.map((q: any) => q.id),
      });

      toast.success("Quiz started!");
      // Redirect to host panel to control the quiz
      setLocation(`/host/${result.sessionId}`);
    } catch (error) {
      toast.error("Failed to start quiz");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-[#FFF0E6] to-[#FFE6D5] p-4 sm:p-6 flex items-center justify-center">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="mb-2 text-4xl font-bold uppercase memphis-shadow sm:text-5xl">
            Quiz Setup
          </h1>
          <p className="text-lg text-gray-600">Enter your team names</p>
        </div>

        {/* Card */}
        <div className="memphis-card space-y-6">
          {/* Group 1 Input */}
          <div>
            <label className="block text-sm font-bold mb-3 uppercase">
              🎯 Group 1 Name
            </label>
            <Input
              value={groupOneName}
              onChange={(e) => setGroupOneName(e.target.value)}
              placeholder="Enter group 1 name"
              className="border-2 border-black text-lg py-3 font-semibold"
              onKeyPress={(e) => e.key === "Enter" && handleStartQuiz()}
            />
          </div>

          {/* Group 2 Input */}
          <div>
            <label className="block text-sm font-bold mb-3 uppercase">
              🎯 Group 2 Name
            </label>
            <Input
              value={groupTwoName}
              onChange={(e) => setGroupTwoName(e.target.value)}
              placeholder="Enter group 2 name"
              className="border-2 border-black text-lg py-3 font-semibold"
              onKeyPress={(e) => e.key === "Enter" && handleStartQuiz()}
            />
          </div>

          {/* Question Bank */}
          <div>
            <label className="block text-sm font-bold mb-3 uppercase">
              Question Bank
            </label>
            <Select
              value={selectedBankId ? String(selectedBankId) : ""}
              onValueChange={(value) => setSelectedBankId(Number(value))}
            >
              <SelectTrigger className="border-2 border-black text-lg py-3 font-semibold">
                <SelectValue placeholder="Select question bank" />
              </SelectTrigger>
              <SelectContent>
                {banks.map((bank: { id: number; name: string }) => (
                  <SelectItem key={bank.id} value={String(bank.id)}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Question Count */}
          <div className="bg-[#A8E6CF] bg-opacity-30 p-4 rounded-lg border-2 border-black">
            <p className="text-sm font-bold">Questions Ready:</p>
            <p className="text-3xl font-bold">{questions.length}</p>
          </div>

          {/* Start Button */}
          <Button
            onClick={handleStartQuiz}
            disabled={
              isLoading ||
              !groupOneName.trim() ||
              !groupTwoName.trim() ||
              !selectedBankId
            }
            className="memphis-btn bg-[#FF6B9D] text-white w-full text-lg font-bold py-6 hover:bg-[#FF5A8C] disabled:opacity-50"
          >
            {isLoading ? "Starting..." : "Start Quiz"}
          </Button>

          {/* Back Button */}
          <Button
            onClick={() => setLocation("/")}
            variant="outline"
            className="w-full border-2 border-black font-bold"
          >
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}
