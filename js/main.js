/*----- imports -----*/
import { CARDS, ROLE_ATTACK, ROLE_DEFEND, ATTACK_CARD, DEFEND_CARD } from './constants.js'


/*----- state variables -----*/
let game;
let currentPlayers = 0;

/*----- cached elements  -----*/
const messageHeader = document.querySelector(".Message");
const playArea = document.querySelector(".PlayArea");
const player1Hand = document.querySelector(".Player1Hand");
const player2Hand = document.querySelector(".Player2Hand");
const player1EndTurn = document.querySelector("#Player1EndTurn")
const player2EndTurn = document.querySelector("#Player2EndTurn")
const player1title = document.querySelector(".Player1HandContainer > h1")
const player2title = document.querySelector(".Player2HandContainer > h1")


/*----- event listeners -----*/
player1EndTurn.addEventListener("click", clickEndTurn)
player2EndTurn.addEventListener("click", clickEndTurn)

/*----- Classes -----*/
class Game {
    constructor() {
        this.deck = this.shuffle(CARDS);
        this.closer = this.determineCloser();
        this.defenderIndex = null;
        this.firstAttackerIndex = null;
        this.currentAttackerIndex = null;
        this.playerTurnIndex = null;
        this.players = [];
        this.endGame = false;
    }
    shuffle(cards) {
        let cardsArray = Object.values(cards);
        for (let i = cardsArray.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [cardsArray[i], cardsArray[j]] = [cardsArray[j], cardsArray[i]];
        }
        return cardsArray;
    }
    deal(player, num) {
        for (let i = 0; i < num && this.deck.length > 0; i++) {
            player.addCard(this.deck.shift());
        }
    }
    determineCloser() {
        const vals = Object.values(this.deck);
        return vals[vals.length - 1].suit;
    }
    setDefender(playerIndex) {
        this.defenderIndex = playerIndex;
    }
    playToDefender() {
        if(this.endGame && this.players[this.currentAttackerIndex].handEl.children.length === 0){
            this.players[this.currentAttackerIndex].exit();
            // this.currentAttackerIndex = this.getNextAttackerIndex();
        }
        this.playerTurnIndex = this.defenderIndex;
        renderButtons();
    }
    playByDefender() {
        if(this.endGame && this.players[this.defenderIndex].handEl.children.length === 0) {
            this.players[this.defenderIndex].exit();
        }
        this.playerTurnIndex = this.currentAttackerIndex;
        renderButtons();
    }
    getNextAttackerIndex(){
        //TO-DO - Multiplayer
    }
    endTurn() {
        // TO-DO: Logic for multiplayer
        this.endRound(this.playerTurnIndex === this.firstAttackerIndex)
    }
    endRound(triggeredByAttacker) {
        const atk = this.players[Number(!this.defenderIndex)];
        const def = this.players[this.defenderIndex];
        if (!triggeredByAttacker) {
            let cards = getCardsInPlayArea();
            for (let i = 0; i < cards.length; i++) {
                def.addCard(this.makeCard(cards[i]));
            }
        }
        clearPlayArea();
        this.deal(atk, 6 - atk.getNumberOfCards());
        this.deal(def, 6 - def.getNumberOfCards());
        if (this.deck.length === 0) this.endGame = true;
        this.changeRoles(!triggeredByAttacker);
        renderHandTitles();
    }
    changeRoles(defenderPickedUp) {
        // The defender becomes an attacker
        this.players[this.defenderIndex].swapRole();
        // Increment the Defender and First Attacker indices
        this.defenderIndex += 1;
        this.firstAttackerIndex += 1;

        // If the previous defender picked up, skip over them as the first attacker
        if (defenderPickedUp) {
            this.defenderIndex += 1;
            this.firstAttackerIndex += 1;
        }

        // Wrap around to the beginning of the array if needed
        if (this.defenderIndex >= this.players.length) this.defenderIndex -= this.players.length;
        if (this.firstAttackerIndex >= this.players.length) this.firstAttackerIndex -= this.players.length;

        // Set the first attacker for the round as the current attacker to start
        this.currentAttackerIndex = this.firstAttackerIndex;

        // Set the defender's role
        this.players[this.defenderIndex].swapRole();

        // Set the starting turn of the round to the first attacker
        this.playerTurnIndex = this.firstAttackerIndex;

        // Update the UI
        renderHandTitles();
    }
    startGame() {
        // Choose a random player as the first attacker
        this.firstAttackerIndex = Math.floor(Math.random() * this.players.length);
        // Set the defender as the next player, wrapping around if the first attacker is the final player
        this.defenderIndex = this.firstAttackerIndex + 1;
        if (this.defenderIndex >= this.players.length) this.defenderIndex = 0;
    }
    playerExited(playerIndex) {
        this.players[playerIndex].exited = true;
        let playersRemaining = 0;
        let playersRemainingIndexes = [];
        for (let i = 0; i < this.players.length; i++) {
            if (!this.players[i].exited) {
                playersRemaining++;
                playersRemainingIndexes.push(i)
            }
        }
        if (playersRemaining === 1) {
            player1Hand.classList.add("hidden");
            player1title.classList.add("hidden");
            player2Hand.classList.add("hidden");
            player2title.classList.add("hidden");
            player1EndTurn.classList.add("hidden");
            player2EndTurn.classList.add("hidden");
            messageHeader.innerText = `Player ${playersRemainingIndexes[0] + 1} loses!`
        }
    }
    makeCard(img) {
        return {
            rank: getRank(img.classList),
            suit: getSuit(img.classList),
            src: new URL(img.src).pathname
        }
    }
}

