import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Edit2, Plus, Upload } from "lucide-react";
import { toast } from "sonner";

type Question = {
  id?: number;
  bankId?: number | null;
  questionText?: string;
  answerA?: string;
  answerB?: string;
  answerC?: string;
  answerD?: string;
  correctAnswer?: "A" | "B" | "C" | "D";
  points?: number;
};

const requiredCsvHeaders = [
  "question",
  "optionA",
  "optionB",
  "optionC",
  "optionD",
  "answer",
  "points",
] as const;

type CsvHeader = (typeof requiredCsvHeaders)[number];

function parseCsvRows(csvText: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) {
    rows.push(row);
  }

  return rows;
}

function normalizeAnswer(answer: string): "A" | "B" | "C" | "D" | null {
  const normalized = answer.trim().toUpperCase().replace(/^OPTION\s*/, "");
  return ["A", "B", "C", "D"].includes(normalized)
    ? (normalized as "A" | "B" | "C" | "D")
    : null;
}

function parseQuestionsCsv(csvText: string) {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) {
    throw new Error("CSV must include a header row and at least one question row");
  }

  const headers = rows[0].map((header) => header.trim());
  const headerIndexes = requiredCsvHeaders.reduce<Record<CsvHeader, number>>(
    (indexes, header) => {
      indexes[header] = headers.indexOf(header);
      return indexes;
    },
    {} as Record<CsvHeader, number>
  );

  const missingHeaders = requiredCsvHeaders.filter(
    (header) => headerIndexes[header] === -1
  );

  if (missingHeaders.length > 0) {
    throw new Error(`Missing CSV columns: ${missingHeaders.join(", ")}`);
  }

  return rows.slice(1).map((row, index) => {
    const rowNumber = index + 2;
    const getValue = (header: CsvHeader) => row[headerIndexes[header]]?.trim() ?? "";
    const answer = normalizeAnswer(getValue("answer"));
    const points = Number.parseInt(getValue("points"), 10);

    if (!answer) {
      throw new Error(`Row ${rowNumber}: answer must be A, B, C, or D`);
    }

    if (!Number.isFinite(points) || points < 1) {
      throw new Error(`Row ${rowNumber}: points must be at least 1`);
    }

    const question = {
      questionText: getValue("question"),
      answerA: getValue("optionA"),
      answerB: getValue("optionB"),
      answerC: getValue("optionC"),
      answerD: getValue("optionD"),
      correctAnswer: answer,
      points,
    };

    if (
      !question.questionText ||
      !question.answerA ||
      !question.answerB ||
      !question.answerC ||
      !question.answerD
    ) {
      throw new Error(`Row ${rowNumber}: all question and option fields are required`);
    }

    return question;
  });
}

