import { Asset } from "expo-asset";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  I18nManager,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";

I18nManager.allowRTL(true);
if (Platform.OS !== "web") {
  I18nManager.forceRTL(true);
}

type GameMode = "sequential" | "mixed" | "memory";
type Screen = "menu" | "level-select" | "game";
type MixedLevel = 1 | 2 | 3;
type MemoryLevel = 1 | 2 | 3;
type QuestionStatus = "pending" | "correct" | "skipped";
type FeedbackTone = "success" | "error" | "info";

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
  error: "#E57373",
  pending: "#C8C4D4",
  warning: "#E9A96B",
  shadow: "rgba(59, 53, 82, 0.12)"
};

const PHONE_WIDTH = 390;
const APP_LOGO = require("./assets/app-logo.png");

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

function useTimedFeedback(durationMs = 1100) {
  const [feedback, setFeedback] = useState<{ text: string; tone: FeedbackTone } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFeedback = (text: string, tone: FeedbackTone = "info") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setFeedback({ text, tone });
    timerRef.current = setTimeout(() => setFeedback(null), durationMs);
  };

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return { feedback, showFeedback, clearFeedback: () => setFeedback(null) };
}

function PhoneShell({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== "web") {
    return <View style={styles.shellNative}>{children}</View>;
  }
  return (
    <View style={styles.shellWebOuter}>
      <View style={styles.shellWebInner}>{children}</View>
    </View>
  );
}

function AppHeader({ onBack, showTagline }: { onBack?: () => void; showTagline?: boolean }) {
  return (
    <View style={[styles.headerBase, showTagline ? styles.headerHome : styles.headerCompact]}>
      {!showTagline &&
        (onBack ? (
          <Pressable onPress={onBack} style={styles.headerBack} hitSlop={12}>
            <Text style={styles.headerBackText}>→</Text>
          </Pressable>
        ) : (
          <View style={styles.headerSide} />
        ))}
      <Image
        key="kefli-logo"
        source={APP_LOGO}
        style={showTagline ? styles.headerLogoLarge : styles.headerLogoSmall}
        resizeMode="contain"
        fadeDuration={0}
      />
      {showTagline ? (
        <Text style={styles.headerTagline}>לומדים כפל בכיף</Text>
      ) : (
        <View style={styles.headerSide} />
      )}
    </View>
  );
}

function QuestionProgress({
  statuses,
  currentIndex
}: {
  statuses: QuestionStatus[];
  currentIndex: number;
}) {
  return (
    <View style={styles.progressRow}>
      {statuses.map((status, index) => (
        <View
          key={index}
          style={[
            styles.progressDot,
            status === "pending" && styles.progressPending,
            status === "correct" && styles.progressCorrect,
            status === "skipped" && styles.progressSkipped,
            index === currentIndex && status === "pending" && styles.progressCurrent
          ]}
        >
          <Text style={styles.progressDotText}>{index + 1}</Text>
        </View>
      ))}
    </View>
  );
}

function StarRating({ correctCount }: { correctCount: number }) {
  const stars = correctCount === 10 ? 3 : correctCount >= 5 ? 2 : correctCount >= 1 ? 1 : 0;
  return (
    <View style={styles.starRow}>
      {[0, 1, 2].map((index) => (
        <Text key={index} style={[styles.starIcon, index < stars ? styles.starGold : styles.starGray]}>
          ★
        </Text>
      ))}
    </View>
  );
}

