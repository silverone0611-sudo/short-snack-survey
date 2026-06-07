import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import "./App.css";

const STORAGE_KEY = "short_snack_survey_draft_v6";

const PACKAGING_ITEM = {
  id: "q1",
  reasonId: "q2",
  displayNo: "1",
  reasonDisplayNo: "2",
  title: "가격과 양이 똑같은 과자라면, 어떤 포장을 가장 선호하나요?",
  image: "/images/q11.png",
  options: ["원통형", "상자형", "봉지형"],
  reasonTitle: "그렇게 선택한 이유를 모두 고르시오.",
  reasons: [
    "보관하기 편해서",
    "들고 먹기 편해서",
    "맛있어 보여서",
    "디자인이 좋아서",
    "양이 많아 보여서",
    "쓰레기가 적게 나올 것 같아서",
    "익숙해서",
  ],
};

const CONVENIENCE_ITEMS = [
  {
    id: "q4_storage_convenience",
    title: "3. 원통형 포장은 남은 과자를 보관하기 편하다고 생각한다.",
  },
  {
    id: "q5_portable_convenience",
    title: "4. 원통형 포장은 들고 다니며 먹기 편하다고 생각한다.",
  },
];

const LIKERT_OPTIONS = [
  "전혀 그렇지 않다",
  "그렇지 않다",
  "보통이다",
  "그렇다",
  "매우 그렇다",
];

const POST_REASONS = [
  "보관하기 편해서",
  "먹다가 남겨도 다시 닫을 수 있어서",
  "맛이 있어서",
  "환경에 좋지 않을 것 같아서",
  "분리배출이 어려워서",
  "분리배출하기 귀찮아서",
  "쓰레기가 많이 나와서",
  "기타",
];

const BINS = [
  {
    id: "general",
    icon: "🗑️",
    name: "일반",
    label: "🗑️ 일반",
    image: "/images/bin_general.png",
  },
  {
    id: "plastic",
    icon: "🧴",
    name: "플라스틱",
    label: "🧴 플라스틱",
    image: "/images/bin_plastic.png",
  },
  {
    id: "vinyl",
    icon: "🛍️",
    name: "비닐",
    label: "🛍️ 비닐",
    image: "/images/bin_vinyl.png",
  },
  {
    id: "metal",
    icon: "🥫",
    name: "금속",
    label: "🥫 금속",
    image: "/images/bin_metal.png",
  },
  {
    id: "paper",
    icon: "📄",
    name: "종이",
    label: "📄 종이",
    image: "/images/bin_paper.png",
  },
];

const PRINGLES_VIEWBOX = "0 0 1589 1027";

const PRINGLES_HOTSPOTS = [
  {
    id: "body_print",
    label: "겉 인쇄 코팅면",
    correctBin: "general",
    z: 20,
    svg: {
      type: "polygon",
      points:
        "500,115 680,145 920,220 1195,310 1390,370 " +
        "1210,895 1035,855 790,775 575,665 470,555 " +
        "420,425 430,285",
    },
    pieceImage: "/images/piece_cylinder_print.png",
  },
  {
    id: "lid",
    label: "플라스틱 뚜껑",
    correctBin: "plastic",
    z: 80,
    svg: {
      type: "polygon",
      points:
        "195,660 235,595 315,535 425,505 535,520 630,580 " +
        "690,665 700,745 655,820 560,870 440,890 315,865 " +
        "220,805 175,730",
    },
    pieceImage: "/images/piece_cylinder_lid.png",
  },
  {
    id: "inner_lid",
    label: "속뚜껑",
    correctBin: "general",
    z: 90,
    svg: {
      type: "polygon",
      points:
        "150,65 260,25 395,45 510,125 575,250 555,385 " +
        "465,490 335,530 210,490 130,390 105,260",
    },
    pieceImage: "/images/piece_q19_inner_lid.png",
    className: "q19-inner-lid-piece",
    overlayInStage: true,
  },
  {
    id: "bottom",
    label: "알루미늄 바닥",
    correctBin: "metal",
    z: 100,
    svg: {
      type: "polygon",
      points:
        "1345,335 1470,360 1478,415 1260,930 1180,900 " +
        "1215,780 1370,395",
    },
    pieceImage: "/images/piece_cylinder_bottom.png",
  },
];

const GAME_ITEMS = [
  {
    id: "cylinder_game",
    name: "원통형 포장 과자",
    image: "/images/game_cylinder.png",
    viewBox: PRINGLES_VIEWBOX,
    hotspots: PRINGLES_HOTSPOTS,
    maskGame: true,
  },
];

function getBinLabel(binId) {
  const bin = BINS.find((item) => item.id === binId);
  return bin ? bin.label : binId;
}

function getPercent(score, maxScore) {
  if (!maxScore) return 0;
  return Math.round((score / maxScore) * 1000) / 10;
}

function isGameItemAutoComplete(item, mode, selectedMap) {
  if (!item || !mode) return false;

  if (mode === "no_separation") {
    return !!selectedMap.__whole_package?.selectedBin;
  }

  if (mode === "separate") {
    return item.hotspots.every((part) => !!selectedMap[part.id]?.selectedBin);
  }

  return false;
}

function makeRespondentNo() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `S-${yyyy}${mm}${dd}-${hh}${mi}${ss}-${random}`;
}

function createInitialGame() {
  return {
    currentIndex: 0,
    modes: {},
    selectedParts: {},
    logs: [],
    score: 0,
    maxScore: 0,
  };
}

function createInitialSurvey() {
  return {
    respondentNo: makeRespondentNo(),
    grade: "",
    gender: "",
    basicSurvey: {},
    preSurvey: {
      q1: "",
      q2: [],
    },
    perceptionSurvey: {
      q4_storage_convenience: "",
      q5_portable_convenience: "",
    },
    afterGame: {
      q6_difficulty: "",
      q7_environment: "",
    },
    postLearning: {
      q10_difficulty_after_learning: "",
      q11_environment_after_learning: "",
    },
    postSurvey: {
      q12_purchase_intent: "",
      q13_purchase_reasons: [],
      q13_other: "",
    },
    game: createInitialGame(),
    submittedAt: "",
  };
}

