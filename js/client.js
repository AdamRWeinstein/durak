/*----- ??? -----*/
/*----- Imports -----*/
import { CARDS, ROLE_ATTACK, ROLE_DEFEND, ATTACK_CARD, DEFEND_CARD } from './constants.js'
import { io } from "https://cdn.socket.io/4.7.2/socket.io.esm.min.js";


/*----- Cached Elements  -----*/
const handEl = document.querySelector(".Hand");
const startButton = document.getElementById("StartGame");
const playArea = document.querySelector(".PlayArea");
const hand = document.querySelector(".Hand");

/*----- Global Variables -----*/
let role;
let closer;
let myTurn;
let attackCardCounter = 0;

/*----- Socket Variables -----*/
const socket = io("http://localhost:3000");

/*----- Event Listeners -----*/
startButton.addEventListener("click", () => {
    socket.emit('start game', '');
    startButton.classList.add("hidden")
});

/*----- Functions -----*/
function setRole(givenRole) {
    role = givenRole;
}

function addCard(cards) {
    for(let i = 0; i < cards.length; i++){
        const newCardEl = document.createElement("img");
        newCardEl.src = cards[i].src;
        newCardEl.classList.add(`rank-${cards[i].rank}`);
        newCardEl.classList.add(`suit-${cards[i].suit}`);
        newCardEl.classList.add('Card');
        handEl.appendChild(newCardEl);
    }
}


function getRank(classes) {
    return Number([...classes].find(className => className.startsWith("rank-")).split('-')[1]);
}

function getSuit(classes) {
    return [...classes].find(className => className.startsWith("suit-")).split('-')[1];
}

function getAreaPlayedType(areaPlayed) {
    return [...areaPlayed.classList].find(playArea => playArea === "PlayArea" || playArea === ATTACK_CARD) || null;
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
        const playedClosingSuit = getSuit(cardPlayed.classList) === closer.suit;
        const playedOnClosingSuit = getSuit(playedOn.classList) === closer.suit;
        if (!playedOnClosingSuit && playedClosingSuit) return true;
        if (playedOnClosingSuit && playedClosingSuit && higherRank) return true;
        return false;
    }
    return false;
}

function getCard(imgElement) {
    return {
        classList: Array.from(imgElement.classList),
        src: new URL(imgElement.src).pathname 
    }
}

function buildCard(cardData) {
    const cardElement = document.createElement('img');
    cardData.classList.forEach(cls => cardElement.classList.add(cls));
    cardElement.src = cardData.src;
    return cardElement;
}

/*----- Socket Events -----*/
socket.on("connect", () => {
    console.log(`Connected!`);
});

function socketEventListeners(){
    socket.on('setRole', (data) => {
        setRole(data.role);
        myTurn = data.turn;
        console.log(`role: ${role}\tmyTurn: ${myTurn}`)
    });
    
    socket.on('add cards', (cards) => {
        console.log(`add cards listener, received: ${cards}`)
        addCard(cards);
    });
    
    socket.on('start game', () => {
        startButton.classList.add("hidden");
    });

    socket.on('pass closer', (card) => {
        closer = card;
    });

    socket.on('play attack card', (cardData) => {
        console.log('play attack card')
        let attackCard = document.createElement("div");
        attackCard.classList.add(ATTACK_CARD)
        attackCard.id = 'attackCardID-' + attackCardCounter++;
        attackCard.appendChild(buildCard(cardData));
        playArea.appendChild(attackCard);
        if(role === ROLE_DEFEND) myTurn = true;

        new Sortable(attackCard, {
            group: {
                name: 'attackCard',
                pull: false,
                put: function (to, from, cardPlayed) {
                    const playedOn = to.el.children[0];
                    return isCardValid(role, to.el, cardPlayed, playedOn);
                }
            },
            sort: false,
            onAdd: function (evt) {
                socket.emit('play defend card', {
                    card: getCard(evt.item),
                    area: evt.to.id
                });
                myTurn = false;
                evt.to.removeChild(evt.item);
            },
            direction: "vertical",
            swapThreshold: 0
        });
    });

    socket.on('play defend card', (cardData) => {
        console.log('play defend card')
        console.log(cardData);
        let card = buildCard(cardData.card)
        card.classList.add(DEFEND_CARD)
        const area = document.getElementById(cardData.area)
        area.appendChild(card)
    });
}

socketEventListeners()

/*----- Sortable JS -----*/
new Sortable(hand, {
    group: {
        name: 'hand',
        pull: true,
        put: false
    },
    animation: 150,
    sort: true
});

new Sortable(playArea, {
    group: {
        name: 'playArea',
        pull: false,
        put: () => myTurn && role === ROLE_ATTACK
    },
    animation: 150,
    sort: false,
    swapThreshold: 0,
    onAdd: function (evt) {
        socket.emit('play attack card', getCard(evt.item));
        evt.to.removeChild(evt.item); //Remove the card from the sortable, let the socket listener handle this
        myTurn = false;
    }
});
