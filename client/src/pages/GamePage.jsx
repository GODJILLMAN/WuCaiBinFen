import { useState, useRef, useEffect } from "react";
import { NavBar, Button } from "antd-mobile";
import PlayerRack from "../components/PlayerRack";
import PublicArea from "../components/PublicArea";
import QuestionPanel from "../components/QuestionPanel";
import QuestionHistory from "../components/QuestionHistory";
import GameResult from "../components/GameResult";
import { playClick, playWin, playLose } from "../utils/sound";

export default function GamePage({
  gameState,
  playerId,
  playerName,
  send,
  messages,
  onExit,
}) {
  const [selectedTileId, setSelectedTileId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showResult, setShowResult] = useState(true);
  const [marks, setMarks] = useState({});
  const [selectedColor, setSelectedColor] = useState(null);
  const autoMarkedRef = useRef(false);

  // Draggable FAB refs (use direct DOM manipulation for smoothness)
  const fabHistoryRef = useRef(null);
  const fabChatRef = useRef(null);
  const fabDragRef = useRef({
    dragging: null,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
    moved: false,
  });

  // Touch drag state
  const [dragNumber, setDragNumber] = useState(null);
  const [dragColor, setDragColor] = useState(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragTarget, setDragTarget] = useState(null); // index of declare input
  const longPressTimer = useRef(null);
  const isDragging = useRef(false);
  const justDragged = useRef(false);
  const declareRefs = useRef([]);

  const isMyTurn = gameState.currentPlayerId === playerId;
  const isDrawPhase = gameState.turnStep === "draw";
  const isEnded = gameState.phase === "ended";
  const myPlayer = gameState.players.find((p) => p.id === playerId);
  const otherPlayers = gameState.players.filter((p) => p.id !== playerId);

  // Play win/lose sound when game ends, and sync marks to server
  const endedRef = useRef(false);
  const marksSentRef = useRef(false);
  const [viewingPlayerId, setViewingPlayerId] = useState(null);
  useEffect(() => {
    if (isEnded && !endedRef.current) {
      endedRef.current = true;
      const isWinner = gameState.winner?.id === playerId;
      if (isWinner) {
        playWin();
      } else {
        playLose();
      }
    }
    if (!isEnded) {
      endedRef.current = false;
      marksSentRef.current = false;
      setViewingPlayerId(null);
    }
  }, [isEnded, gameState.winner, playerId]);

  // Send my marks to server when game ends
  useEffect(() => {
    if (isEnded && !marksSentRef.current) {
      marksSentRef.current = true;
      send("update_marks", { marks });
    }
  }, [isEnded, marks, send]);

  // Determine which marks to display (own or another player's)
  const displayMarks = isEnded && viewingPlayerId
    ? (gameState.allMarks?.find((m) => m.playerId === viewingPlayerId)?.marks || {})
    : marks;

  // Build my player data with tiles from myTiles (color always, number only when ended)
  const myPlayerData =
    myPlayer && gameState.myTiles
      ? { ...myPlayer, tiles: gameState.myTiles }
      : myPlayer;

  // Auto-exclude known tiles (public area + other players' tiles) when game starts
  useEffect(() => {
    if (autoMarkedRef.current) return;
    if (!gameState?.publicArea || !gameState?.players) return;
    if (gameState.phase === "ended") return;

    const knownNumbers = new Set();

    // Public area tiles
    gameState.publicArea.forEach((t) => knownNumbers.add(t.number));

    // Other players' tiles (they are visible to us)
    otherPlayers.forEach((p) => {
      p.tiles?.forEach((t) => knownNumbers.add(t.number));
    });

    if (knownNumbers.size > 0) {
      const newMarks = {};
      knownNumbers.forEach((n) => {
        newMarks[n] = true;
      });
      setMarks(newMarks);
      autoMarkedRef.current = true;
    }
  }, [gameState?.publicArea, gameState?.players, otherPlayers]);

  const handleDraw = () => {
    if (!selectedColor) return;
    send("draw_tile", { color: selectedColor });
  };

  // Reset selected color when turn changes
  useEffect(() => {
    if (!isDrawPhase) {
      setSelectedColor(null);
    }
  }, [isDrawPhase]);

  const handleTileSelect = (tileId) => {
    setSelectedTileId((prev) => (prev === tileId ? null : tileId));
  };

  const toggleMark = (num) => {
    setMarks((prev) => {
      const next = { ...prev };
      if (next[num]) {
        delete next[num];
      } else {
        next[num] = true;
        playClick();
      }
      return next;
    });
  };

  // History stack for undo: each entry is { type: 'click'|'swipe', tiles: [{num, wasMarked}] }
  const markHistoryRef = useRef([]);

  const pushHistory = (action) => {
    markHistoryRef.current.push(action);
  };

  const handleUndo = () => {
    const last = markHistoryRef.current.pop();
    if (!last) return;
    setMarks((prev) => {
      const next = { ...prev };
      last.tiles.forEach(({ num, wasMarked }) => {
        if (wasMarked) {
          next[num] = true;
        } else {
          delete next[num];
        }
      });
      return next;
    });
  };

  // Touch drag handlers for reasoning board tiles
  const touchStartRef = useRef({ x: 0, y: 0, time: 0, num: null, color: null });
  const swipeActiveRef = useRef(false);
  const swipedTilesRef = useRef(new Set());
  const swipeChangesRef = useRef([]); // [{num, wasMarked}] for this swipe

  const handleTouchStart = (num, color, e) => {
    if (isEnded) return;

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      num,
      color,
    };
    swipeActiveRef.current = false;
    swipedTilesRef.current = new Set();
    swipeChangesRef.current = [];

    // Only allow drag-to-declare for non-crossed-out tiles
    if (!marks[num]) {
      longPressTimer.current = setTimeout(() => {
        isDragging.current = true;
        setDragNumber(num);
        setDragColor(color);
        setDragPos({ x: touch.clientX, y: touch.clientY });
      }, 300);
    }
  };

  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    const start = touchStartRef.current;

    // Handle drag-to-declare (long press activated)
    if (isDragging.current && dragNumber !== null) {
      setDragPos({ x: touch.clientX, y: touch.clientY });
      let foundTarget = null;
      declareRefs.current.forEach((ref, idx) => {
        if (ref) {
          const rect = ref.getBoundingClientRect();
          if (
            touch.clientX >= rect.left &&
            touch.clientX <= rect.right &&
            touch.clientY >= rect.top &&
            touch.clientY <= rect.bottom
          ) {
            foundTarget = idx;
          }
        }
      });
      setDragTarget(foundTarget);
      e.preventDefault();
      return;
    }

    // Handle swipe-to-eliminate (before long-press fires)
    const deltaX = Math.abs(touch.clientX - start.x);
    const deltaY = Math.abs(touch.clientY - start.y);

    // If long-press timer is still running and movement is significant
    if (longPressTimer.current && (deltaX > 20 || deltaY > 20)) {
      // Clear long-press timer since user is swiping, not long-pressing
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;

      // Enter swipe-eliminate mode
      swipeActiveRef.current = true;
      // Mark first tile immediately if not already marked
      const firstNum = start.num;
      if (!marks[firstNum]) {
        swipeChangesRef.current.push({ num: firstNum, wasMarked: false });
        swipedTilesRef.current.add(firstNum);
        setMarks((prev) => ({ ...prev, [firstNum]: true }));
        playClick();
      } else {
        swipedTilesRef.current.add(firstNum);
      }
    }

    // Process swipe movement - mark all tiles as finger passes over
    if (swipeActiveRef.current) {
      e.preventDefault();
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (el) {
        const tileEl = el.closest(".reasoning-inline-cell");
        if (tileEl) {
          const numStr = tileEl.getAttribute("data-num");
          const num = parseInt(numStr, 10);
          if (num && !swipedTilesRef.current.has(num)) {
            swipedTilesRef.current.add(num);
            if (!marks[num]) {
              swipeChangesRef.current.push({ num, wasMarked: false });
              setMarks((prev) => ({ ...prev, [num]: true }));
              playClick();
            }
          }
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (isDragging.current && dragNumber !== null && dragTarget !== null) {
      window.dispatchEvent(
        new CustomEvent("tile-drop", {
          detail: { index: dragTarget, number: dragNumber },
        }),
      );
    }

    if (swipeActiveRef.current && swipeChangesRef.current.length > 0) {
      // Push swipe operation to history for undo
      pushHistory({ type: "swipe", tiles: [...swipeChangesRef.current] });
    }

    if (isDragging.current || swipeActiveRef.current) {
      justDragged.current = true;
      setTimeout(() => {
        justDragged.current = false;
      }, 100);
    }

    isDragging.current = false;
    swipeActiveRef.current = false;
    swipedTilesRef.current = new Set();
    swipeChangesRef.current = [];
    setDragNumber(null);
    setDragColor(null);
    setDragTarget(null);
  };

  const handleTouchCancel = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    // Revert swipe changes on cancel
    if (swipeActiveRef.current && swipeChangesRef.current.length > 0) {
      setMarks((prev) => {
        const next = { ...prev };
        swipeChangesRef.current.forEach(({ num, wasMarked }) => {
          if (wasMarked) {
            next[num] = true;
          } else {
            delete next[num];
          }
        });
        return next;
      });
    }
    isDragging.current = false;
    swipeActiveRef.current = false;
    swipedTilesRef.current = new Set();
    swipeChangesRef.current = [];
    setDragNumber(null);
    setDragColor(null);
    setDragTarget(null);
  };

  // Safe toggle mark (won't fire after a drag)
  const handleCellClick = (num) => {
    if (justDragged.current) return;
    const wasMarked = !!marks[num];
    pushHistory({ type: "click", tiles: [{ num, wasMarked }] });
    toggleMark(num);
  };

  // FAB drag handlers - direct DOM manipulation for smoothness
  const handleFabTouchStart = (fabKey, e) => {
    const touch = e.touches[0];
    const btnEl = fabKey === "history" ? fabHistoryRef.current : fabChatRef.current;
    if (!btnEl) return;

    fabDragRef.current = {
      dragging: fabKey,
      startX: touch.clientX,
      startY: touch.clientY,
      startLeft: 0,
      startTop: 0,
      moved: false,
      active: false, // whether we've entered drag mode
    };
  };

  const handleFabTouchMove = (e) => {
    if (!fabDragRef.current.dragging) return;

    const touch = e.touches[0];
    const { dragging, startX, startY, active } = fabDragRef.current;
    const btnEl = dragging === "history" ? fabHistoryRef.current : fabChatRef.current;
    if (!btnEl) return;

    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    // Only enter drag mode after threshold
    if (!active) {
      if (Math.abs(deltaX) <= 10 && Math.abs(deltaY) <= 10) {
        return; // still within tap range, let browser handle normally
      }
      // Enter drag mode
      fabDragRef.current.active = true;
      fabDragRef.current.moved = true;
      const rect = btnEl.getBoundingClientRect();
      fabDragRef.current.startLeft = rect.left;
      fabDragRef.current.startTop = rect.top;
      btnEl.style.transition = "none";
      btnEl.style.right = "auto";
      btnEl.style.bottom = "auto";
      btnEl.style.left = rect.left + "px";
      btnEl.style.top = rect.top + "px";
    }

    e.preventDefault();
    e.stopPropagation();

    const btnW = btnEl.offsetWidth;
    const btnH = btnEl.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let newLeft = fabDragRef.current.startLeft + deltaX;
    let newTop = fabDragRef.current.startTop + deltaY;

    // Boundary constraints
    newLeft = Math.max(8, Math.min(vw - btnW - 8, newLeft));
    newTop = Math.max(8, Math.min(vh - btnH - 8, newTop));

    btnEl.style.left = newLeft + "px";
    btnEl.style.top = newTop + "px";
  };

  const handleFabTouchEnd = (fabKey) => {
    if (fabDragRef.current.dragging !== fabKey) return;

    const moved = fabDragRef.current.moved;
    const btnEl = fabKey === "history" ? fabHistoryRef.current : fabChatRef.current;

    // Reset drag state
    fabDragRef.current = {
      dragging: null,
      startX: 0,
      startY: 0,
      startLeft: 0,
      startTop: 0,
      moved: false,
      active: false,
    };

    if (btnEl && moved) {
      btnEl.style.transition = "";
    }

    // If not moved, it's a tap — let the onClick handle it naturally
    // If moved, prevent the click from firing
    if (moved) {
      const preventClick = (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        btnEl.removeEventListener("click", preventClick, true);
      };
      btnEl.addEventListener("click", preventClick, true);
      setTimeout(() => btnEl.removeEventListener("click", preventClick, true), 300);
    }
  };

  // Register declare input refs for drop detection
  const setDeclareRef = (index, el) => {
    declareRefs.current[index] = el;
  };

  return (
    <div
      className="game-page"
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      <NavBar
        onBack={onExit}
        className="game-nav"
        right={
          <span className="nav-info">
            {isEnded
              ? `游戏结束，共${gameState.round}轮`
              : `第${gameState.round}轮 · 牌堆${gameState.drawPileCount}`}
          </span>
        }
      >
        五猜缤纷
      </NavBar>

      <div className="game-main">
        <div className="game-main-row">
          {/* Other players' racks */}
          <div className="game-others flex-1">
            {otherPlayers.map((p) => (
              <PlayerRack
                key={p.id}
                player={p}
                isMe={false}
                isCurrent={p.id === gameState.currentPlayerId}
                showTiles={true}
              />
            ))}
          </div>

          {/* My rack */}
          <div className="game-my-rack flex-1" style={{ marginLeft: 0 }}>
            <PlayerRack
              player={myPlayerData}
              isMe={true}
              isCurrent={isMyTurn}
              showTiles={isEnded}
            />
          </div>
        </div>

        {/* Public area */}
        <PublicArea
          publicArea={gameState.publicArea}
          selectedTileId={selectedTileId}
          onTileSelect={handleTileSelect}
          canSelect={isMyTurn && gameState.turnStep === "question" && !isEnded}
        />

        {/* Action area */}
        <div className="game-action">
          {isEnded ? (
            <div className="ended-action">
              <p className="ended-text">游戏已结束，可查看复盘</p>
              <Button
                block
                color="primary"
                size="large"
                onClick={() => setShowResult(true)}
                className="view-result-btn"
              >
                查看结果
              </Button>
            </div>
          ) : isMyTurn && isDrawPhase ? (
            <div className="draw-action">
              <p className="action-prompt">轮到你了！请选择颜色并抽牌</p>
              <div className="color-picker-row">
                {["green", "purple", "blue", "red", "orange"].map((c) => {
                  const isAvailable = (gameState.availableColors || []).includes(c);
                  const hex = {
                    red: "#e74c3c",
                    green: "#27ae60",
                    blue: "#3498db",
                    orange: "#e67e22",
                    purple: "#9b59b6",
                  }[c];
                  const label = {
                    red: "红",
                    green: "绿",
                    blue: "蓝",
                    orange: "橙",
                    purple: "紫",
                  }[c];
                  return (
                    <button
                      key={c}
                      className={`color-pick-btn ${selectedColor === c ? "color-pick-selected" : ""} ${!isAvailable ? "color-pick-disabled" : ""}`}
                      style={{
                        background: hex,
                        opacity: isAvailable ? 1 : 0.3,
                      }}
                      disabled={!isAvailable}
                      onClick={() => setSelectedColor(selectedColor === c ? null : c)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <Button
                block
                color="primary"
                size="large"
                onClick={handleDraw}
                disabled={!selectedColor}
                className="draw-btn"
              >
                {selectedColor ? `抽${{red:"红",green:"绿",blue:"蓝",orange:"橙",purple:"紫"}[selectedColor]}色牌` : "请选择颜色"}
              </Button>
            </div>
          ) : (
            <QuestionPanel
              gameState={gameState}
              playerId={playerId}
              send={send}
              selectedTileId={selectedTileId}
              onTileSelect={setSelectedTileId}
              setDeclareRef={setDeclareRef}
              dragTarget={dragTarget}
            />
          )}
        </div>
        {/* My Hand Colors - always visible */}
        <div className="my-hand-bar">
          <span className="my-hand-label">我的手牌</span>
          <div className="my-hand-colors">
            {gameState.myTiles?.map((tile, i) => {
              const COLOR_HEX = {
                red: "#e74c3c",
                green: "#27ae60",
                blue: "#3498db",
                orange: "#e67e22",
                purple: "#9b59b6",
              };
              return (
                <div
                  key={tile.id}
                  className="my-hand-tile"
                  style={{ background: COLOR_HEX[tile.color] || "#999" }}
                >
                  <span className="my-hand-index">
                    {isEnded && tile.number ? tile.number : ""}
                  </span>
                </div>
              );
            })}
          </div>
          <span className="my-hand-hint">（按数字从小到大）</span>
        </div>
        {/* Reasoning Board - fixed at bottom */}
        <div className="game-reasoning-inline">
          <div className="reasoning-inline-header">
            <span className="reasoning-inline-title">
              推理板
              {isEnded && viewingPlayerId && (
                <span className="reasoning-viewing-tag">
                  · {gameState.allMarks?.find((m) => m.playerId === viewingPlayerId)?.playerName || ""}
                </span>
              )}
            </span>
            {!isEnded && (
              <span className="reasoning-inline-hint">
                点击排除 · 滑动批量排除 · 长按拖动宣告
              </span>
            )}
            {isEnded ? (
              <div className="reasoning-player-switcher">
                {(gameState.allMarks || []).map((m) => (
                  <button
                    key={m.playerId}
                    className={`player-switch-btn ${(viewingPlayerId || playerId) === m.playerId ? "active" : ""}`}
                    onClick={() => setViewingPlayerId(m.playerId === playerId ? null : m.playerId)}
                  >
                    {m.playerName}
                    {m.playerId === playerId && " (我)"}
                  </button>
                ))}
              </div>
            ) : (
              <button
                className="reasoning-undo-btn"
                onClick={handleUndo}
                title="撤销"
              >
                撤销
              </button>
            )}
          </div>
          <div className="reasoning-inline-scroll">
            <div className="reasoning-inline-grid">
              {[
                { color: "green", start: 1 },
                { color: "purple", start: 2 },
                { color: "blue", start: 3 },
                { color: "red", start: 4 },
                { color: "orange", start: 5 },
              ].map((row) => {
                const numbers = [];
                for (let col = 0; col < 12; col++) {
                  numbers.push(row.start + col * 5);
                }
                const COLOR_HEX = {
                  red: "#e74c3c",
                  green: "#27ae60",
                  blue: "#3498db",
                  orange: "#e67e22",
                  purple: "#9b59b6",
                };
                return (
                  <div key={row.color} className="reasoning-inline-row">
                    {numbers.map((num) => {
                      const isCrossed = displayMarks[num] === true;
                      const dotCount =
                        num % 15 === 0
                          ? 3
                          : Math.floor(((num - 1) % 15) / 5) + 1;
                      const canEdit = !isEnded;
                      return (
                        <button
                          key={num}
                          data-num={num}
                          className={`reasoning-inline-cell ${isCrossed ? "crossed" : ""} ${dragNumber === num ? "dragging" : ""} ${!canEdit ? "readonly" : ""}`}
                          style={{
                            background: isCrossed
                              ? "#444"
                              : COLOR_HEX[row.color],
                          }}
                          draggable={canEdit && !isCrossed}
                          onDragStart={(e) => {
                            if (!canEdit) return;
                            e.dataTransfer.setData("number", num.toString());
                            e.dataTransfer.effectAllowed = "copy";
                          }}
                          onClick={() => canEdit && handleCellClick(num)}
                          onTouchStart={(e) =>
                            canEdit && handleTouchStart(num, row.color, e)
                          }
                        >
                          <span className="ri-cell-number">{num}</span>
                          <div className="ri-cell-dots">
                            {Array.from({ length: dotCount }).map((_, i) => (
                              <span key={i} className="ri-cell-dot" />
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Floating action buttons (draggable) */}
      <button
        ref={fabHistoryRef}
        className="game-fab game-fab-history game-fab-draggable"
        onClick={() => setShowHistory(true)}
        onTouchStart={(e) => handleFabTouchStart("history", e)}
        onTouchMove={handleFabTouchMove}
        onTouchEnd={() => handleFabTouchEnd("history")}
      >
        {/* <span className="fab-icon">💡</span> */}
        <span className="fab-label">线索</span>
      </button>
      <button
        ref={fabChatRef}
        className="game-fab game-fab-chat game-fab-draggable"
        onClick={() => setShowChat(true)}
        onTouchStart={(e) => handleFabTouchStart("chat", e)}
        onTouchMove={handleFabTouchMove}
        onTouchEnd={() => handleFabTouchEnd("chat")}
      >
        {/* <span className="fab-icon">💬</span> */}
        <span className="fab-label">聊天</span>
      </button>

      {/* Floating drag ghost (for touch drag) */}
      {dragNumber !== null && dragColor && (
        <div
          className="drag-ghost-tile"
          style={{
            left: dragPos.x - 20,
            top: dragPos.y - 25,
            background:
              {
                red: "#e74c3c",
                green: "#27ae60",
                blue: "#3498db",
                orange: "#e67e22",
                purple: "#9b59b6",
              }[dragColor] || "#999",
          }}
        >
          <span className="drag-ghost-number">{dragNumber}</span>
        </div>
      )}

      {/* Game Result overlay (dismissible for review) */}
      {isEnded && showResult && (
        <div className="panel-overlay result-overlay">
          <div
            className="panel-content result-content"
            onClick={(e) => e.stopPropagation()}
          >
            <GameResult
              gameState={gameState}
              playerId={playerId}
              send={send}
              onReview={() => setShowResult(false)}
            />
          </div>
        </div>
      )}

      {/* Question History overlay */}
      {showHistory && (
        <div className="panel-overlay" onClick={() => setShowHistory(false)}>
          <div className="panel-content" onClick={(e) => e.stopPropagation()}>
            <div className="panel-header">
              <span>线索历史</span>
              <button
                className="panel-close"
                onClick={() => setShowHistory(false)}
              >
                ×
              </button>
            </div>
            <div className="panel-body">
              <QuestionHistory gameState={gameState} />
            </div>
          </div>
        </div>
      )}

      {/* Chat overlay */}
      {showChat && (
        <div className="panel-overlay" onClick={() => setShowChat(false)}>
          <div className="panel-content" onClick={(e) => e.stopPropagation()}>
            <div className="panel-header">
              <span>聊天</span>
              <button
                className="panel-close"
                onClick={() => setShowChat(false)}
              >
                ×
              </button>
            </div>
            <div className="panel-body">
              <ChatPanel messages={messages} playerId={playerId} send={send} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChatPanel({ messages, playerId, send }) {
  const [input, setInput] = useState("");

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <p className="chat-empty">暂无消息，开始聊天吧！</p>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`chat-message ${msg.playerId === playerId ? "me" : "other"}`}
            >
              <span className="chat-sender">{msg.playerName}</span>
              <span className="chat-text">{msg.message}</span>
            </div>
          ))
        )}
      </div>
      <div className="chat-input-bar">
        <input
          type="text"
          placeholder="输入消息..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) {
              send("chat", { message: input.trim() });
              setInput("");
            }
          }}
          className="chat-input"
        />
        <Button
          color="primary"
          size="small"
          onClick={() => {
            if (input.trim()) {
              send("chat", { message: input.trim() });
              setInput("");
            }
          }}
        >
          发送
        </Button>
      </div>
    </div>
  );
}
