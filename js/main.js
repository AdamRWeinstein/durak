/*----- imports -----*/
import {CARDS, ROLE_ATTACK, ROLE_DEFEND, ATTACK_CARD, DEFEND_CARD} from './constants.js'


/*----- state variables -----*/
let game;
let currentPlayers = 0;

/*----- cached elements  -----*/
const playArea = document.querySelector(".PlayArea");
const attackerHand = document.querySelector(".AttackerHand"); 
const defenderHand = document.querySelector(".DefenderHand"); 
const attackerEndButton = document.querySelector("#AttackerEndTurn")

/*----- event listeners -----*/
attackerEndButton.addEventListener("click", endAttack)

/*----- Classes -----*/
class Game {
    constructor(){
        this.deck = this.shuffle(CARDS);
        this.closer = this.determineCloser();
        this.playerTurn = this.setPlayerTurn(1);
        this.players = [];
        console.log(`closer: ${this.closer}`)
    } 
    shuffle(cards) {
        let cardsArray = Object.values(cards);
        for(let i = cardsArray.length - 1; i > 0; i--){
            let j = Math.floor(Math.random() * (i + 1));
            [cardsArray[i], cardsArray[j]] = [cardsArray[j], cardsArray[i]];
        }
        return cardsArray;
    }
    deal(player, num) {
        for(let i = 0; i < num; i++){
            player.addCard(this.deck.shift());
        }
    }
    determineCloser(){
        const vals = Object.values(this.deck);
        return vals[vals.length - 1].suit;
    }
    setPlayerTurn(playerId){
        this.playerTurn = playerId;
    }
    switchTurn(){

    }
}

class Player {
    constructor(handEl, role, id){
        this.hand = [];
        this.handEl = handEl;
        this.role = role;
        this.playerId = id;
        this.exited = false;
    }
    setAttack(){
        this.role = ROLE_ATTACK
    }
    setDefend(){
        this.role = ROLE_DEFEND
    }
    setHandEl(){}
    addCard(card){
        const newCardEl = document.createElement("img");
        newCardEl.src = card.src;
        newCardEl.id = card.id;
        newCardEl.classList.add(`rank-${card.rank}`);
        newCardEl.classList.add(`suit-${card.suit}`);
        newCardEl.classList.add('Card');
        newCardEl.classList.add(this.role)
        newCardEl.style.padding = "0px 5px 0px 5px"
        newCardEl.style.width = '15vmin';
        this.handEl.appendChild(newCardEl);
        this.hand.push(card)
    }
    getNumberOfCards(){
        return this.handEl.children.length;
    }
    exit(){
        this.exited = true;
    }
}

class Computer extends Player {
    constructor(){
        super()
    }
}

/*----- functions -----*/
function init(){
    game = new Game();
    game.setPlayerTurn(0);
    let player1 = new Player(attackerHand, ROLE_ATTACK, currentPlayers++);
    game.players.push(player1);
    game.deal(player1, 6);
    let player2 = new Player(defenderHand, ROLE_DEFEND, currentPlayers++);
    game.players.push(player2);
    game.deal(player2, 6);
}

init();

function renderButtons(){
    if((game.playerTurn === 0 && attackerEndButton.classList.contains("hidden"))
     || game.playerTurn === 1 && !attackerEndButton.classList.contains("hidden")) {
        attackerEndButton.classList.toggle("hidden");
    }
}

function currentRanksInPlay(cardEls) {
    console.log(cardEls);
    console.log(cardEls[0]);
    console.log(cardEls[1]);
    const ranks = [];
    for(let i = 0; i < cardEls.length; i++) {
        let cardStack = cardEls[i];
        for(let j = 0; j < cardStack.children.length; j++){
            ranks.push(getRank([...cardStack.children[j].classList]))
        }
    }
    console.log(`ranks: ${ranks}`)
    return ranks;
}

function getRank(classes){
    return Number([...classes].find(className => className.startsWith("rank-")).split('-')[1]);
}

function getSuit(classes){
    return [...classes].find(className => className.startsWith("suit-")).split('-')[1];
}

function getRole(classes){
    return [...classes].find(role => role === ROLE_ATTACK || role === ROLE_DEFEND) || null;
}

function getAreaPlayedType(areaPlayed){
    return [...areaPlayed.classList].find(playArea => playArea === "PlayArea" || playArea === ATTACK_CARD) || null;
}

function isCardValid(role, areaPlayed, cardPlayed, playedOn){
    const areaPlayedType = getAreaPlayedType(areaPlayed);
    if(role === ROLE_ATTACK && areaPlayedType === "PlayArea"){
        const empty = areaPlayed.children.length === 0;
        if(empty) return true;
        const lessThanMax = areaPlayed.children.length < 6;
        const currentRanks = currentRanksInPlay(areaPlayed.children);
        const matchesRank = currentRanks.includes(getRank(cardPlayed.classList));
        return lessThanMax && matchesRank;
    } else if(role === ROLE_DEFEND && areaPlayedType === ATTACK_CARD){
        const openCard = areaPlayed.children.length === 1;
        if(!openCard) return false;
        const sameSuit = getSuit(cardPlayed.classList) === getSuit(playedOn.classList);        
        const higherRank = getRank(cardPlayed.classList) > getRank(playedOn.classList);
        if(sameSuit && higherRank) return true;
        const playedClosingSuit = getSuit(cardPlayed.classList) === game.closer;
        const playedOnClosingSuit = getSuit(playedOn.classList) === game.closer;
        if(!playedOnClosingSuit && playedClosingSuit) return true;
        if(playedOnClosingSuit && playedClosingSuit && higherRank) return true;
        return false;
    }
    return false;
}

function endAttack(){
    game.swapTurns();
}

/*----- Sortable JS -----*/
new Sortable(attackerHand, {
    group: {
        name: 'attackerHand',
        pull: () => game.playerTurn === 0,
        put: false
    },
    animation: 150,
    sort: true
});


new Sortable(defenderHand, {
    group: {
        name: 'defenderHand',
        pull: true,
        put: false
    },
    animation: 150
});

new Sortable(playArea, {
    group: {
        name: 'playArea',
        pull: false,
        put: function(to, from, cardPlayed) {
            const role = getRole(cardPlayed.classList)
            return isCardValid(role, to.el, cardPlayed)
        }
    },
    animation: 150,
    sort: false,
    swapThreshold: 0,
    onAdd: function(evt) {
        game.playerTurn = 1;
        const attackCard = document.createElement("div");
        attackCard.classList.add(ATTACK_CARD)
        attackCard.appendChild(evt.item);
        evt.to.appendChild(attackCard);
        renderButtons();
        
        new Sortable(attackCard, {
            group: {
                name: 'attackCard',
                pull: false,
                put: function(to, from, cardPlayed) {
                    const playedOn = to.el.children[0];
                    const role = getRole(cardPlayed.classList);
                    return isCardValid(role, to.el, cardPlayed, playedOn);
                }
            },
            sort: false,
            onAdd: function(evt) {
                evt.item.classList.add(DEFEND_CARD)
                evt.to.appendChild(evt.item)
                game.playerTurn = 0;
                renderButtons();
            },
            direction: "vertical",
            swapThreshold: 0
        });
    }
});
