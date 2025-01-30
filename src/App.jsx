import React, { useState, useEffect } from "react";
import $ from "jquery";
import Info from "./components/Info";
import LoaderPage from "./components/Loader";
import { Howl } from "howler";
import { Popup } from "semantic-ui-react";

let _auth = null;
const loc = new URL(window.location);
const pathArr = loc.pathname.toString().split("/");

if (pathArr.length === 3) {
    _auth = pathArr[1];
}
//_auth = "farshad-HangOver2";
//console.log(_auth);

//const WEB_URL = process.env.REACT_APP_MODE === "production" ? `wss://${process.env.REACT_APP_DOMAIN_NAME}/` : `ws://${loc.hostname}:3005/blackjack`;
const WEB_URL = `wss://mbj.usdtpoker.club/`;
//const WEB_URL = `ws://${loc.hostname}:8092`;

// (A) LOCK SCREEN ORIENTATION

const doSign = () => {
    
    return <></>;
};
const doCurrency = (value) => {
    var val = value?.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
    return val;
};
const doCurrencyMil = (value, fix) => {
    var val = value?.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
    return val;
    var val;
    if (value < 1000000) {
        val = doCurrency(parseFloat(value / 1000).toFixed(fix || fix === 0 ? fix : 0)) + "K";
    } else {
        val = doCurrency(parseFloat(value / 1000000).toFixed(fix || fix === 0 ? fix : 1)) + "M";
        val = val.replace(".0", "");
    }
    if (value === 0) {
        return 0;
    }
    return val;
};
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
const getAllBets = (sideBets,username,seat, mode) => {
    var userbet = sideBets.filter((sideBet) => sideBet.seat == seat  && sideBet?.mode === mode && sideBet.nickname != username);

    return userbet;
};
const AppOrtion = () => {
    var gWidth = $("#root").width() / 1400;
    var gHight = $("#root").height() / 850;
    var scale = gWidth<gHight?gWidth:gHight;
    var highProtect = $("#root").height() * scale;
    //console.log($("#root").width(),$("#root").height());
   // console.log(gWidth,gHight,scale);
   
    

    if (highProtect > 850) {
        //console.log(gWidth,gHight,highProtect);
        //gHight = $("#root").height() / 850;
        // scale = (scale + gHight)/2;
        scale = gHight;
        highProtect = $("#root").height() * scale;
        var _t = ($("#root").height() - highProtect)/4;
        if(_t<0){_t=_t*-1}
        
        if (scale < 1) {
            setTimeout(() => {
                $("#scale").css("transform", "scale(" + scale + ")");
            }, 10);
        } else {
            scale = 1;
            setTimeout(() => {
                $("#scale").css("transform", "scale(" + scale + ") translateY("+_t+"px)");
            }, 10);
        }
    } else {
       // gHight = $("#root").height() / 850;
        // scale = (scale + gHight)/2;
      //  scale = gHight;
      var _t = ($("#root").height() - highProtect)/4;
   if(_t<0){_t=_t*-1}
        if (scale < 1) {
            
            setTimeout(() => {
                $("#scale").css("transform", "scale(" + scale + ") translateY("+_t+"px)");
            }, 10);
        } else {
            scale = 1;
            setTimeout(() => {
                $("#scale").css("transform", "scale(" + scale + ") translateY("+_t+"px)");
            }, 10);
        }
    }

    // console.log(gWidth,highProtect,gHight,scale)
};
const socket = new WebSocket(WEB_URL, _auth);
window.addEventListener("message", function (event) {
    if (event?.data?.username) {
        const payLoad = {
            method: "syncBalance",

            balance: event?.data?.balance,
        };
        try {
            socket.send(JSON.stringify(payLoad));
        } catch (error) {}
    }
});
var supportsOrientationChange = "onorientationchange" in window,
    orientationEvent = supportsOrientationChange ? "orientationchange" : "resize";

window.addEventListener(
    orientationEvent,
    function () {
        AppOrtion();
    },
    false
);
window.parent.postMessage("userget", "*");

if (window.self === window.top) {
    //window.location.href = "https://www.google.com/";
}
let dealingSound = new Howl({
    src: ["/sounds/dealing_card_fix3.mp3"],
    volume: 0.5,
});
let chipHover = new Howl({
    src: ["/sounds/chip_hover_fix.mp3"],
    volume: 0.1,
});
let chipPlace = new Howl({
    src: ["/sounds/chip_place.mp3"],
    volume: 0.1,
});
let actionClick = new Howl({
    src: ["/sounds/actionClick.mp3"],
    volume: 0.1,
});
let defaultClick = new Howl({
    src: ["/sounds/click_default.mp3"],
    volume: 0.1,
});
let clickFiller = new Howl({
    src: ["/sounds/click_filler.mp3"],
    volume: 0.3,
});
let timerRunningOut = new Howl({
    src: ["/sounds/timer_running_out.mp3"],
    volume: 0.5,
});