export default function AdminPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [passedQuestionPoints, setPassedQuestionPoints] = useState(5);
  const [selectedBankId, setSelectedBankId] = useState<number | undefined>();
  const [newBankName, setNewBankName] = useState("");
  const [formData, setFormData] = useState<Partial<Question>>({
    questionText: "",
    answerA: "",
    answerB: "",
    answerC: "",
    answerD: "",
    correctAnswer: "A",
    points: 10,
  });

  const { data: banks = [], refetch: refetchBanks } =
    trpc.questionBanks.list.useQuery();
  const { data: questions = [], refetch } = trpc.questions.list.useQuery(
    selectedBankId ? { bankId: selectedBankId } : undefined
  );
  const { data: settings, refetch: refetchSettings } = trpc.settings.get.useQuery();
  const createBankMutation = trpc.questionBanks.create.useMutation();
  const createMutation = trpc.questions.create.useMutation();
  const bulkCreateMutation = trpc.questions.bulkCreate.useMutation();
  const updateMutation = trpc.questions.update.useMutation();
  const deleteMutation = trpc.questions.delete.useMutation();
  const updateSettingsMutation = trpc.settings.update.useMutation();

  useEffect(() => {
    if (settings) {
      setPassedQuestionPoints(settings.passedQuestionPoints);
    }
  }, [settings]);

  useEffect(() => {
    if (!selectedBankId && banks.length > 0) {
      setSelectedBankId(banks[0].id);
    }
  }, [banks, selectedBankId]);

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
        bankId: selectedBankId,
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
          bankId: selectedBankId,
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

  const handleBulkUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    try {
      const csvText = await file.text();
      const parsedQuestions = parseQuestionsCsv(csvText).map((question) => ({
        ...question,
        bankId: selectedBankId,
      }));

      await bulkCreateMutation.mutateAsync({ questions: parsedQuestions });
      await refetch();
      toast.success(`${parsedQuestions.length} questions uploaded!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload CSV");
    }
  };

  const handleSaveSettings = async () => {
    try {
      await updateSettingsMutation.mutateAsync({
        passedQuestionPoints: Math.max(0, passedQuestionPoints),
      });
      await refetchSettings();
      toast.success("Settings saved!");
    } catch (error) {
      toast.error("Failed to save settings");
    }
  };

  const handleCreateBank = async () => {
    if (!newBankName.trim()) {
      toast.error("Enter a question bank name");
      return;
    }

    try {
      const result = await createBankMutation.mutateAsync({
        name: newBankName.trim(),
      });
      setNewBankName("");
      setSelectedBankId(result.bankId);
      await refetchBanks();
      toast.success("Question bank created!");
    } catch (error) {
      toast.error("Failed to create question bank");
    }
  };

  return (
    <div className="h-screen overflow-y-auto bg-gradient-to-br from-[#FFF0E6] to-[#FFE6D5] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold uppercase memphis-shadow mb-2">
            Quiz Questions
          </h1>
          <p className="text-lg text-gray-600">Manage your quiz questions here</p>
        </div>

        {/* Question Bank */}
        <div className="memphis-card mb-6">
          <h2 className="text-2xl font-bold uppercase mb-4">Question Bank</h2>
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div>
              <label className="block text-sm font-bold mb-2">Active Bank</label>
              <Select
                value={selectedBankId ? String(selectedBankId) : ""}
                onValueChange={(value) => setSelectedBankId(Number(value))}
              >
                <SelectTrigger className="border-2 border-black">
                  <SelectValue placeholder="Select a question bank" />
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
            <div>
              <label className="block text-sm font-bold mb-2">New Bank Name</label>
              <Input
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                placeholder="e.g. Biology Round"
                className="border-2 border-black"
              />
            </div>
            <Button
              onClick={handleCreateBank}
              className="memphis-btn bg-[#D4A5E6] text-black"
            >
              Create Bank
            </Button>
          </div>
        </div>

        {/* Settings */}
        <div className="memphis-card mb-6">
          <h2 className="text-2xl font-bold uppercase mb-4">Admin Settings</h2>
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="max-w-xs">
              <label className="block text-sm font-bold mb-2">
                Points When Question Is Passed
              </label>
              <Input
                type="number"
                value={passedQuestionPoints}
                onChange={(e) =>
                  setPassedQuestionPoints(
                    Math.max(0, parseInt(e.target.value, 10) || 0)
                  )
                }
                min="0"
                className="border-2 border-black"
              />
            </div>
            <Button
              onClick={handleSaveSettings}
              className="memphis-btn bg-[#A8E6CF] text-black"
            >
              Save Settings
            </Button>
          </div>
        </div>

        {/* Create Button */}
        <div className="mb-6 flex flex-wrap gap-3">
          <Button
            onClick={() => handleOpenDialog()}
            disabled={!selectedBankId}
            className="memphis-btn bg-[#FF6B9D] text-white hover:bg-[#FF5A8C]"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Question
          </Button>
          <label
            className={`memphis-btn inline-flex items-center bg-[#A8E6CF] px-4 py-2 font-bold text-black ${
              selectedBankId ? "cursor-pointer" : "cursor-not-allowed opacity-50"
            }`}
          >
            <Upload className="mr-2 h-5 w-5" />
            Upload CSV
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleBulkUpload}
              disabled={!selectedBankId}
              className="hidden"
            />
          </label>
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
