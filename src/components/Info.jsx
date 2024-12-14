import React from "react";
import { ModalContent, Button, Icon, Modal } from "semantic-ui-react";

const doCurrency = (value) => {
  var val = value?.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
  return val;
};
const doCurrencyMil = (value, fix) => {
  var val;
  if (value < 1000000) {
      val = doCurrency(parseFloat(value / 1000).toFixed(fix || fix === 0 ? fix : 0)) + "K";
  } else {
      val = doCurrency(parseFloat(value / 1000000).toFixed(fix || fix === 0 ? fix : 1)) + "M";
      val = val.replace(".0", "");
  }
  if(value===0){return 0}
  return val;
};
const ModalExampleScrollingContent = (prop) => {
    const [open, setOpen] = React.useState(false);

    return (
        <span id="leave-button">
            <Button basic inverted color="grey" size="mini" style={{ position: "relative", marginBottom: 10 }} onClick={() => prop.setGameId(0)} icon labelPosition="left">
                <Icon name="arrow left" />
                EXIT <span id="gameId">{prop.gameId}</span>
            </Button>
            <Modal
                open={open}
                onClose={() => setOpen(false)}
                onOpen={() => setOpen(true)}
                size="tiny"
                trigger={
                    <Button basic inverted color="grey" size="mini" style={{ position: "relative", display: "block" }} id="sidebetbtn" icon labelPosition="left">
                        <Icon name="info" />
                        SIDE BETS
                    </Button>
                }
            >
                <ModalContent scrolling>
                    <article >
                        <h2 id="perfect-pairs-blackj">Perfect Pairs Blackjack Side Bet</h2>
                        <p>What is Perfect Pairs in Blackjack? The Perfect Pairs side bet uses the player’s cards only and pays out if you are dealt two of a kind as follows:</p>
                        <p>Mixed pair (two of the same value but different suits and colors) – pays 5:1</p>
                        <img className="content-img"  src="/imgs/info/bac55199ac.jpg" alt="mp" />
                        <p>Colored pair (two of the same value and the same color) – pays 12:1</p>
                        <img className="content-img"  src="/imgs/info/bac45939d7.jpg" alt="cp" />
                        <p>Perfect pair (two of the same card) – pays 25:1</p>
                        <img className="content-img"  src="/imgs/info/babf3ee265.jpg" alt="pp" />
                        <hr />
                        <h2 id="21-3-blackjack-side">21+3 Blackjack Side Bet</h2>
                        <p>What is 21+3 in Blackjack? The 21+3 side bet involves the player’s two cards and the upturned card of the dealer. It will pay out for a number of different combinations:</p>
                        <p>
                            <b>Flush</b> – (all cards are suited) – pays 5:1
                        </p>
                        <img className="content-img"  src="/imgs/info/bb73be49dc.jpg" alt="Flush" />
                        <p>
                            <b>Straight</b> – (all cards consecutive) – pays 10:1
                        </p>
                        <img className="content-img"  src="/imgs/info/bb808e9616.jpg" alt="straight" />
                        <p>
                            <b>Three of a kind</b> – (not the same suit) – pays 30:1
                        </p>
                        <img className="content-img"  src="/imgs/info/bb91b7b5d5.jpg" alt="3" />
                        <p>
                            <b>Straight flush</b> – (consecutive cards same suit) – pays 40:1
                        </p>
                        <img className="content-img"  src="/imgs/info/bb980b0d92.jpg" alt="straight flush" />
                        <p>
                            <b>Suited triple</b> – (three of the same card) – pays 100:1
                        </p>
                        <img className="content-img"  src="/imgs/info/bb9d24813a.jpg" alt="suited triple" />
                    </article>
                </ModalContent>
            </Modal>
            <div id="balance-bet-box" style={{top:80, right: -33}}>
            <div className="balance-bet">
                        Total Bets
                       <div id="total-bet" className="counter" data-count={prop.totalBetAll}></div>
                    </div>
                    <div className="balance-bet">
                        Total Wins
                        <div id="total-bet" className="counter" data-count={prop.totalWinAll}></div>
                   
                    </div></div>
        </span>
    );
};

export default ModalExampleScrollingContent;