class Player {
    constructor(handEl, buttonEl, role, index) {
        this.handEl = handEl;
        this.buttonEl = buttonEl;
        this.role = role;
        this.playerIndex = index;
        this.exited = false;
    }
    setAttack() {
        this.role = ROLE_ATTACK
    }
    setDefend() {
        this.role = ROLE_DEFEND
    }
    setHandEl() { }
    addCard(card) {
        const newCardEl = document.createElement("img");
        newCardEl.src = card.src;
        newCardEl.id = card.id;
        newCardEl.classList.add(`rank-${card.rank}`);
        newCardEl.classList.add(`suit-${card.suit}`);
        newCardEl.classList.add('Card');
        newCardEl.classList.add(this.role)
        newCardEl.style.margin = "0px 5px 0px 5px"
        this.handEl.appendChild(newCardEl);
    }
    getNumberOfCards() {
        return this.handEl.children.length;
    }
    exit() {
        game.playerExited(this.playerIndex);
    }
    swapRole() {
        this.role = this.role === ROLE_ATTACK ? ROLE_DEFEND : ROLE_ATTACK;
        for (let i = 0; i < this.handEl.children.length; i++) {
            this.handEl.children[i].classList.toggle("ATTACK")
            this.handEl.children[i].classList.toggle("DEFEND")
        }
    }
}

class Computer extends Player {
    constructor() {
        super()
    }
}

/*----- functions -----*/
function init() {
    game = new Game();
    messageHeader.innerHTML = `Closer: <span style="color:${["hearts", "diamonds"].includes(game.closer) ? "red" : "black"}">${game.closer.slice(0, 1).toUpperCase()}${game.closer.slice(1)}</span>`;
    let player1 = new Player(player1Hand, player1EndTurn, ROLE_ATTACK, currentPlayers);
    game.players.push(player1);
    game.deal(player1, 6);
    game.firstAttackerIndex = currentPlayers;
    game.currentAttackerIndex = currentPlayers;
    game.playerTurnIndex = currentPlayers;
    let player2 = new Player(player2Hand, player2EndTurn, ROLE_DEFEND, ++currentPlayers);
    game.players.push(player2);
    game.setDefender(1);
    game.deal(player2, 6);
}

init();

function renderButtons() {
    for (let i = 0; i < game.players.length; i++) {
        renderButton(game.players[i])
    }
}

function renderButton(player) {
    if (game.playerTurnIndex === player.playerIndex) player.buttonEl.classList.remove("hidden");
    else player.buttonEl.classList.add("hidden");
}

function renderHandTitles() {
    player1title.innerText = game.players[0].role === ROLE_ATTACK ? "ATTACKER HAND" : "DEFENDER HAND";
    player2title.innerText = game.players[1].role === ROLE_ATTACK ? "ATTACKER HAND" : "DEFENDER HAND";
}