// let youWin = new Howl({
//   src: ['/sounds/you_win.mp3']
// });
// let youLose = new Howl({
//   src: ['/sounds/you_lose.mp3']
// });
function getSum(pNumber) {
    var mysum = 0;
    var haveAce = false;
    $("#slot" + pNumber)
        .find(".player-cards")
        .find("img:visible")
        .each(function () {
            var _val = $(this).attr("val");
            if (typeof _val === "object" && _val !== null) {
                haveAce = true;
                _val = _val[0];
            }
            
            mysum = mysum + parseInt(_val);
        });
        if (haveAce) {
            if (mysum + 10 <= 21) {
                mysum = mysum + 10;
            }
        }
    return mysum;
}

function animateNum(){
    $('.counter').each(function() {
        var $this = $(this),
            countTo = $this.attr('data-count'),
            countFrom= $this.attr('start-num')?$this.attr('start-num'):parseInt($this.text().replace(/,/g,""));
            
            if(countTo!=countFrom && !$this.hasClass('doing')) {
                $this.attr('start-num',countFrom);
            // $this.addClass("doing");

        $({ countNum: countFrom}).animate({
          countNum: countTo
        },
      
        {
      
          duration: 400,
          easing:'linear',
          
           step: function() {
             //$this.attr('start-num',Math.floor(this.countNum));
             $this.text(doCurrency(Math.floor(this.countNum)));
           },
          complete: function() {
            $this.text(doCurrency(this.countNum));
            $this.attr('start-num',Math.floor(this.countNum));
            //$this.removeClass("doing");
            //alert('finished');
          }
      
        });  
        
        
    }else{
        if($this.hasClass('doing')) {
            $this.attr('start-num',countFrom);
        $this.removeClass("doing");
        }else{
            $this.attr('start-num',countFrom);
        }
    }
      });
}
const BlackjackGame = () => {
    var _countBet = 0;

    var _totalBet = 0;
    var _totalWin = 0;
    var _totalBetAll = 0;
    var _totalWinAll = 0;
    const [gamesData, setGamesData] = useState([]);

    const [gamesDataLive, setGamesDataLive] = useState([]);
    const [gameData, setGameData] = useState(null); // Baraye zakhire JSON object

    const [gameDataLive, setGameDataLive] = useState(null); // Baraye zakhire JSON object
    const [userData, setUserData] = useState(null);

    const [last, setLast] = useState(false);

    const [conn, setConn] = useState(true);
    const [gameId, setGameId] = useState(0);
    const [gameTimer, setGameTimer] = useState(-1);

    useEffect(() => {
        // Event onopen baraye vaghti ke websocket baz shode

        socket.onopen = () => {
            console.log("WebSocket connected");
        };

        // Event onmessage baraye daryaft data az server
        socket.onmessage = (event) => {
            const data = JSON.parse(event.data); // Parse kardan JSON daryafti
            //console.log("Game data received: ", data);
            if (data.method === "tables") {
                setGamesDataLive(data.games);
                if (data.gameId === $("#gameId").text() || $("#gameId").text() === "") {
                    setGamesData(data.games);

                    // Update kardan state
                }
                if (data.last) {
                    setTimeout(() => {
                        var _data = data.games.filter((game) => game?.id === data.gameId)[0];
                        localStorage.setItem(data.gameId, JSON.stringify(_data));
                    }, 3000);
                }
                if (data.cur) {
                    var _data = data.games.filter((game) => game?.id === data.gameId)[0];
                    if (_data.gameOn && _data.dealer.hiddencards.length > 0 && _data.players[_data.currentPlayer]?.nickname === $("#nicknameId").text() && _data.players[_data.currentPlayer]?.cards.length >= 2 && _data.players[_data.currentPlayer]?.sum < 21) {
                        clickFiller.play();
                    }
                }
                
            }
            if (data.method === "connect") {
                if (data.theClient?.balance >= 0) {
                    setUserData(data.theClient);
                } else {
                    setUserData(data.theClient);
                    // setConn(false);
                    //_auth = null;
                }
                // Update kardan state
            }
            if (data.method === "timer") {
                if (data.gameId === $("#gameId").text()) {
                    if (data.sec === 5) {
                        timerRunningOut.play();
                    }
                    setGameTimer(data.sec); // Update kardan state
                }
            }
            if (data.method === "deal") {
                if (data.gameId === $("#gameId").text()) {
                    dealingSound.play();
                }
              
            }
           
        };

        // Event onclose baraye vaghti ke websocket baste mishe
        socket.onclose = () => {
            console.log("WebSocket closed");
            setConn(false);
            _auth = null;
        };

        // Cleanup websocket dar zamane unmount kardan component
        return () => {
            // socket.close();
        };
    }, []);
    useEffect(() => {
        // console.log("gameId",gameId)
        if (last) {
            $("body").css("background", "radial-gradient(#252727, #262a2b)");
        } else {
            if (gameId === 0) {
                $("body").css("background", "#262a2b");
            } else {
                if (gameId === gamesData[0].id) {
                    $("body").css("background", "radial-gradient(#388183, #1e3d42)").removeAttr("class").addClass("tabl1");
                }
                if (gameId === gamesData[1].id) {
                    $("body").css("background", "radial-gradient(#837538, #423e1e)").removeAttr("class").addClass("tabl2");
                }
                if (gameId === gamesData[2].id) {
                    $("body").css("background", "radial-gradient(#723883, #1e2b42)").removeAttr("class").addClass("tabl3");
                }
                if (gameId === gamesData[3].id) {
                    $("body").css("background", "radial-gradient(#833838, #421e1e)").removeAttr("class").addClass("tabl4");
                }
            }
        }
    }, [gameId, last, gamesData]);
    useEffect(() => {
        if (gamesData.length && gameId !== 0) {
            var _data = gamesData.filter((game) => game?.id === gameId)[0];
            setGameDataLive(_data);
            
            $("#decision").show();
            if (!last) {
                setGameData(_data);
            }
            if (_data.dealer?.cards.length > 1) {
                setGameTimer(-1);
            }
        }
        if (gameId === 0) {
            setGameData(null);
            setGamesData(gamesDataLive);
            setGameTimer(-1);
        }
        AppOrtion();
        setTimeout(() => {
            $(".tilesWrap li").hover(
                function () {
                    defaultClick.play();
                },
                function () {
                    // play nothing when mouse leaves chip
                }
            );
            $(".empty-slot i").hover(
                function () {
                    // console.log('hi');

                    actionClick.play();
                },
                function () {
                    // play nothing when mouse leaves chip
                }
            );
            $(".betButtons,.user-action").hover(
                function () {
                    // console.log('hi');

                    chipHover.play();
                },
                function () {
                    // play nothing when mouse leaves chip
                }
            );
        }, 100);
        setTimeout(() => {
            animateNum()
        }, 100);
    }, [gamesData, gameId, last]);
    useEffect(() => {
        if (last) {
            setGameData(JSON.parse(localStorage.getItem(gameId)));
        } else {
            setGameData(gameDataLive);
        }
       
       
    }, [last, gameDataLive, gameId]);
    // Agar gaData nist, ye matn "Loading" neshan bede
    if (_auth === null || !conn) {
        return <LoaderPage errcon={true} />;
    }
    if (!gamesData || !userData) {
        return <LoaderPage />;
    }

    if (gameId === 0 || !gameData) {
        return (
            <div>
                <ul className="tilesWrap" id="scale">
                    {gamesData.map(function (game, i) {
                        var _players = game.players.filter((player) => player.nickname).length;
                        //console.log(_players);

                        return (
                            <li onClick={() => setGameId(game.id)} key={i}>
                                <h2>
                                    {_players}/{game.seats}
                                </h2>
                                <h3>{game.id}</h3>
                                <p>
                                    Min Bet: {doCurrency(game.min)}<small>$</small>
                                    <br />
                                    Max Bet: {doCurrency(game.min * 5)}<small>$</small>
                                </p>
                                <button>Join Now</button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        );
    }
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
                <div className={last ? "game-room last" : "game-room"} id="scale">
                    <div id="table-graphics"></div>

                    <Info setGameId={setGameId} gameId={gameId} totalBetAll={_totalBetAll} totalWinAll={_totalWinAll} />
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

                        {localStorage.getItem(gameId) && (
                            <div
                                className="balance-bet"
                                onMouseEnter={() => {
                                    setLast(true);
                                }}
                                onMouseLeave={() => {
                                    setLast(false);
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

                    <div id="dealer" className={gameData.dealer.cards.length > 1 && last === false ? "curdealer" : ""}>
                        <h1>DEALER</h1>
                        {gameData.dealer?.sum > 0 && (
                            <div id="dealerSum" className={gameData.dealer?.sum > 21 ? "result-lose result-bust counter" : "counter"}  data-count={gameData.dealer?.sum}>
                                
                            </div>
                        )}
                        {gameData.dealer?.cards.length > 0 && (
                            <div className="dealer-cards" style={{ marginLeft: gameData.dealer?.cards.length * -45 }}>
                                <div className="visibleCards">
                                    {gameData.dealer?.cards.map(function (card, i) {
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
                                    {gameData.dealer?.cards.length === 1 && (
                                        <>
                                            {gameData.dealer?.hiddencards.map(function (card, i) {
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
                                <span className={player.bet ? (gameData.currentPlayer === pNumber && gameData.gameOn && gameData.dealer.hiddencards.length > 0 && last === false ? "players curplayer" : "players " + _resClass) : "players"} key={pNumber} id={"slot" + pNumber}>
                                    {!player?.nickname ? (
                                        <>
                                            <div
                                                className={gameData.gameOn || gameData.min > userData.balance || _countBet >= 3 || (gameTimer < 2 && gameData.gameStart) ? "empty-slot noclick" : "empty-slot"}
                                                onClick={() => {
                                                    clickFiller.play();
                                                    socket.send(JSON.stringify({ method: "join", theClient: userData, gameId: gameData.id, seat: pNumber }));
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
                                                        <button className="betButtons  animate__faster animate__animated animate__zoomInUp" id={"chip"} onClick={() => socket.send(JSON.stringify({ method: "leave", gameId: gameData.id, seat: pNumber }))}>
                                                            X
                                                        </button>
                                                    </span>
                                                    {_renge.map(function (bet, i) {
                                                        if (bet <= userData.balance) {
                                                            return (
                                                                <span key={i} className={gameTimer < 2 && gameTimer >= -1 && gameData.gameStart ? "animate__zoomOut animate__animated" : ""}>
                                                                    <button
                                                                        className="betButtons  animate__faster animate__animated animate__zoomInUp"
                                                                        id={"chip" + i}
                                                                        value={bet}
                                                                        onClick={() => {
                                                                            $("#slot" + pNumber + " .betButtons").addClass("noclick-nohide animate__zoomOut animate__animated");
                                                                            chipPlace.play();
                                                                            socket.send(JSON.stringify({ method: "bet", amount: bet, theClient: userData, gameId: gameData.id, seat: pNumber }));
                                                                        }}
                                                                    >
                                                                        {doCurrencyMil(bet)}{doSign()}
                                                                    </button>
                                                                </span>
                                                            );
                                                        } else {
                                                            return (
                                                                <span key={i} className={gameTimer < 2 && gameTimer >= -1 && gameData.gameStart ? "animate__zoomOut animate__animated" : ""}>
                                                                    <button className="betButtons  noclick noclick-nohide animate__faster animate__animated animate__zoomInUp" id={"chip" + i} value={bet}>
                                                                        {doCurrencyMil(bet)}{doSign()}
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
                                                                        className={gameData.gameOn ? "betButtons  noclick animate__faster animate__animated animate__fadeOutDown" : sidePP ? "betButtons  noclick animate__faster animate__animated animate__fadeOutDown" : bet > userData.balance || bet > player.bet ? "betButtons  animate__faster animate__animated animate__zoomInUp noclick" : "betButtons  animate__faster animate__animated animate__zoomInUp"}
                                                                        id={"chip" + i}
                                                                        value={bet}
                                                                        onClick={() => {
                                                                            if(!gameData.gameOn){
                                                                            $("#slot" + pNumber + "  #bets-container-left .sides .betButtons").addClass("noclick animate__faster animate__zoomOut animate__animated");
                                                                            chipPlace.play();
                                                                            socket.send(JSON.stringify({ method: "sidebet", amount: bet, theClient: userData, gameId: gameData.id, seat: pNumber, mode: "PerfectPer" }));
                                                                            }
                                                                        }}
                                                                    >
                                                                        {doCurrencyMil(bet)}{doSign()}
                                                                    </button>
                                                                </span>
                                                            ))}

                                                        <span className={player?.sideppx > 0 ? "winner" : ""}>
                                                            {player?.sideppx > 0 && <div className="bets-side-win animate__animated animate__fadeInUp">x{player?.sideppx}</div>}
                                                            {sidePPPlayer ? (
                                                                        <button className="betButtons  noclick animate__animated animate__rotateIn" id={"chip" + _renge.findIndex((bet) => bet === sidePPPlayer)}>
                                                                            {doCurrencyMil(sidePPPlayer)}{doSign()}
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
                                                        <button className="betButtons  animate__animated animate__zoomInDown" style={{ animationDelay: (pNumber + 1) * 50 + "ms", left: pNumber * 5, top: (pNumber * -15) }} id={"chip" + _renge.findIndex((bet) => bet == player.amount)}>
                                                            {doCurrencyMil(player.amount)}{doSign()}
                                                        </button>
                                                    }
                                                    content={
                                                        <div style={{minWidth:120}}>
                                                            <img src={"/imgs/avatars/" + player?.avatar + ".webp"} style={{ height: 30, marginRight: 10, float: "left" }} />
                                                            {player.nickname}
                                                            <br />
                                                            <small>{doCurrencyMil(player.amount)}{doSign()}</small>
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
                                                                        className={gameData.gameOn ? "betButtons  noclick animate__faster animate__animated animate__fadeOutDown" : side213 ? "betButtons  noclick animate__faster animate__animated animate__fadeOutDown" : bet > userData.balance || bet > player.bet ? "betButtons  animate__faster animate__animated animate__zoomInUp noclick" : "betButtons  animate__faster animate__animated animate__zoomInUp"}
                                                                        id={"chip" + i}
                                                                        value={bet}
                                                                        onClick={() => {
                                                                            if(!gameData.gameOn){
                                                                            $("#slot" + pNumber + " #bets-container-right .sides .betButtons").addClass("noclick animate__faster animate__zoomOut animate__animated");
                                                                            chipPlace.play();
                                                                            socket.send(JSON.stringify({ method: "sidebet", amount: bet, theClient: userData, gameId: gameData.id, seat: pNumber, mode: "21+3" }));
                                                                            }
                                                                        }}
                                                                    >
                                                                        {doCurrencyMil(bet)}{doSign()}
                                                                    </button>
                                                                </span>
                                                            ))}
                                                        <span className={player?.side213x > 0 ? "winner" : ""}>
                                                            {player?.side213x > 0 && <div className="bets-side-win animate__animated animate__fadeInUp">x{player?.side213x}</div>}
                                                            {side213layer ? (
                                                                        <button className="betButtons  noclick animate__animated animate__rotateIn" id={"chip" + _renge.findIndex((bet) => bet === side213layer)}>
                                                                            {doCurrencyMil(side213layer)}{doSign()}
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
                                                        <button className="betButtons  animate__animated animate__zoomInDown" style={{ animationDelay: (pNumber + 1) * 50 + "ms", left: pNumber * -5, top: pNumber * -15 }} id={"chip" + _renge.findIndex((bet) => bet == player.amount)}>
                                                            {doCurrencyMil(player.amount)}{doSign()}
                                                        </button>
                                                    }
                                                    content={
                                                        <div style={{minWidth:120}}>
                                                            <img src={"/imgs/avatars/" + player?.avatar + ".webp"} style={{ height: 30, marginRight: 10, float: "left" }} />
                                                            {player.nickname}
                                                            <br />
                                                            <small>{doCurrencyMil(player.amount)}{doSign()}</small>
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
                                                                actionClick.play();
                                                                socket.send(JSON.stringify({ method: "stand", gameId: gameData.id, seat: pNumber }));
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
                                                                actionClick.play();
                                                                socket.send(JSON.stringify({ method: "hit", gameId: gameData.id, seat: pNumber }));
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
                                                                    actionClick.play();
                                                                    socket.send(JSON.stringify({ method: "double", gameId: gameData.id, seat: pNumber }));
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

                                            {player.sum > 0 && <div className={gameData.currentPlayer === pNumber ? "current-player-highlight player-sum counter" : "player-sum counter " + _resClass}  data-count={player.sum}></div>}
                                            {player.bet > 0 ? (
                                                <div className={"player-coin"}>
                                                    {player.isDouble ? (
                                                        <>
                                                            <button className="betButtons  noclick animate__animated animate__rotateIn" id={"chip" + _renge.findIndex((bet) => bet === player.bet / 2000)}>
                                                                {doCurrencyMil(player.bet)}{doSign()}
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button className="betButtons  noclick animate__animated animate__rotateIn" id={"chip" + _renge.findIndex((bet) => bet === player.bet)}>
                                                            {doCurrencyMil(player.bet)}{doSign()}
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
