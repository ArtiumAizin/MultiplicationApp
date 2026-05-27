import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import {
  I18nManager,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

I18nManager.allowRTL(true);
if (Platform.OS !== "web") {
  I18nManager.forceRTL(true);
}

type Mode = "menu" | "sequential" | "mixed" | "memory";
type MixedLevel = 1 | 2 | 3;
type MemoryLevel = 1 | 2 | 3;

type Question = {
  left: number;
  right: number;
  answer: number;
};

type MemoryCard = {
  id: string;
  text: string;
  result: number;
  matched: boolean;
};

const palette = {
  lavender: "#E6E6FA",
  mint: "#DDF7E3",
  paleBlue: "#DDEEFF",
  cream: "#FFF9E6",
  text: "#3B3552",
  accent: "#8E7CC3",
  success: "#6FB87C",
  warning: "#E9A96B"
};

const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

function buildSequential(level: number): Question[] {
  const table = level + 1;
  return Array.from({ length: 10 }, (_, i) => {
    const right = i + 1;
    return { left: table, right, answer: table * right };
  });
}

function buildMixed(level: MixedLevel): Question[] {
  const tableRanges: Record<MixedLevel, number[]> = {
    1: [2, 3, 4, 5],
    2: [6, 7, 8, 9],
    3: [2, 3, 4, 5, 6, 7, 8, 9, 10]
  };
  const tables = tableRanges[level];
  return Array.from({ length: 10 }, () => {
    const left = tables[Math.floor(Math.random() * tables.length)];
    const right = Math.floor(Math.random() * 10) + 1;
    return { left, right, answer: left * right };
  });
}

function buildMemory(level: MemoryLevel): MemoryCard[] {
  const ranges: Record<MemoryLevel, number[]> = {
    1: [6, 7, 8, 9, 10],
    2: [2, 3, 4, 5],
    3: [2, 3, 4, 5, 6, 7, 8, 9, 10]
  };
  const tables = ranges[level];
  const results = new Set<number>();
  const cards: MemoryCard[] = [];

  while (results.size < 6) {
    const a = tables[Math.floor(Math.random() * tables.length)];
    const b = Math.floor(Math.random() * 10) + 1;
    const c = tables[Math.floor(Math.random() * tables.length)];
    const d = Math.floor(Math.random() * 10) + 1;
    if (a * b === c * d && `${a}x${b}` !== `${c}x${d}`) {
      results.add(a * b);
      cards.push(
        { id: `${a}-${b}-a-${cards.length}`, text: `${a} × ${b}`, result: a * b, matched: false },
        { id: `${c}-${d}-b-${cards.length}`, text: `${c} × ${d}`, result: c * d, matched: false }
      );
    }
  }

  return shuffle(cards);
}

function Keypad({
  value,
  onChange,
  onSubmit
}: {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
}) {
  const rows = [
    ["7", "8", "9"],
    ["4", "5", "6"],
    ["1", "2", "3"]
  ];
  return (
    <View style={styles.keypadWrap}>
      <Text style={styles.inputValue}>{value || "הקלידו תשובה"}</Text>
      <View style={styles.keypadRows}>
        {rows.map((row) => (
          <View key={row.join("-")} style={styles.keypadRow}>
            {row.map((k) => (
              <Pressable key={k} style={styles.key} onPress={() => onChange(value + k)}>
                <Text style={styles.keyText}>{k}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
      <View style={styles.keypadRow}>
        <Pressable style={styles.keyActionBtn} onPress={onSubmit}>
          <Text style={styles.secondaryBtnText}>אישור</Text>
        </Pressable>
        <Pressable style={styles.key} onPress={() => onChange(value + "0")}>
          <Text style={styles.keyText}>0</Text>
        </Pressable>
        <Pressable style={styles.keyActionBtn} onPress={() => onChange(value.slice(0, -1))}>
          <Text style={styles.secondaryBtnText}>מחיקה</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function App() {
  const [mode, setMode] = useState<Mode>("menu");
  const [mascot, setMascot] = useState("");

  const [seqLevel, setSeqLevel] = useState(1);
  const [seqQ, setSeqQ] = useState<Question[]>(buildSequential(1));
  const [seqIndex, setSeqIndex] = useState(0);
  const [seqInput, setSeqInput] = useState("");
  const [seqCorrect, setSeqCorrect] = useState(0);
  const [seqSkips, setSeqSkips] = useState(0);

  const [mixedLevel, setMixedLevel] = useState<MixedLevel>(1);
  const [mixedQ, setMixedQ] = useState<Question[]>(buildMixed(1));
  const [mixedIndex, setMixedIndex] = useState(0);
  const [mixedInput, setMixedInput] = useState("");
  const [mixedScore, setMixedScore] = useState(0);

  const [memoryLevel, setMemoryLevel] = useState<MemoryLevel>(1);
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>(buildMemory(1));
  const [opened, setOpened] = useState<string[]>([]);
  const [matchedPairs, setMatchedPairs] = useState(0);

  const showMascot = (text: string) => {
    setMascot(text);
    setTimeout(() => setMascot(""), 1300);
  };

  useEffect(() => {
    setSeqQ(buildSequential(seqLevel));
    setSeqIndex(0);
    setSeqCorrect(0);
    setSeqSkips(0);
    setSeqInput("");
  }, [seqLevel]);

  useEffect(() => {
    setMixedQ(buildMixed(mixedLevel));
    setMixedIndex(0);
    setMixedInput("");
    setMixedScore(0);
  }, [mixedLevel]);

  useEffect(() => {
    setMemoryCards(buildMemory(memoryLevel));
    setOpened([]);
    setMatchedPairs(0);
  }, [memoryLevel]);

  const seqDone = seqIndex >= seqQ.length;
  const mixedDone = mixedIndex >= mixedQ.length;
  const seqScore = Math.max(0, Math.min(10, seqCorrect - seqSkips));

  const visibleMemoryCards = useMemo(
    () => memoryCards.map((c) => ({ ...c, isOpen: opened.includes(c.id) || c.matched })),
    [memoryCards, opened]
  );

  useEffect(() => {
    if (opened.length !== 2) return;
    const [a, b] = opened.map((id) => memoryCards.find((c) => c.id === id));
    if (!a || !b) return;
    if (a.result === b.result) {
      setMemoryCards((prev) => prev.map((c) => (c.id === a.id || c.id === b.id ? { ...c, matched: true } : c)));
      setMatchedPairs((p) => p + 1);
      showMascot("כל הכבוד! 🎉");
    } else {
      showMascot("ננסה שוב 💪");
    }
    setTimeout(() => setOpened([]), 600);
  }, [opened, memoryCards]);

  const resetAll = () => {
    setMode("menu");
    setSeqLevel(1);
    setMixedLevel(1);
    setMemoryLevel(1);
    setMascot("");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>כפלי - KEFLI</Text>
        <Text style={styles.subtitle}>לומדים כפל בכיף</Text>

        {!!mascot && (
          <View style={styles.mascotWrap}>
            <Text style={styles.mascot}>🦊 {mascot}</Text>
          </View>
        )}

        {mode === "menu" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>בחרו מצב משחק</Text>
            <Pressable style={styles.primaryBtn} onPress={() => setMode("sequential")}>
              <Text style={styles.primaryBtnText}>Sequential - לפי סדר</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={() => setMode("mixed")}>
              <Text style={styles.primaryBtnText}>Mixed - אקראי</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={() => setMode("memory")}>
              <Text style={styles.primaryBtnText}>Memory - זיכרון</Text>
            </Pressable>
          </View>
        )}

        {mode === "sequential" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sequential - שלב {seqLevel} (לוח {seqLevel + 1})</Text>
            <View style={styles.levelRow}>
              {Array.from({ length: 9 }, (_, i) => i + 1).map((lvl) => (
                <Pressable
                  key={lvl}
                  style={[styles.levelChip, seqLevel === lvl && styles.levelChipActive]}
                  onPress={() => setSeqLevel(lvl)}
                >
                  <Text style={styles.levelChipText}>{lvl}</Text>
                </Pressable>
              ))}
            </View>

            {!seqDone ? (
              <>
                <Text style={styles.question}>{seqQ[seqIndex].left} × {seqQ[seqIndex].right} = ?</Text>
                <Keypad
                  value={seqInput}
                  onChange={setSeqInput}
                  onSubmit={() => {
                    if (!seqInput.trim()) return;
                    const current = seqQ[seqIndex];
                    if (Number(seqInput) === current.answer) {
                      setSeqCorrect((v) => v + 1);
                      setSeqIndex((v) => v + 1);
                      setSeqInput("");
                      showMascot("נכון מאוד! ⭐");
                    } else {
                      showMascot("לא נורא, נסו שוב 😊");
                    }
                  }}
                />
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() => {
                    setSeqSkips((v) => v + 1);
                    setSeqIndex((v) => v + 1);
                    setSeqInput("");
                    showMascot("דילגנו לשאלה הבאה");
                  }}
                >
                  <Text style={styles.secondaryBtnText}>דילוג (-1)</Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.result}>ציון סופי: {seqScore}/10</Text>
            )}
          </View>
        )}

        {mode === "mixed" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Mixed - רמה {mixedLevel}</Text>
            <View style={styles.levelRow}>
              {[1, 2, 3].map((lvl) => (
                <Pressable
                  key={lvl}
                  style={[styles.levelChip, mixedLevel === lvl && styles.levelChipActive]}
                  onPress={() => setMixedLevel(lvl as MixedLevel)}
                >
                  <Text style={styles.levelChipText}>{lvl}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.caption}>
              {mixedLevel === 1 ? "טבלאות 2-5" : mixedLevel === 2 ? "טבלאות 6-9" : "טבלאות 2-10"}
            </Text>

            {!mixedDone ? (
              <>
                <Text style={styles.question}>{mixedQ[mixedIndex].left} × {mixedQ[mixedIndex].right} = ?</Text>
                <Keypad
                  value={mixedInput}
                  onChange={setMixedInput}
                  onSubmit={() => {
                    if (!mixedInput.trim()) return;
                    const current = mixedQ[mixedIndex];
                    if (Number(mixedInput) === current.answer) {
                      setMixedScore((v) => v + 1);
                      showMascot("מצוין! 🌟");
                    } else {
                      showMascot("נמשיך לשאלה הבאה");
                    }
                    setMixedIndex((v) => v + 1);
                    setMixedInput("");
                  }}
                />
              </>
            ) : (
              <Text style={styles.result}>ציון סופי: {mixedScore}/10</Text>
            )}
          </View>
        )}

        {mode === "memory" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Memory - רמה {memoryLevel}</Text>
            <View style={styles.levelRow}>
              {[1, 2, 3].map((lvl) => (
                <Pressable
                  key={lvl}
                  style={[styles.levelChip, memoryLevel === lvl && styles.levelChipActive]}
                  onPress={() => setMemoryLevel(lvl as MemoryLevel)}
                >
                  <Text style={styles.levelChipText}>{lvl === 1 ? "Type B" : lvl === 2 ? "Type A" : "Mixed"}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.result}>ניקוד: {matchedPairs}</Text>
            <View style={styles.memoryGrid}>
              {visibleMemoryCards.map((card) => (
                <Pressable
                  key={card.id}
                  style={[styles.memoryCard, card.isOpen && styles.memoryCardOpen]}
                  onPress={() => {
                    if (opened.length === 2 || card.matched || opened.includes(card.id)) return;
                    setOpened((prev) => [...prev, card.id]);
                  }}
                >
                  <Text style={styles.memoryText}>{card.isOpen ? card.text : "?"}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={styles.footerActions}>
          <Pressable style={styles.secondaryBtn} onPress={resetAll}>
            <Text style={styles.secondaryBtnText}>חזרה לתפריט</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.cream },
  container: { padding: 16, gap: 12 },
  title: { fontSize: 32, fontWeight: "800", color: palette.text, textAlign: "center" },
  subtitle: { fontSize: 18, color: palette.text, textAlign: "center" },
  card: {
    backgroundColor: palette.paleBlue,
    borderRadius: 16,
    padding: 14,
    gap: 10
  },
  cardTitle: { fontSize: 20, fontWeight: "700", color: palette.text, textAlign: "center" },
  primaryBtn: {
    backgroundColor: palette.lavender,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center"
  },
  primaryBtnText: { color: palette.text, fontWeight: "700" },
  secondaryBtn: {
    backgroundColor: palette.mint,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center"
  },
  secondaryBtnText: { color: palette.text, fontWeight: "700" },
  mascotWrap: {
    backgroundColor: "#FFFFFFB0",
    borderRadius: 12,
    padding: 10,
    alignItems: "center"
  },
  mascot: { fontSize: 20, color: palette.accent, fontWeight: "700" },
  levelRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  levelChip: {
    backgroundColor: "#ffffffaa",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  levelChipActive: { backgroundColor: palette.accent },
  levelChipText: { color: palette.text, fontWeight: "700" },
  question: { fontSize: 28, fontWeight: "800", color: palette.text, textAlign: "center" },
  keypadWrap: { gap: 10 },
  inputValue: {
    textAlign: "center",
    fontSize: 24,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    color: palette.text
  },
  keypadRows: { gap: 8 },
  keypadRow: { flexDirection: "row", justifyContent: "center", gap: 8 },
  key: {
    width: 92,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center"
  },
  keyText: { fontSize: 22, fontWeight: "700", color: palette.text },
  keyActionBtn: {
    width: 92,
    height: 48,
    borderRadius: 10,
    backgroundColor: palette.mint,
    alignItems: "center",
    justifyContent: "center"
  },
  result: { fontSize: 22, fontWeight: "800", color: palette.success, textAlign: "center" },
  caption: { textAlign: "center", color: palette.text },
  memoryGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  memoryCard: {
    width: "30%",
    minWidth: 92,
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: "#ffffffcc",
    alignItems: "center",
    justifyContent: "center",
    padding: 8
  },
  memoryCardOpen: { backgroundColor: palette.lavender },
  memoryText: { color: palette.text, fontWeight: "700", textAlign: "center" },
  footerActions: { marginTop: 8, marginBottom: 24 }
});