function currentRanksInPlay(cardEls) {
    const ranks = [];
    for (let i = 0; i < cardEls.length; i++) {
        let cardStack = cardEls[i];
        for (let j = 0; j < cardStack.children.length; j++) {
            ranks.push(getRank([...cardStack.children[j].classList]))
        }
    }
    return ranks;
}

function getCardsInPlayArea() {
    const cards = [];
    for (let i = 0; i < playArea.children.length; i++) {
        let cardStack = [...playArea.children[i].children];
        for (let k = 0; k < cardStack.length; k++) {
            cards.push(cardStack[k])
        }
    }
    return cards;
}

function getRank(classes) {
    return Number([...classes].find(className => className.startsWith("rank-")).split('-')[1]);
}

function getSuit(classes) {
    return [...classes].find(className => className.startsWith("suit-")).split('-')[1];
}

function getRole(classes) {
    return [...classes].find(role => role === ROLE_ATTACK || role === ROLE_DEFEND) || null;
}

function getAreaPlayedType(areaPlayed) {
    return [...areaPlayed.classList].find(playArea => playArea === "PlayArea" || playArea === ATTACK_CARD) || null;
}


function isCardValid(role, areaPlayed, cardPlayed, playedOn) {
    const areaPlayedType = getAreaPlayedType(areaPlayed);
    if (role === ROLE_ATTACK && areaPlayedType === "PlayArea") {
        const empty = areaPlayed.children.length === 0;
        if (empty) return true;
        const lessThanMax = areaPlayed.children.length < 6;
        const currentRanks = currentRanksInPlay(areaPlayed.children);
        const matchesRank = currentRanks.includes(getRank(cardPlayed.classList));
        return lessThanMax && matchesRank;
    } else if (role === ROLE_DEFEND && areaPlayedType === ATTACK_CARD) {
        const openCard = areaPlayed.children.length === 1;
        if (!openCard) return false;
        const sameSuit = getSuit(cardPlayed.classList) === getSuit(playedOn.classList);
        const higherRank = getRank(cardPlayed.classList) > getRank(playedOn.classList);
        if (sameSuit && higherRank) return true;
        const playedClosingSuit = getSuit(cardPlayed.classList) === game.closer;
        const playedOnClosingSuit = getSuit(playedOn.classList) === game.closer;
        if (!playedOnClosingSuit && playedClosingSuit) return true;
        if (playedOnClosingSuit && playedClosingSuit && higherRank) return true;
        return false;
    }
    return false;
}

function clickEndTurn(evt) {
    game.endTurn(game.playerTurnIndex !== game.defenderIndex);
    evt.target.classList.toggle("hidden")
}

function clearPlayArea() {
    playArea.innerHTML = '';
}

/*----- Sortable JS -----*/
new Sortable(player1Hand, {
    group: {
        name: 'player1Hand',
        pull: () => game.playerTurnIndex === 0,
        put: false
    },
    animation: 150,
    sort: true,
});


new Sortable(player2Hand, {
    group: {
        name: 'player2Hand',
        pull: () => game.playerTurnIndex === 1,
        put: false
    },
    animation: 150,
});

new Sortable(playArea, {
    group: {
        name: 'playArea',
        pull: false,
        put: function (to, from, cardPlayed) {
            const role = getRole(cardPlayed.classList)
            return isCardValid(role, to.el, cardPlayed)
        }
    },
    animation: 150,
    sort: false,
    swapThreshold: 0,
    onAdd: function (evt) {
        game.playToDefender();
        const attackCard = document.createElement("div");
        attackCard.classList.add(ATTACK_CARD)
        attackCard.appendChild(evt.item);
        evt.to.appendChild(attackCard);

        new Sortable(attackCard, {
            group: {
                name: 'attackCard',
                pull: false,
                put: function (to, from, cardPlayed) {
                    const playedOn = to.el.children[0];
                    const role = getRole(cardPlayed.classList);
                    return isCardValid(role, to.el, cardPlayed, playedOn);
                }
            },
            sort: false,
            onAdd: function (evt) {
                evt.item.classList.add(DEFEND_CARD)
                evt.to.appendChild(evt.item)
                game.playByDefender();
            },
            direction: "vertical",
            swapThreshold: 0
        });
    }
});
