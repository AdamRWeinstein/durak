/*----- ??? -----*/
/*----- Imports -----*/
import { CARDS, ROLE_ATTACK, ROLE_DEFEND, ATTACK_CARD, DEFEND_CARD } from './constants.js'
import { io } from "https://cdn.socket.io/4.7.2/socket.io.esm.min.js";


/*----- Cached Elements  -----*/
const handEl = document.querySelector(".Hand");
const startButton = document.getElementById("StartGame");
const endButton = document.getElementById("EndTurn");
const playArea = document.querySelector(".PlayArea");
const hand = document.querySelector(".Hand");
const message = document.querySelector(".Message");
const playerContainer = document.querySelector(".PlayerContainer");
const handContainer = document.querySelector(".HandContainer");

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
});

endButton.addEventListener("click", () => {
    socket.emit('end turn', '');
});

/*----- Functions -----*/
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

function renderMessage() {
    let color = ["hearts", "diamonds"].includes(closer) ? "red" : "black"
    let closerSuit = closer.suit.slice(0, 1).toUpperCase() + closer.suit.slice(1)
    let msg = `<h1>Closer: <span style="color:${color}">${closerSuit}</span></h1>`
    let roleMsg = role === ROLE_ATTACK ? "Attack" : "Defend";
    msg += `<h1>Role: ${roleMsg}</h1>`;
    endButton.classList.add("hidden");
    if(myTurn) {
        msg += "<h1><strong>It's your turn</strong></h1>";
        if(playArea.children.length !== 0) endButton.classList.remove("hidden");
    }
    message.innerHTML = msg;
}

/*----- Socket Events -----*/
socket.on("connect", () => {
    console.log(`Connected!`);
});

function socketEventListeners(){
    socket.on('setRole', (data) => {
        console.log('setRole received')
        role = data;
    });

    socket.on('setTurn', (data) => {
        console.log('setTurn received')
        myTurn = data
        renderMessage();
    })
    
    socket.on('add cards', (cards) => {
        console.log('add cards received')
        addCard(cards);
    });

    socket.on('pickup cards', (cards) => {
        for(let i = 0; i < cards.length; i++){
            handEl.appendChild(buildCard(cards[i]));
        }
    });
    
    socket.on('start game', () => {
        console.log('start game received')
        startButton.classList.add("hidden");
        playArea.classList.remove("hidden");
        playerContainer.classList.remove("hidden");
        handContainer.classList.remove("hidden");
        message.classList.remove("hidden");
    });

    socket.on('pass closer', (card) => {
        console.log('pass closer received')
        closer = card;
        renderMessage();
    });

    socket.on('play attack card', (cardData) => {
        console.log('play attack card received')
        let attackCard = document.createElement("div");
        attackCard.classList.add(ATTACK_CARD)
        attackCard.id = 'attackCardID-' + attackCardCounter++;
        attackCard.appendChild(buildCard(cardData));
        playArea.appendChild(attackCard);
        if(role === ROLE_DEFEND) myTurn = true;
        renderMessage();

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
        console.log('play defend card received')
        let card = buildCard(cardData.card)
        card.classList.add(DEFEND_CARD)
        const area = document.getElementById(cardData.area)
        area.appendChild(card)
        renderMessage();
    });

    socket.on('clear play area', () => {
        console.log('clear play area received')
        playArea.innerHTML = '';
    })

    socket.on('game already started', () => {
        console.log("Error - Game already started. Disconnected from server.")
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