function Keypad({
  value,
  onChange,
  onSubmit,
  feedback
}: {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  feedback: { text: string; tone: FeedbackTone } | null;
}) {
  const rows = [
    ["7", "8", "9"],
    ["4", "5", "6"],
    ["1", "2", "3"]
  ];

  const inputToneStyle =
    feedback?.tone === "success"
      ? styles.inputSuccess
      : feedback?.tone === "error"
        ? styles.inputError
        : null;

  return (
    <View style={styles.keypadWrap}>
      <Text style={[styles.inputValue, inputToneStyle]}>
        {feedback ? feedback.text : value || "הקלידו תשובה"}
      </Text>
      <View style={styles.keypadLtr}>
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
          <Pressable style={[styles.keyActionBtn, styles.keyConfirmBtn]} onPress={onSubmit}>
            <Text style={styles.keyActionText}>אישור</Text>
          </Pressable>
          <Pressable style={styles.key} onPress={() => onChange(value + "0")}>
            <Text style={styles.keyText}>0</Text>
          </Pressable>
          <Pressable style={[styles.keyActionBtn, styles.keyDeleteBtn]} onPress={() => onChange(value.slice(0, -1))}>
            <Text style={styles.keyActionText}>מחיקה</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ToastOverlay({ text, tone }: { text: string; tone: FeedbackTone }) {
  const toneStyle =
    tone === "success" ? styles.toastSuccess : tone === "error" ? styles.toastError : styles.toastInfo;
  return (
    <View style={styles.toastOverlay} pointerEvents="none">
      <View style={[styles.toastBox, toneStyle]}>
        <Text style={styles.toastText}>🦊 {text}</Text>
      </View>
    </View>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const { feedback, showFeedback, clearFeedback } = useTimedFeedback();
  const [overlayFeedback, setOverlayFeedback] = useState<{ text: string; tone: FeedbackTone } | null>(
    null
  );
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showOverlay = (text: string, tone: FeedbackTone = "info") => {
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    setOverlayFeedback({ text, tone });
    overlayTimerRef.current = setTimeout(() => setOverlayFeedback(null), 1100);
  };

  const [seqLevel, setSeqLevel] = useState(1);
  const [seqQ, setSeqQ] = useState<Question[]>(buildSequential(1));
  const [seqIndex, setSeqIndex] = useState(0);
  const [seqInput, setSeqInput] = useState("");
  const [seqLocked, setSeqLocked] = useState(false);
  const [seqStatuses, setSeqStatuses] = useState<QuestionStatus[]>(Array(10).fill("pending"));

  const [mixedLevel, setMixedLevel] = useState<MixedLevel>(1);
  const [mixedQ, setMixedQ] = useState<Question[]>(buildMixed(1));
  const [mixedIndex, setMixedIndex] = useState(0);
  const [mixedInput, setMixedInput] = useState("");
  const [mixedLocked, setMixedLocked] = useState(false);
  const [mixedScore, setMixedScore] = useState(0);
  const [mixedStatuses, setMixedStatuses] = useState<QuestionStatus[]>(Array(10).fill("pending"));

  const [memoryLevel, setMemoryLevel] = useState<MemoryLevel>(1);
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>(buildMemory(1));
  const [opened, setOpened] = useState<string[]>([]);
  const [matchedPairs, setMatchedPairs] = useState(0);

  const seqDone = seqIndex >= seqQ.length;
  const mixedDone = mixedIndex >= mixedQ.length;
  const seqScore = useMemo(
    () =>
      Math.max(
        0,
        Math.min(10, seqStatuses.filter((s) => s === "correct").length - seqStatuses.filter((s) => s === "skipped").length)
      ),
    [seqStatuses]
  );

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
      showOverlay("כל הכבוד!", "success");
    } else {
      showOverlay("נסו שוב", "error");
    }
    setTimeout(() => setOpened([]), 600);
  }, [opened, memoryCards]);

  useEffect(
    () => () => {
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    },
    []
  );

  useEffect(() => {
    Asset.fromModule(APP_LOGO)
      .downloadAsync()
      .catch(() => undefined);
  }, []);

  const openMode = (mode: GameMode) => {
    setGameMode(mode);
    setScreen("level-select");
    clearFeedback();
    setOverlayFeedback(null);
  };

  const startSequential = (level: number) => {
    setSeqLevel(level);
    setSeqQ(buildSequential(level));
    setSeqIndex(0);
    setSeqInput("");
    setSeqLocked(false);
    setSeqStatuses(Array(10).fill("pending"));
    clearFeedback();
    setScreen("game");
  };

  const startMixed = (level: MixedLevel) => {
    setMixedLevel(level);
    setMixedQ(buildMixed(level));
    setMixedIndex(0);
    setMixedInput("");
    setMixedLocked(false);
    setMixedScore(0);
    setMixedStatuses(Array(10).fill("pending"));
    clearFeedback();
    setScreen("game");
  };

  const goNextSequentialLevel = () => {
    if (seqLevel >= 9) return;
    startSequential(seqLevel + 1);
  };

  const startMemory = (level: MemoryLevel) => {
    setMemoryLevel(level);
    setMemoryCards(buildMemory(level));
    setOpened([]);
    setMatchedPairs(0);
    setScreen("game");
  };

  const goMenu = () => {
    setScreen("menu");
    setGameMode(null);
    clearFeedback();
    setOverlayFeedback(null);
  };

  const goLevelSelect = () => {
    setScreen("level-select");
    clearFeedback();
    setOverlayFeedback(null);
  };

  return (
    <PhoneShell>
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <AppHeader
          showTagline={screen === "menu"}
          onBack={screen === "menu" ? undefined : screen === "level-select" ? goMenu : goLevelSelect}
        />

        <View style={styles.body}>
          {screen === "menu" && (
            <View style={styles.menu}>
              <Pressable style={styles.modeCard} onPress={() => openMode("sequential")}>
                <Text style={styles.modeEmoji}>📚</Text>
                <Text style={styles.modeTitle}>לפי סדר</Text>
                <Text style={styles.modeDesc}>טבלאות 2–10, שלב אחר שלב</Text>
              </Pressable>
              <Pressable style={styles.modeCard} onPress={() => openMode("mixed")}>
                <Text style={styles.modeEmoji}>🎲</Text>
                <Text style={styles.modeTitle}>אקראי</Text>
                <Text style={styles.modeDesc}>שאלות מעורבבות, 3 רמות</Text>
              </Pressable>
              <Pressable style={styles.modeCard} onPress={() => openMode("memory")}>
                <Text style={styles.modeEmoji}>🧠</Text>
                <Text style={styles.modeTitle}>זיכרון</Text>
                <Text style={styles.modeDesc}>התאמת תרגילים עם אותה תוצאה</Text>
              </Pressable>
            </View>
          )}

          {screen === "level-select" && gameMode === "sequential" && (
            <View style={styles.levelSelect}>
              <Text style={styles.levelSelectHint}>בחרו לוח כפל (שלב)</Text>
              <View style={styles.levelGrid}>
                {Array.from({ length: 9 }, (_, i) => i + 1).map((lvl) => (
                  <Pressable key={lvl} style={styles.levelTile} onPress={() => startSequential(lvl)}>
                    <Text style={styles.levelTileNum}>{lvl + 1}</Text>
                    <Text style={styles.levelTileLabel}>לוח</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {screen === "level-select" && gameMode === "mixed" && (
            <View style={styles.levelSelect}>
              <Text style={styles.levelSelectHint}>בחרו רמת קושי</Text>
              {(
                [
                  { lvl: 1 as MixedLevel, title: "קל", desc: "טבלאות 2–5" },
                  { lvl: 2 as MixedLevel, title: "קשה", desc: "טבלאות 6–9" },
                  { lvl: 3 as MixedLevel, title: "מאתגר", desc: "טבלאות 2–10" }
                ] as const
              ).map((item) => (
                <Pressable key={item.lvl} style={styles.levelCard} onPress={() => startMixed(item.lvl)}>
                  <Text style={styles.levelCardTitle}>{item.title}</Text>
                  <Text style={styles.levelCardDesc}>{item.desc}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {screen === "level-select" && gameMode === "memory" && (
            <View style={styles.levelSelect}>
              <Text style={styles.levelSelectHint}>בחרו רמה</Text>
              {(
                [
                  { lvl: 1 as MemoryLevel, title: "Type B", desc: "טבלאות 6–10" },
                  { lvl: 2 as MemoryLevel, title: "Type A", desc: "טבלאות 2–5" },
                  { lvl: 3 as MemoryLevel, title: "Mixed", desc: "כל הטבלאות" }
                ] as const
              ).map((item) => (
                <Pressable key={item.lvl} style={styles.levelCard} onPress={() => startMemory(item.lvl)}>
                  <Text style={styles.levelCardTitle}>{item.title}</Text>
                  <Text style={styles.levelCardDesc}>{item.desc}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {screen === "game" && gameMode === "sequential" && (
            <View style={styles.gameArea}>
              <QuestionProgress statuses={seqStatuses} currentIndex={seqIndex} />
              {!seqDone ? (
                <>
                  <Text style={styles.question}>
                    {seqQ[seqIndex].left} × {seqQ[seqIndex].right} = ?
                  </Text>
                  <Keypad
                    value={seqInput}
                    feedback={feedback}
                    onChange={setSeqInput}
                    onSubmit={() => {
                      if (seqLocked || !seqInput.trim()) return;
                      const current = seqQ[seqIndex];
                      const idx = seqIndex;
                      if (Number(seqInput) === current.answer) {
                        setSeqLocked(true);
                        setSeqStatuses((prev) => {
                          const next = [...prev];
                          next[idx] = "correct";
                          return next;
                        });
                        setSeqInput("");
                        showFeedback("נכון מאוד! ⭐", "success");
                        setTimeout(() => {
                          setSeqIndex((v) => v + 1);
                          clearFeedback();
                          setSeqLocked(false);
                        }, 1000);
                      } else {
                        setSeqInput("");
                        showFeedback("לא נכון, נסו שוב", "error");
                      }
                    }}
                  />
                  <Pressable
                    style={styles.skipBtn}
                    onPress={() => {
                      if (seqLocked) return;
                      setSeqLocked(true);
                      const idx = seqIndex;
                      setSeqStatuses((prev) => {
                        const next = [...prev];
                        next[idx] = "skipped";
                        return next;
                      });
                      setSeqInput("");
                      showFeedback("דילגתם לשאלה הבאה", "info");
                      setTimeout(() => {
                        setSeqIndex((v) => v + 1);
                        clearFeedback();
                        setSeqLocked(false);
                      }, 1000);
                    }}
                  >
                    <Text style={styles.skipBtnText}>דילוג (−1 נקודה)</Text>
                  </Pressable>
                </>
              ) : (
                <View style={styles.resultCard}>
                  <Text style={styles.resultTitle}>סיימתם!</Text>
                  <StarRating correctCount={seqStatuses.filter((s) => s === "correct").length} />
                  <Text style={styles.resultScore}>ציון: {seqScore}/10</Text>
                  {seqLevel < 9 && (
                    <Pressable style={styles.primaryBtn} onPress={goNextSequentialLevel}>
                      <Text style={styles.primaryBtnText}>לשלב הבא</Text>
                    </Pressable>
                  )}
                  <Pressable style={styles.primaryBtn} onPress={goLevelSelect}>
                    <Text style={styles.primaryBtnText}>בחירת שלב אחר</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {screen === "game" && gameMode === "mixed" && (
            <View style={styles.gameArea}>
              <QuestionProgress statuses={mixedStatuses} currentIndex={mixedIndex} />
              {!mixedDone ? (
                <>
                  <Text style={styles.question}>
                    {mixedQ[mixedIndex].left} × {mixedQ[mixedIndex].right} = ?
                  </Text>
                  <Keypad
                    value={mixedInput}
                    feedback={feedback}
                    onChange={setMixedInput}
                    onSubmit={() => {
                      if (mixedLocked || !mixedInput.trim()) return;
                      setMixedLocked(true);
                      const idx = mixedIndex;
                      const current = mixedQ[mixedIndex];
                      const correct = Number(mixedInput) === current.answer;
                      setMixedStatuses((prev) => {
                        const next = [...prev];
                        next[idx] = correct ? "correct" : "skipped";
                        return next;
                      });
                      if (correct) setMixedScore((v) => v + 1);
                      setMixedInput("");
                      showFeedback(correct ? "מצוין! 🌟" : "לא נכון", correct ? "success" : "error");
                      setTimeout(() => {
                        setMixedIndex((v) => v + 1);
                        clearFeedback();
                        setMixedLocked(false);
                      }, 1000);
                    }}
                  />
                </>
              ) : (
                <View style={styles.resultCard}>
                  <Text style={styles.resultTitle}>סיימתם!</Text>
                  <StarRating correctCount={mixedScore} />
                  <Text style={styles.resultScore}>ציון: {mixedScore}/10</Text>
                  <Pressable style={styles.primaryBtn} onPress={goLevelSelect}>
                    <Text style={styles.primaryBtnText}>רמה אחרת</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {screen === "game" && gameMode === "memory" && (
            <View style={styles.gameArea}>
              <Text style={styles.questionCounter}>ניקוד: {matchedPairs} זוגות</Text>
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
              {matchedPairs >= 6 && (
                <View style={styles.resultCard}>
                  <Text style={styles.resultTitle}>כל הכבוד!</Text>
                  <Pressable style={styles.primaryBtn} onPress={goLevelSelect}>
                    <Text style={styles.primaryBtnText}>רמה אחרת</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </View>

        {overlayFeedback && <ToastOverlay text={overlayFeedback.text} tone={overlayFeedback.tone} />}
      </SafeAreaView>
    </PhoneShell>
  );
}

const styles = StyleSheet.create({
  shellNative: { flex: 1 },
  shellWebOuter: {
    flex: 1,
    backgroundColor: "#D8D4E8",
    alignItems: "center",
    justifyContent: "center"
  },
  shellWebInner: {
    width: PHONE_WIDTH,
    maxWidth: "100%",
    flex: 1,
    maxHeight: 844,
    backgroundColor: palette.cream,
    overflow: "hidden",
    ...(Platform.OS === "web"
      ? ({
          boxShadow: "0 8px 32px rgba(59, 53, 82, 0.2)",
          borderRadius: 24
        } as object)
      : {})
  },
  safe: { flex: 1, backgroundColor: palette.cream },
  headerBase: { backgroundColor: palette.cream },
  headerHome: {
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 4
  },
  headerLogoLarge: { width: 100, height: 100 },
  headerTagline: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: "600",
    color: palette.text,
    textAlign: "center"
  },
  headerCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  headerSide: { width: 44 },
  headerBack: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.paleBlue,
    alignItems: "center",
    justifyContent: "center"
  },
  headerBackText: { fontSize: 22, color: palette.accent, fontWeight: "700" },
  headerLogoSmall: { width: 100, height: 100 },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  menu: { flex: 1, gap: 12 },
  modeCard: {
    backgroundColor: palette.paleBlue,
    borderRadius: 16,
    padding: 18,
    gap: 4
  },
  modeEmoji: { fontSize: 28 },
  modeTitle: { fontSize: 20, fontWeight: "800", color: palette.text },
  modeDesc: { fontSize: 14, color: palette.text, opacity: 0.85 },
  levelSelect: { flex: 1, gap: 12 },
  levelSelectHint: { fontSize: 16, fontWeight: "600", color: palette.text, textAlign: "center" },
  levelGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 },
  levelTile: {
    width: 96,
    height: 96,
    borderRadius: 16,
    backgroundColor: palette.lavender,
    alignItems: "center",
    justifyContent: "center"
  },
  levelTileNum: { fontSize: 32, fontWeight: "800", color: palette.text },
  levelTileLabel: { fontSize: 14, color: palette.text },
  levelCard: {
    backgroundColor: palette.paleBlue,
    borderRadius: 14,
    padding: 16,
    gap: 4
  },
  levelCardTitle: { fontSize: 18, fontWeight: "800", color: palette.text },
  levelCardDesc: { fontSize: 14, color: palette.text, opacity: 0.85 },
  gameArea: { flex: 1, gap: 14 },
  progressRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 4
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  progressPending: { backgroundColor: palette.pending },
  progressCorrect: { backgroundColor: palette.success },
  progressSkipped: { backgroundColor: palette.error },
  progressCurrent: {
    borderWidth: 2,
    borderColor: palette.accent
  },
  progressDotText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  question: { fontSize: 36, fontWeight: "800", color: palette.text, textAlign: "center" },
  questionCounter: { fontSize: 15, fontWeight: "600", color: palette.text, textAlign: "center" },
  keypadWrap: { gap: 10 },
  inputValue: {
    textAlign: "center",
    fontSize: 22,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    color: palette.text,
    minHeight: 52
  },
  inputSuccess: { backgroundColor: "#E8F5E9", color: "#2E7D32" },
  inputError: { backgroundColor: "#FFEBEE", color: "#C62828" },
  keypadLtr: { direction: "ltr" },
  keypadRows: { gap: 8 },
  keypadRow: { flexDirection: "row", justifyContent: "center", gap: 8, width: 292, alignSelf: "center" },
  key: {
    width: 92,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center"
  },
  keyText: { fontSize: 24, fontWeight: "700", color: palette.text },
  keyActionBtn: {
    width: 92,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  keyConfirmBtn: { backgroundColor: palette.success },
  keyDeleteBtn: { backgroundColor: palette.warning },
  keyActionText: { fontSize: 14, fontWeight: "700", color: palette.text },
  skipBtn: {
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: palette.error
  },
  skipBtnText: { fontSize: 15, color: "#fff", fontWeight: "700" },
  resultCard: {
    backgroundColor: palette.paleBlue,
    borderRadius: 16,
    padding: 20,
    gap: 12,
    alignItems: "center",
    marginTop: 8
  },
  resultTitle: { fontSize: 24, fontWeight: "800", color: palette.text },
  resultScore: { fontSize: 20, fontWeight: "700", color: palette.success },
  starRow: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  starIcon: { fontSize: 32, fontWeight: "700" },
  starGold: { color: "#F7C948" },
  starGray: { color: palette.pending },
  primaryBtn: {
    backgroundColor: palette.lavender,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center"
  },
  primaryBtnText: { color: palette.text, fontWeight: "700", fontSize: 16 },
  memoryGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  memoryCard: {
    width: "30%",
    minWidth: 88,
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: "#ffffffcc",
    alignItems: "center",
    justifyContent: "center",
    padding: 6
  },
  memoryCardOpen: { backgroundColor: palette.lavender },
  memoryText: { color: palette.text, fontWeight: "700", textAlign: "center", fontSize: 13 },
  toastOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 72,
    zIndex: 100
  },
  toastBox: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    maxWidth: "85%"
  },
  toastSuccess: { backgroundColor: "#E8F5E9" },
  toastError: { backgroundColor: "#FFEBEE" },
  toastInfo: { backgroundColor: "#FFFFFFEE" },
  toastText: { fontSize: 17, fontWeight: "700", color: palette.text, textAlign: "center" }
});
