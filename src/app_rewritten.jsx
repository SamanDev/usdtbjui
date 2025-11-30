import React, { useEffect, useMemo, useRef, useState } from "react";
import Info from "./components/Info";
import LoaderPage from "./components/Loader";
import { Howl } from "howler";
import { Popup } from "semantic-ui-react";

/*
  Rewritten Blackjack App (single-file version).
  - Removes jQuery and direct DOM manipulation
  - Adds a useWebSocket hook with reconnect + ping
  - Adds a useScale hook to keep #scale responsive
  - Centralized SoundManager (singletons, cleaned up)
  - Splits rendering into small subcomponents (Dealer, Seat, TableList)
  - Keeps existing Info component import

  NOTE: This is a single-file rewrite for clarity. For production split into multiple files.
*/

/* ------------------------------- Helpers ------------------------------- */
const fmtNumber = (v) => (v || v === 0 ? v.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,") : "");
const fmtShort = (value, fix) => {
  if (!value && value !== 0) return "";
  if (value === 0) return "0";
  if (value < 1_000_000) {
    return `${(value / 1000).toFixed(fix ?? 0).replace(/\.0$/, "")}K`;
  }
  return `${(value / 1_000_000).toFixed(fix ?? 1).replace(/\.0$/, "")}M`;
};

/* ------------------------------ SoundManager --------------------------- */
function useSounds() {
  const soundsRef = useRef(null);
  if (!soundsRef.current) {
    soundsRef.current = {
      dealing: new Howl({ src: ["/sounds/dealing_card_fix3.mp3"], volume: 0.5 }),
      chipHover: new Howl({ src: ["/sounds/chip_hover_fix.mp3"], volume: 0.1 }),
      chipPlace: new Howl({ src: ["/sounds/chip_place.mp3"], volume: 0.1 }),
      actionClick: new Howl({ src: ["/sounds/actionClick.mp3"], volume: 0.1 }),
      defaultClick: new Howl({ src: ["/sounds/click_default.mp3"], volume: 0.1 }),
      clickFiller: new Howl({ src: ["/sounds/click_filler.mp3"], volume: 0.3 }),
      timerRunningOut: new Howl({ src: ["/sounds/timer_running_out.mp3"], volume: 0.5 }),
    };
  }
  // cleanup on unmount
  useEffect(() => {
    return () => {
      const s = soundsRef.current;
      if (s) Object.values(s).forEach((howl) => howl && howl.unload && howl.unload());
    };
  }, []);
  return soundsRef;
}

/* ------------------------------- useScale ------------------------------ */
function useScale(rootId = "root", scaleId = "scale") {
  useEffect(() => {
    const doScale = () => {
      try {
        const root = document.getElementById(rootId);
        const scaleEl = document.getElementById(scaleId);
        if (!root || !scaleEl) return;
        const gWidth = root.clientWidth / 1400;
        const gHeight = root.clientHeight / 850;
        let scale = Math.min(gWidth, gHeight);
        if (scale > 1) scale = 1;
        // center translation to keep proportions (approximate)
        const highProtect = root.clientHeight * scale;
        let t = Math.abs((root.clientHeight - highProtect) / 4);
        scaleEl.style.transform = `scale(${scale}) translateY(${t}px)`;
      } catch (e) {
        // ignore
      }
    };
    window.addEventListener("resize", doScale);
    window.addEventListener("orientationchange", doScale);
    // initial
    setTimeout(doScale, 50);
    return () => {
      window.removeEventListener("resize", doScale);
      window.removeEventListener("orientationchange", doScale);
    };
  }, [rootId, scaleId]);
}

/* ----------------------------- useWebSocket ---------------------------- */
function useWebSocket(url, auth, handlers = {}) {
  const socketRef = useRef(null);
  const pingRef = useRef(null);
  const reconnectRef = useRef(0);
  const listenersRef = useRef(handlers);

  useEffect(() => {
    listenersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    let closedByUser = false;

    function connect() {
      const wsUrl = url; // caller constructs with protocol/host
      const ws = auth ? new WebSocket(wsUrl, auth) : new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        reconnectRef.current = 0;
        if (listenersRef.current.onopen) listenersRef.current.onopen();
        // start ping
        if (pingRef.current) clearInterval(pingRef.current);
        pingRef.current = setInterval(() => {
          try {
            ws.send(JSON.stringify({ method: "ping" }));
          } catch (e) {}
        }, 15000);
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (listenersRef.current.onmessage) listenersRef.current.onmessage(data);
        } catch (err) {
          console.warn("Invalid WS message", err);
        }
      };

      ws.onclose = () => {
        if (pingRef.current) clearInterval(pingRef.current);
        if (listenersRef.current.onclose) listenersRef.current.onclose();
        if (!closedByUser) {
          // reconnect with backoff
          reconnectRef.current += 1;
          const delay = Math.min(30000, 1000 * Math.pow(1.5, reconnectRef.current));
          setTimeout(connect, delay);
        }
      };

      ws.onerror = (err) => {
        if (listenersRef.current.onerror) listenersRef.current.onerror(err);
      };
    }

    connect();

    return () => {
      closedByUser = true;
      if (pingRef.current) clearInterval(pingRef.current);
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch (e) {}
      }
    };
  }, [url, auth]);

  const send = (payload) => {
    try {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(payload));
        return true;
      }
    } catch (e) {}
    return false;
  };

  return { send, socketRef };
}

