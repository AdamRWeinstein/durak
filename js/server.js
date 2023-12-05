/*----- Imports -----*/
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io'
import { CARDS, ROLE_ATTACK, ROLE_DEFEND, ATTACK_CARD, DEFEND_CARD } from './constants.js'

/*----- Cached Elements  -----*/
let connectedUsers = {};
let currentPlayers = 0;
let deck = [];
let defIndex;
let currentAtkIndex;
let closer;

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
        if (this.endGame && this.players[this.currentAttackerIndex].handEl.children.length === 0) {
            this.players[this.currentAttackerIndex].exit();
            // this.currentAttackerIndex = this.getNextAttackerIndex();
        }
        this.playerTurnIndex = this.defenderIndex;
        renderButtons();
    }
    playByDefender() {
        if (this.endGame && this.players[this.defenderIndex].handEl.children.length === 0) {
            this.players[this.defenderIndex].exit();
        }
        this.playerTurnIndex = this.currentAttackerIndex;
        renderButtons();
    }
    getNextAttackerIndex() {
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

/*----- Functions -----*/
function shuffle(cards) {
    let cardsArray = Object.values(cards);
    for (let i = cardsArray.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [cardsArray[i], cardsArray[j]] = [cardsArray[j], cardsArray[i]];
    }
    return cardsArray;
}

function deal(num) {
    const cards = [];
    for (let i = 0; i < num && deck.length > 0; i++) {
        cards.push(deck.shift());
    }
    return cards;
}

/*----- Socket Variables -----*/
const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5501",
        methods: ["GET", "POST"]
    }
});

/*----- Socket Events -----*/
io.on("connection", (socket) => {
    console.log(`User connected! ID: ${socket.id}`);
    connectedUsers[currentPlayers] = socket.id;
    currentPlayers++;
    console.log(connectedUsers)

    socket.on("disconnect", () => {
        console.log(`Disconnect from ${socket.id}`);
    });
    
    socket.on('start game', () => {
        socket.broadcast.emit('start game');
        console.log("Starting Game")
        // Shuffle Deck
        deck = shuffle(CARDS);
        console.log("Deck Shuffled")
        // Determine Closer
        closer = deck[deck.length - 1];
        console.log("closer")
        console.log(closer)
        // Determine Defender
        defIndex = Math.floor(Math.random() * (currentPlayers))
        console.log("Defender Determined")
        // Determine Current Attacker
        currentAtkIndex = defIndex !== 0 ? defIndex - 1 : currentPlayers - 1;
        // Assign Roles, Deal 6 Cards to each player, and notify of closer
        for(let i = 0; i < currentPlayers; i++){
            console.log({
                role: i === defIndex ? ROLE_DEFEND : ROLE_ATTACK,
                turn: i === currentAtkIndex
            })
            io.to(connectedUsers[i]).emit('setRole', {
                role: i === defIndex ? ROLE_DEFEND : ROLE_ATTACK,
                turn: i === currentAtkIndex
            });
            let hand = deal(6);
            io.to(connectedUsers[i]).emit('add cards', hand);
            io.to(connectedUsers[i]).emit('pass closer', closer)
        }
    });

    socket.on('play attack card', (card) => {
        console.log("play attack card")
        io.emit('play attack card', card);
    });

    socket.on('play defend card', (card) => {
        console.log("play defend card")
        io.emit('play defend card', card);
    });
});

server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});