import { useEffect, useRef, useState } from "react";
import $ from "jquery";
import Info from "./components/Info";
import LoaderPage from "./components/Loader";
import { Howl } from "howler";
import { Popup } from "semantic-ui-react";


const doCurrency = (value,sign) => {
    let val = value?.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
    if(sign){
        return "$"+val;
    }
    return val;
};
const doCurrencyMil = (value, fix) => {
    let val;
    if (value < 1000) {
        val = doCurrency(parseFloat(value ).toFixed(fix || fix == 0 ? fix : 0),true) + "";
    } else {
        val = doCurrency(parseFloat(value / 1000).toFixed(fix || fix == 0 ? fix : 1)) + "K";
        val = val.replace(".0", "");
    }
    return val;
};
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
      timerRunningOut: new Howl({ src: ["/sounds/timer_running_out.mp3"], volume: 0.5,rate:0.4 }),
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
function useScale(rootId = "root", scaleId = "scale",gameID,gamesData,conn) {
   
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
      
        
        
        const target = 800-gHeight;
        let t = (800-target) / 2;
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
  }, [gameID,gamesData,conn]);
 
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
          //setTimeout(connect, delay);
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
    <div>
    <ul className="tilesWrap game-room" id="scale">
      {games.map((game, i) => {
        const players = (game.players || []).filter((p) => p.nickname).length;
        return (
         <li onClick={() => onSelect(game.id)} key={i}>
                                <h2>
                                    {players}/{game.seats}
                                </h2>
                                <h3>{game.id}</h3>
                                <p>
                                    Min Bet: {doCurrency(game.min,true )}
                                    <br />
                                    Max Bet: {doCurrency(game.min * 5,true)}
                                </p>
                                <button>Join Now</button>
                            </li>
        );
      })}
    </ul>
    </div>
  );
}