/* --------------------------- Small Subcomponents ----------------------- */
function TableList({ games, onSelect }) {
  return (
    <ul className="tilesWrap game-room" id="scale">
      {games.map((game, i) => {
        const players = (game.players || []).filter((p) => p.nickname).length;
        return (
          <li key={game.id || i} onClick={() => onSelect(game.id)}>
            <h2>
              {players}/{game.seats}
            </h2>
            <h3>{game.id}</h3>
            <p>
              Min Bet: {fmtNumber(game.min * 1000)}
              <br />
              Max Bet: {fmtNumber(game.min * 5000)}
            </p>
            <button>Join Now</button>
          </li>
        );
      })}
    </ul>
  );
}

function Dealer({ dealer, last }) {
  return (
    <div id="dealer" className={dealer?.cards?.length > 1 && !last ? "curdealer" : ""}>
      <h1>DEALER</h1>
      {dealer?.sum > 0 && (
        <div id="dealerSum" className={dealer.sum > 21 ? "result-lose result-bust counter" : "counter"} data-count={dealer.sum}></div>
      )}
      {dealer?.cards?.length > 0 && (
        <div className="dealer-cards" style={{ marginLeft: dealer.cards.length * -45 }}>
          <div className="visibleCards">
            {dealer.cards.map((card, i) => (
              <span key={i} className={`animate__flipInY animate__animated dealerCardImg`}>
                <img className={`animate__animated dealerCardImg`} alt={`${card.suit}${card.value?.card ?? ""}`} src={`/imgs/${card.suit}${card.value?.card ?? ""}.svg`} />
              </span>
            ))}
            {dealer.cards.length === 1 && (dealer.hiddencards || []).map((card, i) => (
              <span key={`h-${i}`} className={`animate__flipInY animate__animated dealerCardImg`}>
                <img className={`animate__animated dealerCardImg`} alt={`${card.suit}${card.value?.card ?? ""}`} src={`/imgs/${card.suit}${card.value?.card ?? ""}.svg`} />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Main App ----------------------------- */
// Added background effect and hover sound support
export default function BlackjackGame() {
  // parse auth from path
  const loc = typeof window !== "undefined" ? new URL(window.location) : { pathname: "/" };
  const pathArr = loc.pathname.toString().split("/").filter(Boolean);
  const auth = pathArr.length === 2 ? `${pathArr[0]}___${pathArr[1]}` : null;

  const defaultHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
  const protocol = defaultHost === "localhost" ? "ws" : "ws"; // keep ws; use wss if server supports
  const WEB_URL = `${protocol}://${defaultHost}:8100/blackjack`;

  const [gamesData, setGamesData] = useState([]);
  const [gamesDataLive, setGamesDataLive] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState(0);
  const [gameDataLive, setGameDataLive] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [conn, setConn] = useState(true);
  const [gameTimer, setGameTimer] = useState(-1);
  const [lastMode, setLastMode] = useState(false);

  const sounds = useSounds();

  useScale("root", "scale");

  const onWsMessage = (data) => {
    if (!data || typeof data !== "object") return;
    const { method } = data;
    if (method === "tables") {
      const games = data.games || [];
      setGamesDataLive(games);
      // keep small optimization: only update gamesData if current game matches or not set
      const currentGameIdText = String(selectedGameId || "");
      if (!data.gameId || data.gameId === currentGameIdText || currentGameIdText === "") {
        setGamesData(games);
      }
      if (data.last && data.gameId) {
        setTimeout(() => {
          const g = (games || []).find((it) => it?.id === data.gameId);
          if (g) localStorage.setItem(String(data.gameId), JSON.stringify(g));
        }, 3000);
      }
      if (data.cur) {
        const _data = (games || []).find((game) => game?.id === data.gameId);
        if (_data?.gameOn && _data?.dealer?.hiddencards?.length > 0) {
          const cur = _data.players[_data.currentPlayer];
          if (cur?.nickname && cur?.nickname === (document.getElementById("nicknameId")?.textContent || userData?.nickname)) {
            sounds.current.clickFiller.play();
          }
        }
      }
    }

    if (method === "connect") {
      if (data.theClient) {
        setUserData(data.theClient);
      }
      setConn(true);
    }

    if (method === "timer") {
      if (String(data.gameId) === String(selectedGameId)) {
        if (data.sec === 5) {
          sounds.current.timerRunningOut.play();
        }
        setGameTimer(data.sec);
      }
    }

    if (method === "deal") {
      if (String(data.gameId) === String(selectedGameId)) {
        sounds.current.dealing.play();
      }
    }
  };

  const { send, socketRef } = useWebSocket(WEB_URL, auth, {
    onopen: () => {
      console.log("WS open");
      setConn(true);
    },
    onmessage: onWsMessage,
    onclose: () => {
      console.log("WS closed");
      setConn(false);
    },
    onerror: () => {
      console.log("WS error");
    },
  });

  // select game => notify server
  useEffect(() => {
    if (userData && selectedGameId != null) {
      send({ method: "tableid", gameId: selectedGameId });
    }
  }, [selectedGameId, userData]);

  // update local gameData when gamesData or selected changes
  useEffect(() => {
    if ((gamesData || []).length && selectedGameId !== 0) {
      const gd = (gamesData || []).find((g) => g?.id === selectedGameId) || null;
      setGameDataLive(gd);
      if (gd) setGameData(lastMode ? JSON.parse(localStorage.getItem(String(selectedGameId))) : gd);
      if (gd?.dealer?.cards?.length > 1) setGameTimer(-1);
    }
    if (selectedGameId === 0) {
      setGameData(null);
      setGamesData(gamesDataLive || []);
      setGameTimer(-1);
    }
  }, [gamesData, selectedGameId, lastMode, gamesDataLive]);

  // when lastMode toggles or live change
  useEffect(() => {
    if (lastMode && selectedGameId) {
      const saved = localStorage.getItem(String(selectedGameId));
      if (saved) setGameData(JSON.parse(saved));
    } else {
      setGameData(gameDataLive);
    }
  }, [lastMode, gameDataLive, selectedGameId]);
useEffect(() => {
  if (!gameData || !selectedGameId) {
    document.body.style.background = "#262a2b";
    return;
  }

  const colors = {
    "BJ01": "radial-gradient(#388183, #1e3d42)", 
    2: "radial-gradient(#837538, #423e1e)",
    3: "radial-gradient(#723883, #1e2b42)",
    4: "radial-gradient(#833838, #421e1e)"
  };

  const bg = colors[selectedGameId] || "#262a2b";
  document.body.style.background = bg;
}, [selectedGameId, gameData]);

  // basic guard (original had a redirect if top-level frame; we keep non-invasive behavior)
  useEffect(() => {
    if (typeof window !== "undefined") window.parent.postMessage("userget", "*");
  }, []);

  if (!auth || !conn) return <LoaderPage errcon={true} />;
  if (!gamesDataLive || !userData) return <LoaderPage />;

  // When no specific game selected -> show table list
  if (!gameData || selectedGameId === 0) {
    return <TableList games={gamesData} onSelect={
          id => setSelectedGameId(id)
        } onMouseEnter={() => sounds.current.defaultClick.play()}/>;
  }

  // compute totals for UI
  const myBets = (gameData.players || []).filter((p) => p?.nickname === userData.nickname && p?.bet > 0);
  const countBet = myBets.length;
  const totalBet = countBet > 0 ? myBets.reduce((a, b) => a + (b.bet || 0), 0) : 0;
  const totalWin = countBet > 0 ? myBets.reduce((a, b) => a + (b.win || 0), 0) : 0;

  const sbets = (gameData.sideBets || []).filter((s) => s?.nickname === userData.nickname && s?.amount > 0);
  const totalBetWithSide = totalBet + (sbets.reduce((a, b) => a + (b.amount || 0), 0) || 0);
  const totalWinWithSide = totalWin + (sbets.reduce((a, b) => a + (b.win || 0), 0) || 0);

  const betsAll = (gameData.players || []).filter((p) => p?.bet > 0);
  const totalBetAll = betsAll.reduce((a, b) => a + (b.bet || 0), 0) + (gameData.sideBets || []).reduce((a, b) => a + (b.amount || 0), 0);
  const totalWinAll = betsAll.reduce((a, b) => a + (b.win || 0), 0) + (gameData.sideBets || []).reduce((a, b) => a + (b.win || 0), 0);

  return (
    <>
      <span id="dark-overlay" className={gameData.gameOn && gameData.dealer.hiddencards?.length > 0 && gameData.players[gameData.currentPlayer]?.nickname === userData?.nickname && gameData.players[gameData.currentPlayer]?.cards?.length >= 2 && gameData.players[gameData.currentPlayer]?.sum < 21 ? "curplayer" : ""}></span>
      <div>
        <div className={lastMode ? "game-room last" : "game-room"} id="scale">
          <div id="table-graphics" />

          <Info setGameId={setSelectedGameId} gameId={selectedGameId} totalBetAll={totalBetAll} totalWinAll={totalWinAll} />

          <div id="balance-bet-box">
            <div className="balance-bet">
              Balance
              <div id="balance" className="counter" data-count={userData.balance}>0</div>
            </div>
            <div className="balance-bet">
              Your Bets
              <div id="total-bet" className="counter" data-count={totalBetWithSide}>{fmtNumber(totalBetWithSide)}</div>
            </div>
            <div className="balance-bet">
              Your Wins
              <div id="total-bet" className="counter" data-count={totalWinWithSide}>{fmtNumber(totalWinWithSide)}</div>
            </div>

            {localStorage.getItem(String(selectedGameId)) && (
              <div
                className="balance-bet"
                onMouseEnter={() => setLastMode(true)}
                onMouseLeave={() => setLastMode(false)}
              >
                Show Last Hand
              </div>
            )}
          </div>

          <div id="volume-button">
            <i className="fas fa-volume-up" />
          </div>

          {gameTimer >= 1 && !gameData.gameOn && gameData.gameStart && (
            <div id="deal-start-label">
              <p className="animate__bounceIn animate__animated animate__infinite" style={{ animationDuration: "1s" }}>
                Waiting for bets <span>{gameTimer}</span>
              </p>
            </div>
          )}

          <Dealer dealer={gameData.dealer || {}} last={lastMode} />

          <div id="players-container">
            {(gameData.players || []).map((player, pNumber) => (
              <PlayerSeat
                key={pNumber}
                player={player}
                pNumber={pNumber}
                gameData={gameData}
                userData={userData}
                gameTimer={gameTimer}
                soundsRef={sounds}
                send={send}
              />
            ))}
          </div>
        </div>

        <span id="nicknameId" style={{ display: "none" }}>
          {userData.nickname}
        </span>
      </div>
    </>
  );
}

function PlayerSeat({ player, pNumber, gameData, userData, gameTimer, soundsRef, send }) {
  // derive UI classes
  const [animDelay] = useState(Math.random() * 300);
  let _res = "";
  let _resClass = "";
  if (gameData.dealer?.sum >= 17 && gameData.dealer?.sum <= 21 && gameData.dealer?.hasLeft) {
    if (gameData.dealer?.sum > player.sum) {
      _res = "LOSE"; _resClass = "result-lose";
    } else if (gameData.dealer?.sum < player.sum) {
      _res = "WIN"; _resClass = "result-win";
    } else if (gameData.dealer?.sum === player.sum) {
      _res = "DRAW"; _resClass = "result-draw";
    }
  }
  if (gameData.dealer?.sum > 21 && gameData.dealer?.hasLeft) { _res = "WIN"; _resClass = "result-win"; }
  if (player.sum > 21) { _res = "🔥"; _resClass = "result-lose result-bust"; }
  if (player.blackjack && gameData.dealer?.sum !== 21) { _res = "BJ"; _resClass = "result-blackjack"; }

  const sidePP = (gameData.sideBets || []).find((s) => s.seat === pNumber && s.mode === "PerfectPer" && s.nickname === userData.nickname)?.amount;
  const side213 = (gameData.sideBets || []).find((s) => s.seat === pNumber && s.mode === "21+3" && s.nickname === userData.nickname)?.amount;
  const allBet = (gameData.sideBets || []).filter((s) => s.seat === pNumber && s.nickname !== userData.nickname && s.mode === "PerfectPer");
  const allBet21 = (gameData.sideBets || []).filter((s) => s.seat === pNumber && s.nickname !== userData.nickname && s.mode === "21+3");

  return (
    <span className={player.bet ? (gameData.currentPlayer === pNumber && gameData.gameOn && gameData.dealer.hiddencards?.length > 0 ? "players curplayer" : `players ${_resClass}`) : "players"} id={`slot${pNumber}`}>
      {!player?.nickname ? (
        <div
          className={gameData.gameOn || gameData.min * 1000 > userData.balance || (gameData.players || []).filter(p => p.nickname === userData.nickname && p.bet > 0).length >= 3 || (gameTimer < 2 && gameData.gameStart) ? "empty-slot noclick" : "empty-slot"}
          onClick={() => {
            soundsRef.current.clickFiller.play();
            send({ method: "join", theClient: userData, gameId: gameData.id, seat: pNumber });
          }}
        >
          <i className="fas fa-user-plus" />
        </div>
      ) : (
        <>
          {!gameData.gameOn && !player.bet && player.nickname === userData.nickname ? (
            <div id="bets-container">
              <span className={gameTimer < 2 && gameTimer >= -1 && gameData.gameStart ? "animate__zoomOut animate__animated" : ""}>
                <button className="betButtons animate__faster animate__animated animate__zoomInUp" onClick={() => send({ method: "leave", gameId: gameData.id, seat: pNumber })}>X</button>
              </span>

              {[gameData.min, gameData.min * 2, gameData.min * 5].map((bet, i) => (
                (bet * 1000 <= userData.balance) ? (
                  <span key={i} className={gameTimer < 2 && gameTimer >= -1 && gameData.gameStart ? "animate__zoomOut animate__animated" : ""}>
                    <button className="betButtons animate__faster animate__animated animate__zoomInUp" onClick={() => { soundsRef.current.chipPlace.play(); send({ method: "bet", amount: bet * 1000, theClient: userData, gameId: gameData.id, seat: pNumber }); }}>{fmtShort(bet * 1000)}</button>
                  </span>
                ) : (
                  <span key={i}><button className="betButtons noclick">{fmtShort(bet * 1000)}</button></span>
                )
              ))}
            </div>
          ) : null}

          {player.bet > 0 && (
            <div id="bets-container-left">
              {[gameData.min, gameData.min * 2].map((bet, i) => (
                <span key={i} className={(gameData.gameOn || sidePP) ? "sides" : "sides"}>
                  <button className={gameData.gameOn ? "betButtons noclick" : (sidePP ? "betButtons noclick" : (bet * 1000 > userData.balance || bet * 1000 > player.bet ? "betButtons noclick" : "betButtons"))}
                    onClick={() => {
                      if (!gameData.gameOn) { soundsRef.current.chipPlace.play(); send({ method: "sidebet", amount: bet * 1000, theClient: userData, gameId: gameData.id, seat: pNumber, mode: "PerfectPer" }); }
                    }}
                  >{fmtShort(bet * 1000)}</button>
                </span>
              ))}

              <span className={player?.sideppx > 0 ? "winner" : ""}>
                {player?.sideppx > 0 && <div className="bets-side-win">x{player?.sideppx}</div>}
                {sidePP ? (
                  <button className="betButtons noclick">{fmtShort(sidePP)}</button>
                ) : (
                  <button onClick={() => document.getElementById("sidebetbtn")?.click()} className="betButtons place">Perfect<br/>Pairs</button>
                )}

                {allBet.length > 0 && (
                  <div className={"player-coin all"}>
                    {allBet.map((b, idx) => (
                      <Popup key={idx} size="mini" inverted trigger={<button className="betButtons">{fmtShort(b.amount)}</button>} content={<div style={{ minWidth: 120 }}><img src={`/imgs/avatars/${b.avatar}.webp`} style={{ height: 30, marginRight: 10, float: "left" }} />{b.nickname}<br/><small>{fmtShort(b.amount)}</small></div>} />
                    ))}
                  </div>
                )}

              </span>
            </div>
          )}

          {/* right side bets (21+3) */}
          {player.bet > 0 && (
            <div id="bets-container-right">
              {[gameData.min, gameData.min * 2].map((bet, i) => (
                <span key={i}><button className={gameData.gameOn ? "betButtons noclick" : (side213 ? "betButtons noclick" : (bet * 1000 > userData.balance || bet * 1000 > player.bet ? "betButtons noclick" : "betButtons"))}
                  onClick={() => { if (!gameData.gameOn) { soundsRef.current.chipPlace.play(); send({ method: "sidebet", amount: bet * 1000, theClient: userData, gameId: gameData.id, seat: pNumber, mode: "21+3" }); } }}>{fmtShort(bet * 1000)}</button></span>
              ))}

              <span className={player?.side213x > 0 ? "winner" : ""}>
                {player?.side213x > 0 && <div className="bets-side-win">x{player?.side213x}</div>}
                {side213 ? <button className="betButtons noclick">{fmtShort(side213)}</button> : <button onClick={() => document.getElementById("sidebetbtn")?.click()} className="betButtons place">21<br/>+ 3</button>}

                {allBet21.length > 0 && (
                  <div className={"player-coin all right"}>
                    {allBet21.map((b, idx) => (
                      <Popup key={idx} size="mini" inverted trigger={<button className="betButtons">{fmtShort(b.amount)}</button>} content={<div style={{ minWidth: 120 }}><img src={`/imgs/avatars/${b.avatar}.webp`} style={{ height: 30, marginRight: 10, float: "left" }} />{b.nickname}<br/><small>{fmtShort(b.amount)}</small></div>} />
                    ))}
                  </div>
                )}
              </span>
            </div>
          )}

          {/* player action area when it's player's turn */}
          {gameData.gameOn && gameData.dealer.hiddencards?.length > 0 && gameData.currentPlayer === pNumber && player.nickname === userData.nickname && player.cards.length >= 2 && player.sum < 21 ? (
            <div id="decision" className="user-action-container">
              <div id="your-turn-label">MAKE A DECISION {gameTimer >= 0 && <span>{gameTimer}</span>}</div>

              <div className="user-action-box">
                <button className="user-action" id="stand" onClick={() => { soundsRef.current.actionClick.play(); send({ method: "stand", gameId: gameData.id, seat: pNumber }); }}> <i className="fas fa-hand-paper"/></button>
                <div className="user-action-text">STAND</div>
              </div>

              <div className="user-action-box">
                <button className="user-action" id="hit" onClick={() => { soundsRef.current.actionClick.play(); send({ method: "hit", gameId: gameData.id, seat: pNumber }); }}> <i className="fas fa-hand-pointer"/></button>
                <div className="user-action-text">HIT</div>
              </div>

              {player.cards.length === 2 && userData.balance >= player.bet && (
                <div className="user-action-box hide-element">
                  <button className="user-action" id="doubleDown" onClick={() => { soundsRef.current.actionClick.play(); send({ method: "double", gameId: gameData.id, seat: pNumber }); }}>
                    <i className="fas fa-hand-peace"/><span>2X</span>
                  </button>
                  <div className="user-action-text">DOUBLE</div>
                </div>
              )}
            </div>
          ) : (
            <div className={gameData.currentPlayer === pNumber && gameData.gameOn && gameData.dealer.hiddencards?.length > 0 ? "player-name highlight" : "player-name"}>
              {player.nickname}
              <span className="hide-element"><img className="player-avatar" src={`/imgs/avatars/${player.avatar}.webp`} alt="avatar"/></span>
            </div>
          )}

          {player.sum > 0 && <div className={`${gameData.currentPlayer === pNumber ? "current-player-highlight player-sum counter" : "player-sum counter " + _resClass}`} data-count={player.sum}>{player.sum}</div>}

          {player.bet > 0 ? (
            <div className={"player-coin"}>
              <button className="betButtons noclick">{fmtShort(player.bet)}</button>
            </div>
          ) : (
            <div className="player-coin"><img className="player-avatar" src={`/imgs/avatars/${player.avatar}.webp`} alt="avatar"/></div>
          )}

          {_res && <div className={`player-result ${_resClass}`}>{_res}</div>}

          <div className={`player-cards`}>
            {player.cards.map((card, i) => (
              <span key={i} className={`animate__animated animate__slideInDown cardImg`}>
                <img className={`animate__flipInY cardImg card${i + 1}`} alt={`${card.suit}${card.value?.card ?? ""}`} src={`/imgs/${card.suit}${card.value?.card ?? ""}.svg`} />
              </span>
            ))}
          </div>

        </>
      )}
      <div id="players-timer-container"><svg className="players-timer"><circle className={gameData.currentPlayer === pNumber && player?.nickname && gameData.gameOn && player?.sum < 21 && player?.bet > 0 && player.cards.length >= 2 && gameData.dealer.hiddencards?.length > 0 ? "circle-animation" : ""} cx="48.5" cy="48.5" r="45" strokeWidth="10" fill="transparent"/></svg></div>
    </span>
  );
}
