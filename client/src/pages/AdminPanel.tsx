import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Edit2, Plus } from "lucide-react";
import { toast } from "sonner";

type Question = {
  id?: number;
  questionText?: string;
  answerA?: string;
  answerB?: string;
  answerC?: string;
  answerD?: string;
  correctAnswer?: "A" | "B" | "C" | "D";
  points?: number;
};

export default function AdminPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Question>>({
    questionText: "",
    answerA: "",
    answerB: "",
    answerC: "",
    answerD: "",
    correctAnswer: "A",
    points: 10,
  });

  const { data: questions = [], refetch } = trpc.questions.list.useQuery();
  const createMutation = trpc.questions.create.useMutation();
  const updateMutation = trpc.questions.update.useMutation();
  const deleteMutation = trpc.questions.delete.useMutation();

  const handleOpenDialog = (question?: Question) => {
    if (question && question.id) {
      setEditingId(question.id);
      setFormData(question);
    } else {
      setEditingId(null);
      setFormData({
        questionText: "",
        answerA: "",
        answerB: "",
        answerC: "",
        answerD: "",
        correctAnswer: "A",
        points: 10,
      });
    }
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (
      !formData.questionText ||
      !formData.answerA ||
      !formData.answerB ||
      !formData.answerC ||
      !formData.answerD ||
      !formData.correctAnswer ||
      !formData.points
    ) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          ...formData,
        });
        toast.success("Question updated!");
      } else {
        await createMutation.mutateAsync({
          questionText: formData.questionText,
          answerA: formData.answerA,
          answerB: formData.answerB,
          answerC: formData.answerC,
          answerD: formData.answerD,
          correctAnswer: formData.correctAnswer as "A" | "B" | "C" | "D",
          points: formData.points,
        });
        toast.success("Question created!");
      }
      setIsOpen(false);
      refetch();
    } catch (error) {
      toast.error("Failed to save question");
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this question?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast.success("Question deleted!");
        refetch();
      } catch (error) {
        toast.error("Failed to delete question");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF0E6] to-[#FFE6D5] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold uppercase memphis-shadow mb-2">
            Quiz Questions
          </h1>
          <p className="text-lg text-gray-600">Manage your quiz questions here</p>
        </div>

        {/* Create Button */}
        <div className="mb-6">
          <Button
            onClick={() => handleOpenDialog()}
            className="memphis-btn bg-[#FF6B9D] text-white hover:bg-[#FF5A8C]"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Question
          </Button>
        </div>

        {/* Questions Grid */}
        <div className="grid gap-4">
          {questions.length === 0 ? (
            <div className="memphis-card text-center py-12">
              <p className="text-xl text-gray-500">No questions yet. Create your first one!</p>
            </div>
          ) : (
            questions.map((question: Question) => {
              if (!question.id) return null;
              return (
              <div
                key={question.id}
                className="memphis-card hover:shadow-lg transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold uppercase mb-3">
                      {question.questionText}
                    </h3>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-[#A8E6CF] bg-opacity-30 p-3 rounded-lg">
                        <span className="font-bold">A:</span> {question.answerA}
                      </div>
                      <div className="bg-[#D4A5E6] bg-opacity-30 p-3 rounded-lg">
                        <span className="font-bold">B:</span> {question.answerB}
                      </div>
                      <div className="bg-[#FFE66D] bg-opacity-30 p-3 rounded-lg">
                        <span className="font-bold">C:</span> {question.answerC}
                      </div>
                      <div className="bg-[#FF9F43] bg-opacity-30 p-3 rounded-lg">
                        <span className="font-bold">D:</span> {question.answerD}
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="font-bold">Correct Answer:</span>{" "}
                        <span className="bg-green-200 px-2 py-1 rounded font-bold">
                          {question.correctAnswer}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold">Points:</span>{" "}
                        <span className="bg-blue-200 px-2 py-1 rounded font-bold">
                          {question.points}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(question)}
                      className="border-2 border-black"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => question.id && handleDelete(question.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
            })
          )}
        </div>
      </div>

      {/* Dialog for Create/Edit */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase">
              {editingId ? "Edit Question" : "Create Question"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2">Question Text</label>
              <Textarea
                value={formData.questionText || ""}
                onChange={(e) =>
                  setFormData({ ...formData, questionText: e.target.value })
                }
                placeholder="Enter your question"
                className="border-2 border-black"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {["A", "B", "C", "D"].map((letter) => (
                <div key={letter}>
                  <label className="block text-sm font-bold mb-2">Answer {letter}</label>
                  <Input
                    value={formData[`answer${letter}` as keyof Question] || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        [`answer${letter}`]: e.target.value,
                      })
                    }
                    placeholder={`Answer ${letter}`}
                    className="border-2 border-black"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2">Correct Answer</label>
                <Select
                  value={formData.correctAnswer || "A"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      correctAnswer: value as "A" | "B" | "C" | "D",
                    })
                  }
                >
                  <SelectTrigger className="border-2 border-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["A", "B", "C", "D"].map((letter) => (
                      <SelectItem key={letter} value={letter}>
                        {letter}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Points</label>
                <Input
                  type="number"
                  value={formData.points || 10}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      points: Math.max(1, parseInt(e.target.value) || 10),
                    })
                  }
                  min="1"
                  className="border-2 border-black"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="border-2 border-black"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="memphis-btn bg-[#FF6B9D] text-white"
              >
                {editingId ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
