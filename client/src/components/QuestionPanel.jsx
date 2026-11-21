import { useState, useEffect } from "react";
import { Button, Toast } from "antd-mobile";
import {
  COLORS,
  COLOR_LABELS,
  COLOR_HEX,
  QUESTION_TYPES,
  dotCountForNumber,
} from "../utils/constants";

export default function QuestionPanel({
  gameState,
  playerId,
  send,
  selectedTileId,
  onTileSelect,
  setDeclareRef,
  dragTarget,
}) {
  const [questionType, setQuestionType] = useState(QUESTION_TYPES.SORTING);
  const [selectedColor, setSelectedColor] = useState("red");

  const isMyTurn = gameState.currentPlayerId === playerId;
  const isQuestionPhase = gameState.turnStep === "question";
  const isAnswerPhase = gameState.turnStep === "answer";
  const isDeclarePhase = gameState.turnStep === "declare";

  if (!isMyTurn) {
    if (isAnswerPhase && gameState.currentQuestion) {
      const q = gameState.currentQuestion;
      const isAsker = q.askerId === playerId;
      if (isAsker) return null;

      return (
        <div className="question-panel">
          <p className="question-prompt">请回答问题：</p>
          <QuestionDisplay question={q} gameState={gameState} />
          <Button
            block
            color="primary"
            onClick={() => send("answer_question", { answer: "answer" })}
            className="answer-btn"
          >
            我来回答
          </Button>
        </div>
      );
    }

    if (isQuestionPhase) {
      return (
        <div className="question-panel">
          <p className="question-wait">
            {gameState.currentPlayerName} 正在提问...
          </p>
        </div>
      );
    }

    if (isDeclarePhase) {
      return (
        <div className="question-panel">
          <p className="question-wait">
            {gameState.currentPlayerName} 可以宣告 Got Five! 或跳过
          </p>
        </div>
      );
    }

    return (
      <div className="question-panel">
        <p className="question-wait">
          等待 {gameState.currentPlayerName} 抽牌...
        </p>
      </div>
    );
  }

  if (isDeclarePhase) {
    return (
      <DeclarePanel
        playerId={playerId}
        send={send}
        gameState={gameState}
        setDeclareRef={setDeclareRef}
        dragTarget={dragTarget}
      />
    );
  }

  if (isQuestionPhase) {
    const selectedTile = gameState.publicArea.find(
      (t) => t.id === selectedTileId,
    );

    return (
      <div className="question-panel">
        <p className="question-prompt">选择公开方块并提问</p>

        <div className="question-tile-hint">
          {selectedTile ? (
            <span>
              已选: {selectedTile.number} ({COLOR_LABELS[selectedTile.color]})
            </span>
          ) : (
            <span>请在上方公共区域选择一个方块</span>
          )}
        </div>

        <div className="question-type-tabs">
          <button
            className={`q-type-tab ${questionType === QUESTION_TYPES.SORTING ? "active" : ""}`}
            onClick={() => setQuestionType(QUESTION_TYPES.SORTING)}
          >
            {/* <span className="q-type-icon">↕</span> */}
            <span>排序线索</span>
          </button>
          <button
            className={`q-type-tab ${questionType === QUESTION_TYPES.DOT_COMPARISON ? "active" : ""}`}
            onClick={() => setQuestionType(QUESTION_TYPES.DOT_COMPARISON)}
          >
            {/* <span className="q-type-icon">●●</span> */}
            <span>点数比较</span>
          </button>
        </div>

        {questionType === QUESTION_TYPES.DOT_COMPARISON && (
          <div className="question-color-cards">
            <p className="question-color-label">选择你的隐藏方块颜色：</p>
            <div className="color-cards-row">
              {COLORS.map((color) => {
                const bg = COLOR_HEX[color];
                const isSelected = selectedColor === color;
                // Show a sample number with dots for visual reference
                const sampleNum =
                  color === "green"
                    ? 1
                    : color === "purple"
                      ? 2
                      : color === "blue"
                        ? 3
                        : color === "red"
                          ? 4
                          : 5;
                const dotCount = dotCountForNumber(sampleNum);
                return (
                  <button
                    key={color}
                    className={`color-card-btn ${isSelected ? "color-card-selected" : ""}`}
                    onClick={() => setSelectedColor(color)}
                    style={{
                      background: `linear-gradient(135deg, ${bg}, ${bg}dd)`,
                    }}
                  >
                    <span className="color-card-label">
                      {COLOR_LABELS[color]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="question-description">
          {questionType === QUESTION_TYPES.SORTING ? (
            <p>
              提问：「数字 {selectedTile?.number || "?"}{" "}
              在我的5个数字中排第几位？」
            </p>
          ) : (
            <p>
              提问：「我的{COLOR_LABELS[selectedColor]}色方块的点数，和数字{" "}
              {selectedTile?.number || "?"} 的点数相同吗？」
            </p>
          )}
        </div>

        <Button
          block
          color="primary"
          disabled={!selectedTileId}
          onClick={() => {
            if (!selectedTileId) {
              Toast.show("请先选择一个公开方块");
              return;
            }
            send("ask_question", {
              type: questionType,
              tileId: selectedTileId,
              color:
                questionType === QUESTION_TYPES.DOT_COMPARISON
                  ? selectedColor
                  : null,
            });
            onTileSelect(null);
          }}
        >
          提问
        </Button>
      </div>
    );
  }

  return null;
}

function QuestionDisplay({ question, gameState }) {
  const tile = gameState.publicArea.find((t) => t.id === question.tileId);
  const asker = gameState.players.find((p) => p.id === question.askerId);

  if (question.type === QUESTION_TYPES.SORTING) {
    return (
      <div className="question-display">
        <p className="question-text">
          {asker?.name} 问：数字 {tile?.number} 在我的5个数字中排第几位？
        </p>
        <p className="question-hint">
          查看该玩家的方块，计算数字 {tile?.number} 在其5个数字中的排序位置
        </p>
      </div>
    );
  }

  return (
    <div className="question-display">
      <p className="question-text">
        {asker?.name} 问：我的{COLOR_LABELS[question.color]}色方块的点数，和数字{" "}
        {tile?.number} 的点数相同吗？
      </p>
      <p className="question-hint">
        查看该玩家{COLOR_LABELS[question.color]}色方块的点数，与 {tile?.number}{" "}
        的点数比较是否相同
      </p>
    </div>
  );
}

function DeclarePanel({
  playerId,
  send,
  gameState,
  setDeclareRef,
  dragTarget,
}) {
  const [numbers, setNumbers] = useState(["", "", "", "", ""]);
  const [dragIndex, setDragIndex] = useState(null);

  const myColors = gameState.myTiles?.map((t) => t.color) || [];

  // Listen for touch-drop events from GamePage
  useEffect(() => {
    const handleTileDrop = (e) => {
      const { index, number } = e.detail;
      if (index >= 0 && index < 5 && number) {
        handleNumberChange(index, number.toString());
      }
    };
    window.addEventListener("tile-drop", handleTileDrop);
    return () => window.removeEventListener("tile-drop", handleTileDrop);
  }, []);

  const handleNumberChange = (index, value) => {
    setNumbers((prev) => {
      const newNums = [...prev];
      newNums[index] = value.replace(/[^0-9]/g, "").slice(0, 2);
      return newNums;
    });
  };

  const handleDrop = (index, e) => {
    e.preventDefault();
    setDragIndex(null);
    const num = e.dataTransfer.getData("number");
    if (num) {
      handleNumberChange(index, num);
    }
  };

  const handleDragOver = (index, e) => {
    e.preventDefault();
    setDragIndex(index);
  };

  const handleDragLeave = () => {
    setDragIndex(null);
  };

  // Determine which input is highlighted (from desktop drag or touch drag)
  const isHighlighted = (i) => dragIndex === i || dragTarget === i;

  const sortedNumbers = [...numbers]
    .map((n) => parseInt(n) || 0)
    .sort((a, b) => a - b);

  const handleSubmit = () => {
    const nums = numbers
      .map((n) => parseInt(n))
      .filter((n) => !isNaN(n) && n > 0);
    if (nums.length !== 5) {
      Toast.show("请输入5个数字（1-60）");
      return;
    }
    const sorted = [...nums].sort((a, b) => a - b);
    send("declare_got_five", { numbers: sorted });
  };

  return (
    <div className="question-panel declare-panel">
      <p className="question-prompt">Got Five! 宣告</p>
      <p className="declare-hint">
        按升序输入你的5个数字（可从推理板拖动数字填入）：
      </p>
      <div className="declare-inputs">
        {numbers.map((num, i) => (
          <div
            key={i}
            ref={(el) => setDeclareRef && setDeclareRef(i, el)}
            className={`declare-input-group ${isHighlighted(i) ? "drag-over" : ""}`}
            onDrop={(e) => handleDrop(i, e)}
            onDragOver={(e) => handleDragOver(i, e)}
            onDragLeave={handleDragLeave}
          >
            <span
              className="declare-color-dot"
              style={{
                background: myColors[i]
                  ? `var(--color-${myColors[i]}, #999)`
                  : "#999",
              }}
            />
            <input
              type="text"
              inputMode="numeric"
              placeholder="?"
              value={num}
              onChange={(e) => handleNumberChange(i, e.target.value)}
              className="declare-input"
            />
          </div>
        ))}
      </div>
      <div className="declare-actions">
        <Button
          color="primary"
          onClick={handleSubmit}
          className="declare-submit"
          style={{ flex: 1 }}
        >
          确认宣告
        </Button>
        <Button
          fill="outline"
          onClick={() => send("skip_declare")}
          style={{ flex: 1, background: "#ffffff" }}
        >
          跳过
        </Button>
      </div>
    </div>
  );
}