function normalizeSurvey(survey) {
  const base = createInitialSurvey();

  return {
    ...base,
    ...(survey || {}),
    basicSurvey: {
      ...base.basicSurvey,
      ...(survey?.basicSurvey || {}),
    },
    preSurvey: {
      ...base.preSurvey,
      ...(survey?.preSurvey || {}),
      q2: Array.isArray(survey?.preSurvey?.q2) ? survey.preSurvey.q2 : [],
    },
    perceptionSurvey: {
      ...base.perceptionSurvey,
      ...(survey?.perceptionSurvey || {}),
    },
    afterGame: {
      ...base.afterGame,
      ...(survey?.afterGame || {}),
    },
    postLearning: {
      ...base.postLearning,
      ...(survey?.postLearning || {}),
    },
    postSurvey: {
      ...base.postSurvey,
      ...(survey?.postSurvey || {}),
      q13_purchase_reasons: Array.isArray(survey?.postSurvey?.q13_purchase_reasons)
        ? survey.postSurvey.q13_purchase_reasons
        : [],
    },
    game: {
      ...base.game,
      ...(survey?.game || {}),
      modes: survey?.game?.modes || {},
      selectedParts: survey?.game?.selectedParts || {},
      logs: Array.isArray(survey?.game?.logs) ? survey.game.logs : [],
    },
  };
}

function loadSavedDraft() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return {
      step: "basicSurvey",
      survey: createInitialSurvey(),
    };
  }

  try {
    const saved = JSON.parse(raw);
    const validSteps = [
      "basicSurvey",
      "preference",
      "perception",
      "game",
      "afterGame",
      "scoreResult",
      "learning",
      "postLearning",
      "post",
      "done",
    ];

    return {
      step: validSteps.includes(saved.step) ? saved.step : "basicSurvey",
      survey: normalizeSurvey(saved.survey || createInitialSurvey()),
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);

    return {
      step: "basicSurvey",
      survey: createInitialSurvey(),
    };
  }
}