function Dealer({ dealer, last }) {
  return (
   <div id="dealer" className={dealer.cards.length > 1 && last === false ? "curdealer" : ""}>
                        <h1>DEALER</h1>
                        {dealer?.sum > 0 && (
                            <div id="dealerSum" className={dealer?.sum > 21 ? "result-lose result-bust counter" : "counter"}  data-sign="" data-count={dealer?.sum}>0</div>
                        )}
                        {dealer?.cards.length > 0 && (
                            <div className="dealer-cards" style={{ marginLeft: dealer?.cards.length * -45 }}>
                                <div className="visibleCards">
                                    {dealer?.cards.map(function (card, i) {
                                        var _dClass = "animate__flipInY";
                                        if (i === 1) {
                                            _dClass = "animate__flipInY";
                                        }
                                        return (
                                            <span key={i} className={_dClass + " animate__animated   dealerCardImg"}>
                                                <img className={" animate__animated dealerCardImg"} alt={card.suit + card.value.card} src={"/imgs/" + card.suit + card.value.card + ".svg"} />
                                            </span>
                                        );
                                    })}
                                    {dealer?.cards.length === 1 && (
                                        <>
                                            {dealer?.hiddencards.map(function (card, i) {
                                                var _dClass = "animate__flipInY";

                                                return (
                                                    <span key={i} className={_dClass + " animate__animated   dealerCardImg"}>
                                                        <img className={" animate__animated dealerCardImg"} alt={card.suit + card.value.card} src={"/imgs/" + card.suit + card.value.card + ".svg"} />
                                                    </span>
                                                );
                                            })}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
  );
}
const haveSideBet = (sideBets, nickname, seat, mode) => {
    if (sideBets.length === 0) {
        return false;
    }
    var _have = false;
    _have = sideBets.filter((sideBet) => sideBet?.seat === seat && sideBet?.mode === mode && sideBet?.nickname === nickname);
    if (_have.length > 0) {
        _have = _have[0]?.amount;
    } else {
        _have = false;
    }

    return _have;
};
const getAllBets = (sideBets, username, seat, mode) => {
    var userbet = sideBets.filter((sideBet) => sideBet.seat == seat && sideBet?.mode === mode && sideBet.nickname != username);

    return userbet;
};




function animateNum() {
    $('.counter').each(function () {
        var $this = $(this),
            sign = typeof $this.attr('data-sign') == 'undefined'?true:false,
            countTo = $this.attr('data-count'),
            countFrom = $this.attr('start-num') ? $this.attr('start-num') : parseInt($this.text().replace(/,/g, ""));


        if (countTo != countFrom && !$this.hasClass('doing')) {
            $this.attr('start-num', countFrom);
            // $this.addClass("doing");

            $({ countNum: countFrom }).animate({
                countNum: countTo
            },

                {

                    duration: 400,
                    easing: 'linear',

                    step: function () {
                        //$this.attr('start-num',Math.floor(this.countNum));
                        $this.text(doCurrency(Math.floor(this.countNum),sign));
                    },
                    complete: function () {
                        $this.text(doCurrency(this.countNum,sign));
                        $this.attr('start-num', Math.floor(this.countNum));
                        //$this.removeClass("doing");
                        //alert('finished');
                    }

                });


        } else {
            if ($this.hasClass('doing')) {
                $this.attr('start-num', countFrom);
                $this.removeClass("doing");
            } else {
                $this.attr('start-num', countFrom);
            }
        }
    });
}
var refresh;
const BlackjackGame = () => {
    const loc = typeof window !== "undefined" ? new URL(window.location) : { pathname: "/" };
  const pathArr = loc.pathname.toString().split("/").filter(Boolean);
  const auth = pathArr.length === 2 ? `${pathArr[0]}___${pathArr[1]}` : null;

  const defaultHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
  const protocol = defaultHost === "localhost" ? "ws" : "ws"; // keep ws; use wss if server supports
  //const WEB_URL = `${protocol}://${defaultHost}:8100/blackjack`;
const WEB_URL = `wss://server.usdtpoker.club/blackjack`;

  const [gamesData, setGamesData] = useState([]);
  const [gamesDataLive, setGamesDataLive] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState(0);
  const [gameDataLive, setGameDataLive] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [conn, setConn] = useState(false);
  const [gameTimer, setGameTimer] = useState(-1);
  const [lastMode, setLastMode] = useState(false);

  const sounds = useSounds();

  useScale("root", "scale",selectedGameId,gamesData.length,conn);

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
        setConn(true);
      }
      
    }

    if (method === "timer") {
      if (String(data.gameId) === String(selectedGameId)) {
        if (data.sec <= 9) {
            setLastMode(false);
            localStorage.removeItem(String(selectedGameId))
        
        }
        if (data.sec > 10) {
       sounds.current.timerRunningOut.stop();
        }
         if (data.sec === 10) {
        sounds.current.timerRunningOut.fade(0, 0.5, 2000);
          sounds.current.timerRunningOut.play();
        }
        if (data.sec == 3) {
    
          sounds.current.timerRunningOut.fade(0.5, 0, 4000);
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
      
      //setConn(true);
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
      sounds.current.timerRunningOut.stop();
    }
  }, [gamesData, selectedGameId, lastMode, gamesDataLive]);

  // when lastMode toggles or live change
  useEffect(() => {
    
    if (lastMode) {
      const saved = localStorage.getItem(String(selectedGameId));
      if (saved) setGameData(JSON.parse(saved));
    } else {
      setGameData(gameDataLive);
    }
  }, [lastMode, gameDataLive, selectedGameId]);
useEffect(() => {
        // console.log("gameId",gameId)
        if (lastMode) {
            $("body").css("background", "#252727");
        } else {
            if (selectedGameId === 0) {
                $("body").css("background", "#808b8eff").removeAttr("class");
            } else {

           
                if (selectedGameId === gamesData[0].id) {
                    $("body").css("background", "#388183").removeAttr("class").addClass("tabl1");
                }
                if (selectedGameId === gamesData[1].id) {
                    $("body").css("background", "#837538").removeAttr("class").addClass("tabl2");
                }
                if (selectedGameId === gamesData[2].id) {
                    $("body").css("background", "#723883").removeAttr("class").addClass("tabl3");
                }
                if (selectedGameId === gamesData[3].id) {
                    $("body").css("background", "#833838").removeAttr("class").addClass("tabl4");
                }
            }
        }
    }, [selectedGameId, lastMode, gamesData]);

  // basic guard (original had a redirect if top-level frame; we keep non-invasive behavior)
  useEffect(() => {
    if (typeof window !== "undefined") window.parent.postMessage("userget", "*");
    window.addEventListener("message", function (event) {
    if (event?.data?.username) {
        const payLoad = {
            method: "syncBalance",

            balance: event?.data?.balance,
        };
        try {
            send(payLoad);
        } catch (error) { }
    }
});
  }, []);
    
    useEffect(() => {
setTimeout(() => {
            animateNum()
        }, 100);
        //AppOrtion();
        setTimeout(() => {
            $(".tilesWrap li").hover(
                function () {
                    
                    
                    sounds.current.defaultClick.play();
                },
                function () {
                    // play nothing when mouse leaves chip
                }
            );
            $(".empty-slot i").hover(
                function () {
                    // console.log('hi');

                   sounds.current.actionClick.play();
                },
                function () {
                    // play nothing when mouse leaves chip
                }
            );
            $(".betButtons,.user-action").hover(
                function () {
                    // console.log('hi');

                   sounds.current.chipHover.play();
                },
                function () {
                    // play nothing when mouse leaves chip
                }
            );
        }, 100);
     
    }, [selectedGameId,gamesData.length]);
    useEffect(() => {
   $("#decision").show();
       
        setTimeout(() => {
            animateNum()
        }, 100);
    }, [gamesData,lastMode]);
    
    // Agar gaData nist, ye matn "Loading" neshan bede
   
  if (!gamesDataLive || !userData) return <LoaderPage />;
   if (!conn) return <LoaderPage errcon={true} />;

   if (!gameData || selectedGameId <= 0) {
    return <TableList games={gamesData} onSelect={
          id => setSelectedGameId(id)
        }/>;
  }
  var _countBet = 0;

    var _totalBet = 0;
    var _totalWin = 0;
    var _totalBetAll = 0;
    var _totalWinAll = 0;
const bets = gameData.players.filter((player) => player?.nickname === userData.nickname && player?.bet > 0);

    _countBet = bets.length;
    if (_countBet > 0) {
        _totalBet = bets.reduce((a, b) => a + (b["bet"] || 0), 0);
        _totalWin = bets.reduce((a, b) => a + (b["win"] || 0), 0);
    }
    const sbets = gameData.sideBets.filter((player) => player?.nickname === userData.nickname && player?.amount > 0);
    _totalBet = _totalBet + sbets.reduce((a, b) => a + (b["amount"] || 0), 0);
    _totalWin = _totalWin + sbets.reduce((a, b) => a + (b["win"] || 0), 0);

    const betsAll = gameData.players.filter((player) => player?.bet > 0);

    _totalBetAll = betsAll.reduce((a, b) => a + (b["bet"] || 0), 0);
    _totalWinAll = betsAll.reduce((a, b) => a + (b["win"] || 0), 0);

    const sbetsAll = gameData.sideBets.filter((player) => player?.amount > 0);
    _totalBetAll = _totalBetAll + sbetsAll.reduce((a, b) => a + (b["amount"] || 0), 0);
    _totalWinAll = _totalWinAll + sbetsAll.reduce((a, b) => a + (b["win"] || 0), 0);
   
    return (
        <>
            <span id="dark-overlay" className={gameData.gameOn && gameData.dealer.hiddencards.length > 0 && gameData.players[gameData.currentPlayer]?.nickname === userData?.nickname && gameData.players[gameData.currentPlayer]?.cards.length >= 2 && gameData.players[gameData.currentPlayer]?.sum < 21 ? "curplayer" : ""}></span>
            <div>
                <div className={lastMode ? "game-room last" : "game-room"} id="scale">
                    <div id="table-graphics"></div>

                    <Info setGameId={setSelectedGameId} gameId={selectedGameId} totalBetAll={_totalBetAll} totalWinAll={_totalWinAll} />
                    <div id="balance-bet-box">
                        <div className="balance-bet">
                            Balance
                            <div id="balance" className="counter" data-count={userData.balance}></div>
                        </div>
                        <div className="balance-bet">
                            Yout Bets
                            <div id="total-bet" className="counter" data-count={_totalBet}></div>
                        </div>
                        <div className="balance-bet">
                            Your Wins
                            <div id="total-bet" className="counter" data-count={_totalWin}></div>
                        </div>

                        {localStorage.getItem(selectedGameId)&& (
                            <div
                                className="balance-bet"
                                onMouseEnter={() => {
                                    setLastMode(true);
                                }}
                                onMouseLeave={() => {
                                    setLastMode(false);
                                }}
                            >
                                Show Last Hand
                            </div>
                        )}
                    </div>
                    <div id="volume-button">
                        <i className="fas fa-volume-up"></i>
                    </div>
                    {gameTimer >= 1 && !gameData.gameOn && gameData.gameStart && (
                        <div id="deal-start-label">
                            <p className="animate__bounceIn animate__animated animate__infinite" style={{ animationDuration: "1s" }}>
                                Waiting for bets <span>{gameTimer}</span>
                            </p>
                        </div>
                    )}

                    <Dealer dealer={gameData.dealer} last={lastMode} />

                    <div id="players-container">
                        {gameData.players.map(function (player, pNumber) {
                            var _resClass = "";
                            var _resCoinClass = "animate__slideInDown";
                            var _res = "";
                            if (gameData.dealer?.sum >= 17 && gameData.dealer?.sum <= 21 && gameData.dealer?.hasLeft) {
                                if (gameData.dealer?.sum > player.sum) {
                                    _res = "LOSE";
                                    _resClass = "result-lose";
                                    _resCoinClass = "animate__delay-1s animate__backOutUp animate__repeat-3";
                                }
                                if (gameData.dealer?.sum < player.sum) {
                                    _res = "WIN";
                                    _resClass = "result-win";
                                    _resCoinClass = "animate__delay-2s animate__bounceOutDown";
                                }
                                if (gameData.dealer?.sum === player.sum) {
                                    _res = "DRAW";
                                    _resClass = "result-draw";
                                }
                            }
                            if (gameData.dealer?.sum > 21 && gameData.dealer?.hasLeft) {
                                _res = "WIN";
                                _resClass = "result-win";
                                _resCoinClass = "animate__delay-2s animate__bounceOutDown";
                            }
                            if (player.sum > 21) {
                                _res = "🔥";
                                _resClass = "result-lose result-bust";
                                _resCoinClass = "animate__delay-1s animate__bounceOutUp animate__repeat-3";
                            }
                            if (player.blackjack && gameData.dealer?.sum !== 21) {
                                _res = "BJ";
                                _resClass = "result-blackjack";
                            }
                            var _renge = [gameData.min];
                            _renge.push(_renge[0] * 2);
                            _renge.push(_renge[0] * 5);
                            //_renge.push(_renge[0] * 8);
                            var sidePP = haveSideBet(gameData.sideBets, userData.nickname, pNumber, "PerfectPer");

                            var allBet = getAllBets(gameData.sideBets, player.nickname, pNumber, "PerfectPer");
                            var sidePPPlayer = haveSideBet(gameData.sideBets, player.nickname, pNumber, "PerfectPer");

                            var side213 = haveSideBet(gameData.sideBets, userData.nickname, pNumber, "21+3");
                            var side213layer = haveSideBet(gameData.sideBets, player.nickname, pNumber, "21+3");
                            var allBet21 = getAllBets(gameData.sideBets, player.nickname, pNumber, "21+3");
                            return (
                                <span className={player.bet ? (gameData.currentPlayer === pNumber && gameData.gameOn && gameData.dealer.hiddencards.length > 0 && lastMode === false ? "players curplayer" : "players " + _resClass) : "players"} key={pNumber} id={"slot" + pNumber}>
                                    {!player?.nickname ? (
                                        <>
                                            <div
                                                className={gameData.gameOn || gameData.min  > userData.balance || _countBet >= 3 || (gameTimer < 2 && gameData.gameStart) ? "empty-slot noclick" : "empty-slot"}
                                                onClick={() => {
                                                    sounds.current.clickFiller.play();
                                                    send({ method: "join", theClient: userData, gameId: gameData.id, seat: pNumber });
                                                }}
                                            >
                                                <i className="fas fa-user-plus"></i>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {!gameData.gameOn && !player.bet && player.nickname === userData.nickname && (
                                                <div id="bets-container">
                                                    <span className={gameTimer < 2 && gameTimer >= -1 && gameData.gameStart ? "animate__zoomOut animate__animated" : ""}>
                                                        <button className="betButtons  animate__faster animate__animated animate__zoomInUp" id={"chip"} onClick={() => send({ method: "leave", gameId: gameData.id, seat: pNumber })}>
                                                            X
                                                        </button>
                                                    </span>
                                                    {_renge.map(function (bet, i) {
                                                        if (bet  <= userData.balance) {
                                                            return (
                                                                <span key={i} className={gameTimer < 2 && gameTimer >= -1 && gameData.gameStart ? "animate__zoomOut animate__animated" : ""}>
                                                                    <button
                                                                        className="betButtons  animate__faster animate__animated animate__zoomInUp"
                                                                        id={"chip" + i}
                                                                        value={bet }
                                                                        onClick={() => {
                                                                            $("#slot" + pNumber + " .betButtons").addClass("noclick-nohide animate__zoomOut animate__animated");
                                                                           sounds.current.chipPlace.play();
                                                                            send({ method: "bet", amount: bet , theClient: userData, gameId: gameData.id, seat: pNumber });
                                                                        }}
                                                                    >
                                                                        {doCurrencyMil(bet )}
                                                                    </button>
                                                                </span>
                                                            );
                                                        } else {
                                                            return (
                                                                <span key={i} className={gameTimer < 2 && gameTimer >= -1 && gameData.gameStart ? "animate__zoomOut animate__animated" : ""}>
                                                                    <button className="betButtons  noclick noclick-nohide animate__faster animate__animated animate__zoomInUp" id={"chip" + i} value={bet }>
                                                                        {doCurrencyMil(bet )}
                                                                    </button>
                                                                </span>
                                                            );
                                                        }
                                                    })}
                                                </div>
                                            )}
                                            {player.bet > 0 && (
                                                <>
                                                    <div id="bets-container-left">
                                                        {_renge
                                                            .filter((bet, i) => i < 2)
                                                            .map((bet, i) => (
                                                                <span key={i} style={gameData.gameOn || sidePP ? { opacity: 0 } : { opacity: 1 }} className={gameTimer < 2 && gameTimer >= -1 && gameData.gameStart ? "animate__zoomOut animate__animated sides" : "sides"}>
                                                                    <button
                                                                        className={gameData.gameOn ? "betButtons  noclick animate__faster animate__animated animate__fadeOutDown" : sidePP ? "betButtons  noclick animate__faster animate__animated animate__fadeOutDown" : bet  > userData.balance || bet  > player.bet ? "betButtons  animate__faster animate__animated animate__zoomInUp noclick" : "betButtons  animate__faster animate__animated animate__zoomInUp"}
                                                                        id={"chip" + i}
                                                                        value={bet }
                                                                        onClick={() => {
                                                                            if (!gameData.gameOn) {
                                                                                $("#slot" + pNumber + "  #bets-container-left .sides .betButtons").addClass("noclick animate__faster animate__zoomOut animate__animated");
                                                                               sounds.current.chipPlace.play();
                                                                                send({ method: "sidebet", amount: bet , theClient: userData, gameId: gameData.id, seat: pNumber, mode: "PerfectPer" });
                                                                            }
                                                                        }}
                                                                    >
                                                                        {doCurrencyMil(bet )}
                                                                    </button>
                                                                </span>
                                                            ))}

                                                        <span className={player?.sideppx > 0 ? "winner" : ""}>
                                                            {player?.sideppx > 0 && <div className="bx-left"><div className="bets-side-win animate__animated animate__fadeInUp">x{player?.sideppx}</div></div>}
                                                            {sidePPPlayer ? (
                                                                <button className="betButtons  noclick animate__animated animate__rotateIn" id={"chip" + _renge.findIndex((bet) => bet === sidePPPlayer )}>
                                                                    {doCurrencyMil(sidePPPlayer)}
                                                                </button>
                                                            ) : (
                                                                <button onClick={() => $("#sidebetbtn").trigger("click")} className={player?.sideppx > 0 ? "betButtons place winner  animate__faster animate__animated animate__zoomInUp " : "betButtons place  animate__faster animate__animated animate__zoomInUp "}>
                                                                    Perfect
                                                                    <br />
                                                                    Pairs
                                                                </button>

                                                            )}
                                                            {allBet.length > 0 && (
                                                                <div className={"player-coin all"}>
                                                                    {allBet.map(function (player, pNumber) {
                                                                        return (
                                                                            <Popup
                                                                                key={pNumber}
                                                                                size="mini"
                                                                                inverted
                                                                                trigger={
                                                                                    <button className="betButtons  animate__animated animate__zoomInDown" style={{ animationDelay: (pNumber + 1) * 50 + "ms", left: pNumber * 5, top: (pNumber * -15) }} id={"chip" + _renge.findIndex((bet) => bet == player.amount )}>
                                                                                        {doCurrencyMil(player.amount)}
                                                                                    </button>
                                                                                }
                                                                                content={
                                                                                    <div style={{ minWidth: 120 }}>
                                                                                        <img src={"/imgs/avatars/" + player?.avatar + ".webp"} style={{ height: 30, marginRight: 10, float: "left" }} />
                                                                                        {player.nickname}
                                                                                        <br />
                                                                                        <small>{doCurrencyMil(player.amount)}</small>
                                                                                    </div>
                                                                                }
                                                                            />
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div id="bets-container-right">
                                                        {_renge
                                                            .filter((bet, i) => i < 2)
                                                            .map((bet, i) => (
                                                                <span key={i} style={gameData.gameOn || side213 ? { opacity: 0 } : { opacity: 1 }} className={gameTimer < 2 && gameTimer >= -1 && gameData.gameStart ? "animate__zoomOut animate__animated sides" : "sides"}>
                                                                    <button
                                                                        className={gameData.gameOn ? "betButtons  noclick animate__faster animate__animated animate__fadeOutDown" : side213 ? "betButtons  noclick animate__faster animate__animated animate__fadeOutDown" : bet  > userData.balance || bet  > player.bet ? "betButtons  animate__faster animate__animated animate__zoomInUp noclick" : "betButtons  animate__faster animate__animated animate__zoomInUp"}
                                                                        id={"chip" + i}
                                                                        value={bet }
                                                                        onClick={() => {
                                                                            if (!gameData.gameOn) {
                                                                                $("#slot" + pNumber + " #bets-container-right .sides .betButtons").addClass("noclick animate__faster animate__zoomOut animate__animated");
                                                                               sounds.current.chipPlace.play();
                                                                                send({ method: "sidebet", amount: bet , theClient: userData, gameId: gameData.id, seat: pNumber, mode: "21+3" });
                                                                            }
                                                                        }}
                                                                    >
                                                                        {doCurrencyMil(bet )}
                                                                    </button>
                                                                </span>
                                                            ))}
                                                        <span className={player?.side213x > 0 ? "winner" : ""}>
                                                            {player?.side213x > 0 && <div className="bx-right"><div className="bets-side-win animate__animated animate__fadeInUp">x{player?.side213x}</div></div>}
                                                            {side213layer ? (
                                                                <button className="betButtons  noclick animate__animated animate__rotateIn" id={"chip" + _renge.findIndex((bet) => bet === side213layer )}>
                                                                    {doCurrencyMil(side213layer)}
                                                                </button>
                                                            ) : (
                                                                <button onClick={() => $("#sidebetbtn").trigger("click")} className={player?.side213x > 0 ? "betButtons place winner animate__faster animate__animated animate__zoomInUp" : "betButtons place  animate__faster animate__animated animate__zoomInUp "}>
                                                                    21
                                                                    <br />+ 3
                                                                </button>
                                                            )}
                                                            {allBet21.length > 0 && (
                                                                <div className={"player-coin all right"}>
                                                                    {allBet21.map(function (player, pNumber) {
                                                                        return (
                                                                            <Popup
                                                                                key={pNumber}
                                                                                size="mini"
                                                                                inverted
                                                                                on='hover'
                                                                                trigger={
                                                                                    <button className="betButtons  animate__animated animate__zoomInDown" style={{ animationDelay: (pNumber + 1) * 50 + "ms", left: pNumber * -5, top: pNumber * -15 }} id={"chip" + _renge.findIndex((bet) => bet == player.amount )}>
                                                                                        {doCurrencyMil(player.amount)}
                                                                                    </button>
                                                                                }
                                                                                content={
                                                                                    <div style={{ minWidth: 120 }}>
                                                                                        <img src={"/imgs/avatars/" + player?.avatar + ".webp"} style={{ height: 30, marginRight: 10, float: "left" }} />
                                                                                        {player.nickname}
                                                                                        <br />
                                                                                        <small>{doCurrencyMil(player.amount)}</small>
                                                                                    </div>
                                                                                }
                                                                            />
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                            {gameData.gameOn && gameData.dealer.hiddencards.length > 0 && gameData.currentPlayer === pNumber && player.nickname === userData.nickname && player.cards.length >= 2 && player.sum < 21 ? (
                                                <div id="decision" className="user-action-container  animate__slideInUp animate__animated">
                                                    <div id="your-turn-label">MAKE A DECISION {gameTimer >= 0 && <span>{gameTimer}</span>}</div>

                                                    <div className="user-action-box">
                                                        <button
                                                            className="user-action"
                                                            id="stand"
                                                            onClick={() => {
                                                                $("#decision").hide();
                                                                $(".user-action").addClass("noclick-nohide");
                                                               sounds.current.actionClick.play();
                                                                send({ method: "stand", gameId: gameData.id, seat: pNumber });
                                                            }}
                                                        >
                                                            <i className="fas fa-hand-paper"></i>
                                                        </button>
                                                        <div className="user-action-text">STAND</div>
                                                    </div>
                                                    <div className="user-action-box">
                                                        <button
                                                            className="user-action"
                                                            id="hit"
                                                            onClick={() => {
                                                                $("#decision").hide();
                                                               sounds.current.actionClick.play();
                                                                send({ method: "hit", gameId: gameData.id, seat: pNumber });
                                                            }}
                                                        >
                                                            <i className="fas fa-hand-pointer"></i>
                                                        </button>
                                                        <div className="user-action-text">HIT</div>
                                                    </div>
                                                    {player.cards.length === 2 && userData.balance >= player.bet && (
                                                        <div className="user-action-box  hide-element">
                                                            <button
                                                                className="user-action"
                                                                id="doubleDown"
                                                                onClick={() => {
                                                                    $("#decision").hide();
                                                                    $(".user-action").addClass("noclick-nohide");
                                                                   sounds.current.actionClick.play();
                                                                    send({ method: "double", gameId: gameData.id, seat: pNumber });
                                                                }}
                                                            >
                                                                <i className="fas fa-hand-peace"></i>
                                                                <span>2X</span>
                                                            </button>
                                                            <div className="user-action-text">DOUBLE</div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className={gameData.currentPlayer === pNumber && gameData.gameOn && gameData.dealer.hiddencards.length > 0 ? "player-name highlight" : "player-name"}>
                                                    {player.nickname}
                                                    <span className="hide-element">
                                                        <img className="player-avatar" src={"/imgs/avatars/" + player.avatar + ".webp"} alt="avatar" />
                                                    </span>
                                                </div>
                                            )}

                                            {player.sum > 0 && <div className={gameData.currentPlayer === pNumber ? "current-player-highlight player-sum counter" : "player-sum counter " + _resClass} data-sign="" data-count={player.sum}>0</div>}
                                            {player.bet > 0 ? (
                                                <div className={"player-coin"}>
                                                    {player.isDouble ? (
                                                        <>
                                                            <button className="betButtons  noclick animate__animated animate__rotateIn" id={"chip" + _renge.findIndex((bet) => bet === player.bet / 2)}>
                                                                {doCurrencyMil(player.bet)}
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button className="betButtons  noclick animate__animated animate__rotateIn" id={"chip" + _renge.findIndex((bet) => bet === player.bet )}>
                                                            {doCurrencyMil(player.bet)}
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="player-coin animate__flipInX animate__animated">
                                                    <img className="player-avatar" src={"/imgs/avatars/" + player.avatar + ".webp"} alt="avatar" />
                                                </div>
                                            )}
                                            {_res && <div className={"player-result animate__animated animate__bounceIn " + _resClass}>{_res}</div>}

                                            <div className={"player-cards"}>
                                                {player.cards.map(function (card, i) {
                                                    return (
                                                        <span key={i} className={player.isDouble && i === 2 ? "animate__animated animate__slideInDown cardImg isdouble" : " animate__animated animate__slideInDown cardImg"}>
                                                            <img className={player.isDouble && i === 2 ? "animate__animated  animate__flipInX  cardImg card" + (i + 1) : " animate__animated  animate__flipInY  cardImg card" + (i + 1)} alt={card.suit + card.value.card} src={"/imgs/" + card.suit + card.value.card + ".svg"} />
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                    <div id="players-timer-container">
                                        <svg className="players-timer">
                                            <circle className={gameData.currentPlayer === pNumber && player?.nickname && gameData.gameOn && player?.sum < 21 && player?.bet > 0 && player.cards.length >= 2 && gameData.dealer.hiddencards.length > 0 ? "circle-animation" : ""} cx="48.5" cy="48.5" r="45" strokeWidth="10" fill="transparent" />
                                        </svg>
                                    </div>
                                </span>
                            );
                        })}
                    </div>
                </div>
                <span id="nicknameId" style={{ display: "none" }}>
                    {userData.nickname}
                </span>
            </div>
        </>
    );
    
    
};

export default BlackjackGame;