export default function App() {
  const savedDraft = loadSavedDraft();

  const [step, setStep] = useState(savedDraft.step);
  const [survey, setSurvey] = useState(savedDraft.survey);
  const [binModal, setBinModal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        step,
        survey,
      })
    );
  }, [step, survey]);

  function updateBasic(field, value) {
    setSurvey((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updatePre(questionId, value) {
    setSurvey((prev) => ({
      ...prev,
      preSurvey: {
        ...prev.preSurvey,
        [questionId]: value,
      },
    }));
  }

  function togglePreReason(reasonId, value) {
    setSurvey((prev) => {
      const current = prev.preSurvey[reasonId] || [];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      return {
        ...prev,
        preSurvey: {
          ...prev.preSurvey,
          [reasonId]: next,
        },
      };
    });
  }

  function updatePerception(field, value) {
    setSurvey((prev) => ({
      ...prev,
      perceptionSurvey: {
        ...prev.perceptionSurvey,
        [field]: value,
      },
    }));
  }

  function updateAfterGame(field, value) {
    setSurvey((prev) => ({
      ...prev,
      afterGame: {
        ...prev.afterGame,
        [field]: value,
      },
    }));
  }

  function updatePost(field, value) {
    setSurvey((prev) => ({
      ...prev,
      postSurvey: {
        ...prev.postSurvey,
        [field]: value,
      },
    }));
  }

  function togglePostReason(value) {
    setSurvey((prev) => {
      const current = prev.postSurvey.q13_purchase_reasons || [];
      const isRemoving = current.includes(value);
      const next = isRemoving
        ? current.filter((item) => item !== value)
        : [...current, value];

      return {
        ...prev,
        postSurvey: {
          ...prev.postSurvey,
          q13_purchase_reasons: next,
          q13_other:
            value === "기타" && isRemoving ? "" : prev.postSurvey.q13_other || "",
        },
      };
    });
  }

  function finishBasicSurvey() {
    if (!survey.grade || !survey.gender) {
      alert("학년과 성별을 선택하세요.");
      return;
    }

    setStep("preference");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function finishPreferenceStep() {
    const choice = survey.preSurvey.q1;
    const reasons = survey.preSurvey.q2 || [];

    if (!choice) {
      alert("선호하는 포장 형태를 선택하세요.");
      return;
    }

    if (reasons.length === 0) {
      alert("선택 이유를 1개 이상 고르세요.");
      return;
    }

    setStep("perception");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function finishPerceptionStep() {
    const perception = survey.perceptionSurvey || {};
    const unansweredItem = CONVENIENCE_ITEMS.find((item) => !perception[item.id]);

    if (unansweredItem) {
      alert("원통형 포장 인식 문항에 모두 응답하세요.");
      return;
    }

    setStep("game");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function chooseGameMode(mode) {
    const item = GAME_ITEMS[survey.game.currentIndex];

    setSurvey((prev) => {
      const currentParts = {
        ...(prev.game.selectedParts[item.id] || {}),
      };

      if (mode === "no_separation") {
        item.hotspots.forEach((part) => {
          delete currentParts[part.id];
        });
      } else {
        delete currentParts.__whole_package;
      }

      return {
        ...prev,
        game: {
          ...prev.game,
          modes: {
            ...prev.game.modes,
            [item.id]: mode,
          },
          selectedParts: {
            ...prev.game.selectedParts,
            [item.id]: currentParts,
          },
        },
      };
    });

    if (mode === "no_separation") {
      setBinModal({
        type: "game",
        partId: "__whole_package",
        title: "포장 전체를 어디에 버릴까요?",
        desc: "분리배출하지 않고 버린다고 생각한 배출함을 선택하세요.",
      });
    }
  }

  function assignGamePartBin(partId, binId) {
    const item = GAME_ITEMS[survey.game.currentIndex];

    setSurvey((prev) => {
      const itemParts = {
        ...(prev.game.selectedParts[item.id] || {}),
      };

      itemParts[partId] = {
        ...(itemParts[partId] || {}),
        selectedBin: binId,
        selectedBinLabel: getBinLabel(binId),
        selectedAt: new Date().toISOString(),
      };

      return {
        ...prev,
        game: {
          ...prev.game,
          selectedParts: {
            ...prev.game.selectedParts,
            [item.id]: itemParts,
          },
        },
      };
    });
  }

  function removeGamePartSelection(partId) {
    const item = GAME_ITEMS[survey.game.currentIndex];

    setSurvey((prev) => {
      const itemParts = {
        ...(prev.game.selectedParts[item.id] || {}),
      };

      delete itemParts[partId];

      return {
        ...prev,
        game: {
          ...prev.game,
          selectedParts: {
            ...prev.game.selectedParts,
            [item.id]: itemParts,
          },
        },
      };
    });
  }

  function chooseBin(binId) {
    if (!binModal) return;

    if (binModal.type === "game") {
      assignGamePartBin(binModal.partId, binId);
      setBinModal(null);
      return;
    }

    setBinModal(null);
  }

  function openGameBinModal(partId, partLabel) {
    setBinModal({
      type: "game",
      partId,
      title: `${partLabel}를 어디에 버릴까요?`,
      desc: "알맞은 배출함을 선택하세요.",
    });
  }

  function finishCurrentGameItem() {
    const item = GAME_ITEMS[survey.game.currentIndex];
    const mode = survey.game.modes[item.id] || "";
    const selectedMap = survey.game.selectedParts[item.id] || {};

    if (!mode) {
      alert("먼저 ‘분리배출 안 한다’ 또는 ‘분리배출 한다’를 선택하세요.");
      return;
    }

    if (mode === "no_separation") {
      const wholeAnswer = selectedMap.__whole_package;

      if (!wholeAnswer) {
        alert("포장 전체를 어디에 버릴지 선택하세요.");
        return;
      }

      const logs = item.hotspots.map((part) => ({
        stage: "short_survey_cylinder_game",
        selectionStatus: "whole_package_no_separation",
        gameItemId: item.id,
        gameItemName: item.name,
        targetPartId: part.id,
        targetPartLabel: part.label,
        selectedBin: wholeAnswer.selectedBin,
        selectedBinLabel: wholeAnswer.selectedBinLabel,
        correctBin: part.correctBin,
        correctBinLabel: getBinLabel(part.correctBin),
        isCorrect: false,
        eventTime: wholeAnswer.selectedAt,
      }));

      moveToAfterGame(logs, 0, item.hotspots.length);
      return;
    }

    const unassignedPart = item.hotspots.find(
      (part) => selectedMap[part.id] && !selectedMap[part.id].selectedBin
    );

    if (unassignedPart) {
      alert("선택한 조각의 배출함을 선택해 주세요.");
      return;
    }

    let addScore = 0;
    const addMaxScore = item.hotspots.length;

    const logs = item.hotspots.map((part) => {
      const answer = selectedMap[part.id] || null;
      const isSelected = answer !== null;
      const isCorrect = isSelected && answer.selectedBin === part.correctBin;

      if (isCorrect) {
        addScore += 1;
      }

      return {
        stage: "short_survey_cylinder_game",
        selectionStatus: isSelected ? "selected" : "not_selected",
        gameItemId: item.id,
        gameItemName: item.name,
        targetPartId: part.id,
        targetPartLabel: part.label,
        selectedBin: isSelected ? answer.selectedBin : "",
        selectedBinLabel: isSelected ? answer.selectedBinLabel : "",
        correctBin: part.correctBin,
        correctBinLabel: getBinLabel(part.correctBin),
        isCorrect,
        eventTime: isSelected ? answer.selectedAt : new Date().toISOString(),
      };
    });

    moveToAfterGame(logs, addScore, addMaxScore);
  }

  function moveToAfterGame(logs, addScore, addMaxScore) {
    setSurvey((prev) => ({
      ...prev,
      game: {
        ...prev.game,
        logs: [...prev.game.logs, ...logs],
        score: addScore,
        maxScore: addMaxScore,
      },
    }));

    setStep("afterGame");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function finishAfterGame() {
    if (!survey.afterGame.q6_difficulty || !survey.afterGame.q7_environment) {
      alert("게임 후 생각 문항에 모두 응답하세요.");
      return;
    }

    setStep("scoreResult");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updatePostLearning(field, value) {
    setSurvey((prev) => ({
      ...prev,
      postLearning: {
        ...(prev.postLearning || {}),
        [field]: value,
      },
    }));
  }

  function finishLearningStep() {
    setStep("postLearning");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function finishPostLearningStep() {
    const postLearning = survey.postLearning || {};

    if (!postLearning.q10_difficulty_after_learning || !postLearning.q11_environment_after_learning) {
      alert("학습 후 생각 문항에 모두 응답하세요.");
      return;
    }

    setStep("post");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function finishPostSurvey() {
    if (isSubmitting) return;

    if (!survey.postSurvey.q12_purchase_intent) {
    alert("앞으로 구매할 것인지 선택하세요.");
    return;
  }

  if ((survey.postSurvey.q13_purchase_reasons || []).length === 0) {
    alert("구매의향 이유를 1개 이상 선택하세요.");
    return;
  }

  if (
    survey.postSurvey.q13_purchase_reasons?.includes("기타") &&
    !survey.postSurvey.q13_other?.trim()
  ) {
    alert("기타를 선택한 경우 내용을 입력하세요.");
    return;
  }

  const submittedAt = new Date().toISOString();

  const nextSurvey = {
    ...survey,
    submittedAt,
  };

  const row = {
    respondent_no: nextSurvey.respondentNo,
    grade: nextSurvey.grade,
    gender: nextSurvey.gender,

    q1_package_preference: nextSurvey.preSurvey?.q1 || "",
    q2_preference_reasons: (nextSurvey.preSurvey?.q2 || []).join(" | "),

    q3_storage_convenience:
      nextSurvey.perceptionSurvey?.q4_storage_convenience || "",
    q4_portable_convenience:
      nextSurvey.perceptionSurvey?.q5_portable_convenience || "",

    q5_after_game_difficulty: nextSurvey.afterGame?.q6_difficulty || "",
    q6_after_game_environment: nextSurvey.afterGame?.q7_environment || "",

    game_score: nextSurvey.game?.score ?? 0,
    game_max_score: nextSurvey.game?.maxScore ?? 0,
    game_logs: nextSurvey.game?.logs || [],

    q7_after_learning_difficulty:
      nextSurvey.postLearning?.q10_difficulty_after_learning || "",
    q8_after_learning_environment:
      nextSurvey.postLearning?.q11_environment_after_learning || "",

    q9_purchase_intent: nextSurvey.postSurvey?.q12_purchase_intent || "",
    q10_purchase_reasons:
      (nextSurvey.postSurvey?.q13_purchase_reasons || []).join(" | "),
    q10_other: nextSurvey.postSurvey?.q13_other || "",

    survey_json: nextSurvey,
    submitted_at: submittedAt,
  };

  try {
    setIsSubmitting(true);

    const { error } = await supabase
      .from("short_snack_survey_responses")
      .insert(row);

    if (error) {
      console.error("Supabase 저장 오류:", error);
      alert(`응답 저장 중 오류가 발생했습니다.\n\n${error.message}`);
      return;
    }

    setSurvey(nextSurvey);
    setStep("done");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    console.error("제출 처리 오류:", error);
    alert(`제출 처리 중 오류가 발생했습니다.\n\n${error.message || error}`);
  } finally {
    setIsSubmitting(false);
  }
}

  function resetDraft() {
    const ok = confirm("임시 저장된 응답을 모두 지울까요?");

    if (!ok) return;

    const freshSurvey = createInitialSurvey();

    localStorage.removeItem(STORAGE_KEY);
    setSurvey(freshSurvey);
    setStep("basicSurvey");
    setBinModal(null);
  }

  return (
    <main className="app">
      <section className="card">
        {step === "basicSurvey" && (
          <BasicSurveyStep
            survey={survey}
            updateBasic={updateBasic}
            finishBasicSurvey={finishBasicSurvey}
          />
        )}

        {step === "preference" && (
          <PreferenceStep
            item={PACKAGING_ITEM}
            survey={survey}
            updatePre={updatePre}
            togglePreReason={togglePreReason}
            nextPre={finishPreferenceStep}
          />
        )}

        {step === "perception" && (
          <PerceptionStep
            survey={survey}
            updatePerception={updatePerception}
            finishPerceptionStep={finishPerceptionStep}
          />
        )}

        {step === "game" && (
          <GameStep
            game={survey.game}
            chooseGameMode={chooseGameMode}
            assignGamePartBin={assignGamePartBin}
            removeGamePartSelection={removeGamePartSelection}
            openGameBinModal={openGameBinModal}
            finishCurrentGameItem={finishCurrentGameItem}
          />
        )}

        {step === "afterGame" && (
          <AfterGameStep
            survey={survey}
            updateAfterGame={updateAfterGame}
            finishAfterGame={finishAfterGame}
          />
        )}

        {step === "scoreResult" && (
          <ScoreResultStep
            game={survey.game}
            onNext={() => {
              setStep("learning");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}

        {step === "learning" && (
          <LearningGuideStep onNext={finishLearningStep} />
        )}

        {step === "postLearning" && (
          <PostLearningStep
            survey={survey}
            updatePostLearning={updatePostLearning}
            finishPostLearningStep={finishPostLearningStep}
          />
        )}

        {step === "post" && (
          <PostSurveyStep
            survey={survey}
            updatePost={updatePost}
            togglePostReason={togglePostReason}
            finishPostSurvey={finishPostSurvey}
            isSubmitting={isSubmitting}
          />
        )}

        {step === "done" && <DoneStep survey={survey} resetDraft={resetDraft} />}

        {![
          "basicSurvey",
          "preference",
          "perception",
          "game",
          "afterGame",
          "scoreResult",
          "learning",
          "postLearning",
          "post",
          "done",
        ].includes(step) && (
          <>
            <h2>화면을 불러오지 못했습니다</h2>
            <p className="desc">
              이전 임시 저장값과 현재 설문 단계가 맞지 않습니다. 아래 버튼을 눌러 처음부터 다시 시작하세요.
            </p>
            <button type="button" className="secondary" onClick={resetDraft}>
              처음부터 다시 시작
            </button>
          </>
        )}
      </section>

      {binModal && (
        <BinModal
          title={binModal.title}
          desc={binModal.desc}
          chooseBin={chooseBin}
          close={() => setBinModal(null)}
        />
      )}
    </main>
  );
}

function QuestionTitle({ no, text, note }) {
  return (
    <h3 className="survey-question-title question-title-with-pill">
      <span className="question-number-pill">{no}</span>
      <span className="question-title-text">{text}</span>
      {note && <span className="question-note">{note}</span>}
    </h3>
  );
}

function BasicSurveyStep({ survey, updateBasic, finishBasicSurvey }) {
  return (
    <>
      <h1>과자 포장에 대한 인식과 태도 조사</h1>

      <p className="desc">
                안녕하세요. 저희는 '해석의 조건'입니다.
        <br />
        저희는 원통형 포장 과자에 대한 인식과 태도가 궁금하여 연구를 진행 중입니다.
        <br />
        평소 생각대로 대답해 주시기 바랍니다.
      </p>

      <div className="event-notice-box">
        <strong>설문 안내</strong>
        <p>예상 소요 시간: 약 2~3분</p>
        <p className="event-entry-note">
          설문을 완료한 후 1층 교무실 김선미 선생님께 간식을 받아가세요.
        </p>
      </div>

      <label className="field">
        학년
        <select
          value={survey.grade}
          onChange={(event) => updateBasic("grade", event.target.value)}
        >
          <option value="">선택</option>
          <option value="1학년">1학년</option>
          <option value="2학년">2학년</option>
          <option value="3학년">3학년</option>
        </select>
      </label>

      <label className="field">
        성별
        <select
          value={survey.gender}
          onChange={(event) => updateBasic("gender", event.target.value)}
        >
          <option value="">선택</option>
          <option value="남자">남자</option>
          <option value="여자">여자</option>
        </select>
      </label>

      <button type="button" onClick={finishBasicSurvey}>
        다음으로
      </button>

    </>
  );
}

function PreferenceStep({ item, survey, updatePre, togglePreReason, nextPre }) {
  const choice = survey.preSurvey[item.id] || "";
  const reasons = item.reasonId ? survey.preSurvey[item.reasonId] || [] : [];

  return (
    <>
      <h2>1단계. 포장 선호도</h2>

      <div className="question">
        <QuestionTitle no={item.displayNo} text={item.title} />

        {item.image && (
          <div className="image-box">
            <img src={item.image} alt="포장 선호도 문항 이미지" />
          </div>
        )}

        <div className={`options choice-options option-count-${item.options.length}`}>
          {item.options.map((option) => (
            <label key={option} className={choice === option ? "selected" : ""}>
              <input
                type="radio"
                name={item.id}
                checked={choice === option}
                onChange={() => updatePre(item.id, option)}
              />
              {option}
            </label>
          ))}
        </div>

        {item.reasonId && (
          <>
            <QuestionTitle
              no={item.reasonDisplayNo}
              text={item.reasonTitle}
              note="복수 체크 가능"
            />

            <div className="options">
              {(item.reasons || []).map((reason) => (
                <label key={reason} className={reasons.includes(reason) ? "selected" : ""}>
                  <input
                    type="checkbox"
                    checked={reasons.includes(reason)}
                    onChange={() => togglePreReason(item.reasonId, reason)}
                  />
                  {reason}
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      <button type="button" onClick={nextPre}>
        다음으로
      </button>
    </>
  );
}

function PerceptionStep({ survey, updatePerception, finishPerceptionStep }) {
  const perception = survey.perceptionSurvey || {};

  return (
    <>
      <h2>2단계. 원통형 포장 인식</h2>

      <p className="desc">
        원통형 포장에 대한 생각을 골라 주세요.
      </p>

      {CONVENIENCE_ITEMS.map((item) => (
        <LikertQuestion
          key={item.id}
          title={item.title}
          name={item.id}
          value={perception[item.id] || ""}
          onChange={(value) => updatePerception(item.id, value)}
          horizontal
        />
      ))}

      <button type="button" onClick={finishPerceptionStep}>
        다음으로
      </button>
    </>
  );
}

function useIsMobileLike() {
  return true;
}

function GameStep({
  game,
  chooseGameMode,
  assignGamePartBin,
  removeGamePartSelection,
  openGameBinModal,
  finishCurrentGameItem,
}) {
  const item = GAME_ITEMS[game.currentIndex];
  const [activePieceId, setActivePieceId] = useState("");
  const [draggingPieceId, setDraggingPieceId] = useState("");
  const [dragPreview, setDragPreview] = useState(null);
  const isMobileLike = useIsMobileLike();

  const mode = item ? game.modes[item.id] || "" : "";
  const selectedMap = item ? game.selectedParts[item.id] || {} : {};

  useEffect(() => {
    if (!item) return;

    setActivePieceId(mode === "no_separation" ? "__whole_package" : "");
    setDraggingPieceId("");
    setDragPreview(null);
  }, [item?.id, mode]);

  if (!item) {
    return null;
  }

  const selectedPartsSummary =
    mode === "no_separation"
      ? selectedMap.__whole_package?.selectedBinLabel
        ? [
            {
              partId: "__whole_package",
              partLabel: "포장 전체",
              binLabel: selectedMap.__whole_package.selectedBinLabel,
            },
          ]
        : []
      : item.hotspots
          .filter((part) => selectedMap[part.id])
          .map((part) => {
            const answer = selectedMap[part.id];

            return {
              partId: part.id,
              partLabel: part.label,
              binLabel: answer?.selectedBinLabel || "배출함 미선택",
            };
          });

  function getDragPiece(partId) {
    if (partId === "__whole_package") {
      return {
        id: "__whole_package",
        label: "포장 전체",
        pieceImage: item.image,
      };
    }

    return item.hotspots.find((part) => part.id === partId) || null;
  }

  function startDragPiece(partId, event) {
    const piece = getDragPiece(partId);

    setDraggingPieceId(partId);
    setActivePieceId(partId);

    if (piece) {
      setDragPreview({
        id: partId,
        label: piece.label,
        pieceImage: piece.pieceImage || item.image,
        x: event?.clientX || 0,
        y: event?.clientY || 0,
      });
    }
  }

  function handleDropOnBin(binId, partId) {
    if (!partId) return;
    assignGamePartBin(partId, binId);
    setActivePieceId("");
    setDraggingPieceId("");
    setDragPreview(null);
  }

  useEffect(() => {
    if (!draggingPieceId) return;

    function handlePointerMove(event) {
      setDragPreview((prev) =>
        prev
          ? {
              ...prev,
              x: event.clientX,
              y: event.clientY,
            }
          : prev
      );
    }

    function handlePointerUp(event) {
      const dropTarget = event.target.closest?.("[data-bin-id]");

      if (dropTarget) {
        handleDropOnBin(dropTarget.dataset.binId, draggingPieceId);
        return;
      }

      setDraggingPieceId("");
      setDragPreview(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [draggingPieceId]);

  return (
    <>
      <h2>3단계. 분리배출 게임</h2>

      <p className="desc game-desc">
        원통형 포장을 버릴 때 어떻게 처리할지 선택하세요.
        <span className="game-touch-emphasis"> 분리배출 안 한다</span>를 누르면 바로 배출함 선택창이 열립니다.
        <span className="game-touch-emphasis"> 분리배출 한다</span>를 누르면 버릴 부분을 터치해서 배출함을 고를 수 있습니다.
      </p>

      <div className="game-choice-buttons">
        <button type="button" onClick={() => chooseGameMode("no_separation")}>
          분리배출 안 한다
        </button>
        <button type="button" onClick={() => chooseGameMode("separate")}>
          분리배출 한다
        </button>
      </div>

      {mode === "no_separation" ? (
        <WholePackageImage
          item={item}
          selected={activePieceId === "__whole_package"}
          removed={!!selectedMap.__whole_package?.selectedBin}
          isMobileLike={isMobileLike}
          onSelect={() => setActivePieceId("__whole_package")}
          onMobileTap={() => openGameBinModal("__whole_package", "포장 전체")}
          onDragStart={(event) => startDragPiece("__whole_package", event)}
          onDragEnd={() => setDraggingPieceId("")}
        />
      ) : mode === "separate" ? (
        <MaskedGameImage
          item={item}
          selectedMap={selectedMap}
          activePieceId={activePieceId}
          isMobileLike={isMobileLike}
          onSelect={(partId) => setActivePieceId(partId)}
          onMobileTap={(part) => {
            setActivePieceId(part.id);
            openGameBinModal(part.id, part.label);
          }}
          onDragStart={(partId, event) => startDragPiece(partId, event)}
          onDragEnd={() => setDraggingPieceId("")}
        />
      ) : (
        <>
          <div className="layer-game-box">
            <div className="layer-stage whole-package-stage">
              <img
                className="whole-package-image"
                src={item.image}
                alt={`${item.name} 전체 이미지`}
                draggable={false}
              />
            </div>
          </div>

          <div className="piece-help">
            위의 두 버튼 중 하나를 먼저 선택하세요.
          </div>
        </>
      )}

      {mode && (
        <>
          {selectedPartsSummary.length > 0 && (
            <GameSelectionSummary
              items={selectedPartsSummary}
              onReset={removeGamePartSelection}
            />
          )}

          {mode === "separate" && (
            <div className="piece-help">
              분리배출을 완료했다고 생각하면 아래의 버튼을 누르세요.
            </div>
          )}

          {mode === "separate" && isGameItemAutoComplete(item, mode, selectedMap) && (
            <div className="auto-next-notice">
              모든 부분을 선택했습니다. 아래 버튼을 누르면 결과 화면으로 이동합니다.
            </div>
          )}

          <button type="button" onClick={finishCurrentGameItem}>
            {mode === "separate" ? "다음으로" : "다음으로"}
          </button>
        </>
      )}

      {dragPreview && <DragPreview preview={dragPreview} />}
    </>
  );
}

function DragPreview({ preview }) {
  return (
    <div
      className="drag-preview"
      style={{
        left: `${preview.x}px`,
        top: `${preview.y}px`,
      }}
    >
      {preview.pieceImage ? (
        <img src={preview.pieceImage} alt="" aria-hidden="true" />
      ) : (
        <div className="drag-preview-fallback">{preview.label}</div>
      )}
      <div>{preview.label}</div>
    </div>
  );
}

function WholePackageImage({
  item,
  selected,
  removed,
  isMobileLike,
  onSelect,
  onMobileTap,
  onDragStart,
  onDragEnd,
}) {
  return (
    <div className="layer-game-box">
      <div className="layer-stage whole-package-stage">
        {removed ? (
          <div className="layer-stage-empty">
            포장 전체를 배출함으로 옮겼습니다.
          </div>
        ) : (
          <img
            className={selected ? "whole-package-image active" : "whole-package-image"}
            src={item.image}
            alt={`${item.name} 전체`}
            draggable={!isMobileLike}
            onClick={(event) => {
              if (isMobileLike) {
                event.preventDefault();
                onMobileTap();
                return;
              }

              onSelect();
            }}
            onPointerDown={(event) => {
              if (isMobileLike) return;

              event.preventDefault();
              onSelect();
              onDragStart(event);
            }}
            onDragStart={(event) => {
              if (isMobileLike) {
                event.preventDefault();
                return;
              }

              event.dataTransfer.setData("text/plain", "__whole_package");
              onDragStart(event);
            }}
            onDragEnd={onDragEnd}
          />
        )}
      </div>
    </div>
  );
}

function MaskedGameImage({
  item,
  selectedMap,
  activePieceId,
  isMobileLike,
  onSelect,
  onMobileTap,
  onDragStart,
  onDragEnd,
}) {
  const removedParts = item.hotspots.filter((part) => selectedMap[part.id]?.selectedBin);
  const selectableParts = item.hotspots.filter((part) => !selectedMap[part.id]?.selectedBin);
  const activePart = activePieceId
    ? selectableParts.find((part) => part.id === activePieceId)
    : null;
  const highlightedParts = activePart
    ? [{ ...activePart, highlightType: "active" }]
    : [];

  return (
    <div className="layer-game-box">
      <div className="layer-stage mask-game-stage">
        <img className="mask-game-base-image" src={item.image} alt={item.name} />

        {selectableParts
          .filter((part) => part.overlayInStage && part.pieceImage)
          .sort((a, b) => (a.z || 0) - (b.z || 0))
          .map((part) => (
            <img
              key={`overlay-${part.id}`}
              className={`mask-game-overlay-image ${part.className || ""}`}
              src={part.pieceImage}
              alt=""
              aria-hidden="true"
              draggable={false}
            />
          ))}

        <svg
          className="mask-game-mask-svg"
          viewBox={item.viewBox || "0 0 1000 1000"}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          {removedParts
            .sort((a, b) => (a.z || 0) - (b.z || 0))
            .map((part) => (
              <MaskShape key={`mask-${part.id}`} part={part} />
            ))}
        </svg>

        {highlightedParts.length > 0 && (
          <svg
            className="mask-game-selected-svg"
            viewBox={item.viewBox || "0 0 1000 1000"}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            {highlightedParts
              .sort((a, b) => (a.z || 0) - (b.z || 0))
              .map((part) => (
                <MaskSelectedShape
                  key={`selected-${part.id}-${part.highlightType}`}
                  part={part}
                />
              ))}
          </svg>
        )}

        <svg
          className="mask-game-hit-svg"
          viewBox={item.viewBox || "0 0 1000 1000"}
          preserveAspectRatio="xMidYMid meet"
        >
          {selectableParts
            .sort((a, b) => (a.z || 0) - (b.z || 0))
            .map((part) => (
              <MaskHitShape
                key={`hit-${part.id}`}
                part={part}
                selected={activePieceId === part.id}
                isMobileLike={isMobileLike}
                onSelect={() => onSelect(part.id)}
                onMobileTap={() => onMobileTap(part)}
                onDragStart={(event) => onDragStart(part.id, event)}
                onDragEnd={onDragEnd}
              />
            ))}
        </svg>

        {selectableParts.length === 0 && (
          <div className="layer-stage-empty">
            모든 조각을 배출함으로 옮겼습니다.
          </div>
        )}
      </div>
    </div>
  );
}

function MaskShape({ part }) {
  if (part.svg.type === "polygon") {
    return <polygon className="mask-game-mask-shape" points={part.svg.points} />;
  }

  if (part.svg.type === "path") {
    return <path className="mask-game-mask-shape" d={part.svg.d} />;
  }

  return null;
}

function MaskSelectedShape({ part }) {
  const className =
    part.highlightType === "active"
      ? "mask-game-selected-shape active"
      : "mask-game-selected-shape";

  if (part.svg.type === "polygon") {
    return <polygon className={className} points={part.svg.points} />;
  }

  if (part.svg.type === "path") {
    return <path className={className} d={part.svg.d} />;
  }

  return null;
}

function MaskHitShape({
  part,
  selected,
  isMobileLike,
  onSelect,
  onMobileTap,
  onDragStart,
  onDragEnd,
}) {
  const className = selected ? "mask-game-hit-shape selected" : "mask-game-hit-shape";
  const commonProps = {
    className,
    draggable: !isMobileLike,
    onClick: (event) => {
      if (isMobileLike) {
        event.preventDefault();
        onSelect();
        onMobileTap();
        return;
      }

      onSelect();
    },
    onPointerDown: (event) => {
      if (isMobileLike) return;

      event.preventDefault();
      onSelect();
      onDragStart(event);
    },
    onDragStart: (event) => {
      if (isMobileLike) {
        event.preventDefault();
        return;
      }

      event.dataTransfer.setData("text/plain", part.id);
      onDragStart(event);
    },
    onDragEnd,
  };

  if (part.svg.type === "polygon") {
    return <polygon {...commonProps} points={part.svg.points} />;
  }

  if (part.svg.type === "path") {
    return <path {...commonProps} d={part.svg.d} />;
  }

  return null;
}

function GameSelectionSummary({ items, onReset }) {
  return (
    <div className="game-summary-box">
      <div className="game-summary-title">선택 내용</div>

      <div className="game-summary-list">
        {items.map((item, index) => (
          <div className="game-summary-row" key={`${item.partLabel}-${index}`}>
            <span className="game-summary-part">{item.partLabel}</span>
            <span className="game-summary-arrow">→</span>
            <span className="game-summary-bin">{item.binLabel}</span>
            <button
              type="button"
              className="summary-reset-button"
              onClick={() => onReset(item.partId)}
            >
              다시 선택
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function BinModal({ title, desc, chooseBin, close }) {
  return (
    <div className="bin-modal-backdrop">
      <div className="bin-modal-card">
        <h2>{title}</h2>
        <p className="desc">{desc}</p>

        <div className="bin-grid">
          {BINS.map((bin) => (
            <BinOption key={bin.id} bin={bin} onChoose={() => chooseBin(bin.id)} />
          ))}
        </div>

        <button type="button" className="secondary" onClick={close}>
          취소
        </button>
      </div>
    </div>
  );
}

function BinOption({ bin, onChoose }) {
  const [imageError, setImageError] = useState(false);

  return (
    <button type="button" className="bin-option-button" onClick={onChoose}>
      {bin.image && !imageError ? (
        <img
          className="bin-option-image"
          src={bin.image}
          alt=""
          aria-hidden="true"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="bin-option-emoji" aria-hidden="true">
          {bin.icon}
        </span>
      )}
      <span className="bin-option-name">{bin.name}</span>
    </button>
  );
}

function AfterGameStep({ survey, updateAfterGame, finishAfterGame }) {
  return (
    <>
      <h2>4단계. 게임 후 생각</h2>
      <p className="desc">분리배출 게임을 해 본 뒤, 현재 생각에 가장 가까운 답을 선택하세요.</p>

      <LikertQuestion
        title="5. 원통형 포장은 분리배출이 어렵다고 생각한다."
        name="q6_difficulty"
        value={survey.afterGame?.q6_difficulty || ""}
        onChange={(value) => updateAfterGame("q6_difficulty", value)}
        horizontal
      />

      <LikertQuestion
        title="6. 원통형 포장은 환경 측면에서 부담이 큰 포장이라고 생각한다."
        name="q7_environment"
        value={survey.afterGame?.q7_environment || ""}
        onChange={(value) => updateAfterGame("q7_environment", value)}
        horizontal
      />

      <button type="button" onClick={finishAfterGame}>
        다음으로
      </button>
    </>
  );
}

function LikertQuestion({ title, name, value, onChange, horizontal = false }) {
  const [questionNo, ...questionTextParts] = title.split(". ");
  const questionText = questionTextParts.join(". ");

  return (
    <div className={horizontal ? "question likert-question-horizontal" : "question"}>
      {horizontal ? (
        <div className="likert-question-title">
          <span className="likert-question-no">{questionNo}</span>
          <span className="likert-question-text">{questionText || title}</span>
        </div>
      ) : (
        <h3 className="survey-question-title">{title}</h3>
      )}

      <div className={horizontal ? "options likert-horizontal-options" : "options"}>
        {LIKERT_OPTIONS.map((option, index) => (
          <label
            key={option}
            className={horizontal && value === option ? "selected" : ""}
          >
            <input
              type="radio"
              name={name}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            {horizontal ? (
              <>
                <span className="likert-score">{index + 1}</span>
                <span className="likert-text">{option}</span>
              </>
            ) : (
              option
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

function ScoreResultStep({ game, onNext }) {
  const score = game?.score || 0;
  const maxScore = game?.maxScore || 0;
  const percent = getPercent(score, maxScore);
  const logs = game?.logs || [];
  const wrongLogs = logs.filter((log) => !log.isCorrect);

  return (
    <>
      <h2>5단계. 내 점수 확인</h2>

      <p className="desc">
        분리배출 게임 결과를 확인하세요. 다음 화면에서 실제 원통형 포장재의 분리배출 방법을 학습합니다.
      </p>

      <div className="result-score-card result-score-hero-card">
        <div className="result-score-label">내 점수</div>
        <div className="result-score-main result-score-hero-main">
          <strong>{score}</strong>
          <span>/ {maxScore}점</span>
        </div>
        <div className="result-score-percent">정답률 {percent}%</div>
      </div>

      <div className="result-section result-correction-section">
        <div className="result-section-title result-correction-title">
          다시 확인할 부분 ({wrongLogs.length})
        </div>

        {wrongLogs.length > 0 ? (
          <div className="result-list">
            {wrongLogs.map((log, index) => (
              <div className="result-item result-item-wrong" key={`${log.targetPartId}-${index}`}>
                <div className="result-item-content">
                  <div className="result-item-title">{log.targetPartLabel}</div>
                  <div className="result-item-line">
                    내 선택: <strong>{log.selectedBinLabel || "선택 안 함"}</strong>
                  </div>
                  <div className="result-item-line result-wrong-text">
                    실제 배출: <strong>{log.correctBinLabel}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="result-empty result-correction-empty">
            오답이 없습니다.
          </div>
        )}
      </div>

      <button type="button" onClick={onNext}>
        다음으로
      </button>
    </>
  );
}

function LearningGuideStep({ onNext }) {
  return (
    <>
      <h2>6단계. 실제 분리배출 방법 확인</h2>

      <p className="desc">
        원통형 포장은 여러 재질이 결합되어 있어 부분별로 배출 방법이 다릅니다.
        아래 이미지를 보고 실제 분리배출 방법을 확인하세요.
      </p>

      <div className="learning-image-box">
        <img
          src="/images/pringles_separation_guide.png"
          alt="원통형 포장재 구성과 분리배출 방법 안내"
        />
      </div>

      <div className="learning-summary-box">
        <strong>핵심 정리</strong>
        <p>
          겉 인쇄 코팅면, 속 은박 코팅면, 실링용 속뚜껑은 일반쓰레기로 배출해야 합니다. 
          겉과 속 코팅을 벗겨 낸 종이 면은 종이류, 겉뚜껑은 플라스틱, 바닥면은 금속으로 배출해야 합니다.
         <br />
          사실상 바닥면 금속을 본체에서 쉽게 분리할 수 없으므로, <br /><span className="learning-summary-emphasis">플라스틱 뚜껑을 제외한 통 전체를 '일반쓰레기'로 배출</span>해야 합니다.         </p>
      </div>

      <button type="button" onClick={onNext}>
        다음으로
      </button>
    </>
  );
}

function PostLearningStep({ survey, updatePostLearning, finishPostLearningStep }) {
  const postLearning = survey.postLearning || {};

  return (
    <>
      <h2>7단계. 학습 후 생각</h2>
      <p className="desc">
        현재 생각에 가장 가까운 답을 선택하세요.
      </p>

      <LikertQuestion
        title="7. 원통형 포장은 분리배출이 어렵다고 생각한다."
        name="q10_difficulty_after_learning"
        value={postLearning.q10_difficulty_after_learning || ""}
        onChange={(value) => updatePostLearning("q10_difficulty_after_learning", value)}
        horizontal
      />

      <LikertQuestion
        title="8. 원통형 포장은 환경 측면에서 부담이 큰 포장이라고 생각한다."
        name="q11_environment_after_learning"
        value={postLearning.q11_environment_after_learning || ""}
        onChange={(value) => updatePostLearning("q11_environment_after_learning", value)}
        horizontal
      />

      <button type="button" onClick={finishPostLearningStep}>
        다음으로
      </button>
    </>
  );
}

function PostSurveyStep({
  survey,
  updatePost,
  togglePostReason,
  finishPostSurvey,
  isSubmitting,
}) {
  const postSurvey = survey.postSurvey || {};
  const selectedReasons = postSurvey.q13_purchase_reasons || [];
  const hasOtherReason = selectedReasons.includes("기타");

  return (
    <>
      <h2>8단계. 앞으로 구매할 것인가</h2>

      <LikertQuestion
        title="9. 앞으로 원통형 포장 과자를 구입하거나 먹을 생각이 있나요?"
        name="q12_purchase_intent"
        value={postSurvey.q12_purchase_intent || ""}
        onChange={(value) => updatePost("q12_purchase_intent", value)}
        horizontal
      />

      <div className="question post-reason-question">
        <QuestionTitle
          no="10"
          text="그렇게 답한 데 영향을 준 이유를 모두 고르시오."
          note="복수 체크 가능"
        />

        <div className="options">
          {POST_REASONS.map((reason) => (
            <label key={reason} className={selectedReasons.includes(reason) ? "selected" : ""}>
              <input
                type="checkbox"
                checked={selectedReasons.includes(reason)}
                onChange={() => togglePostReason(reason)}
              />
              {reason}
            </label>
          ))}
        </div>

        {hasOtherReason && (
          <label className="field post-other-field">
            기타 내용
            <input
              className="text-answer-input"
              type="text"
              value={postSurvey.q13_other || ""}
              onChange={(event) => updatePost("q13_other", event.target.value)}
              placeholder="기타 이유를 직접 입력하세요."
            />
          </label>
        )}
      </div>

      <button type="button" onClick={finishPostSurvey} disabled={isSubmitting}>
  {isSubmitting ? "저장 중..." : "설문 제출하기"}
      </button>
    </>
  );
}

function DoneStep({ survey, resetDraft }) {
  const percent = getPercent(survey.game?.score || 0, survey.game?.maxScore || 0);

  return (
    <>
      <h2>설문 완료</h2>

      <p className="desc final-thanks">
        설문에 참여해 주셔서 감사합니다.
      </p>

      <div className="event-final-box">
        <strong>설문 참여자 간식 안내</strong>
        <p className="event-entry-note final-snack-note">
  설문을 완료한 학생은 <span className="final-snack-place">1층 교무실 김선미 선생님</span>께 찾아가 이 화면을 보여드리고 간식을 받아가세요.
        </p>
      </div>

      <div className="result-score-card">
        <div className="result-score-label">분리배출 게임 기록</div>
        <div className="result-score-main">
          <strong>{survey.game?.score || 0}</strong>
          <span>/ {survey.game?.maxScore || 0}점</span>
        </div>
        <div className="result-score-percent">정답률 {percent}%</div>
      </div>

      <div className="respondent-box">
        <strong>응답자 번호</strong>
        <p>{survey.respondentNo}</p>
      </div>
    </>
  );
}
