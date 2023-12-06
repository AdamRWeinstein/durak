/*----- Imports -----*/
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io'
import { CARDS, ROLE_ATTACK, ROLE_DEFEND, ATTACK_CARD, DEFEND_CARD } from './constants.js'

/*----- Cached Elements  -----*/
let connectedUsers = {};
let activeIndexes = [];
let currentPlayers = 0;
let deck = [];
let cardsInPlay = [];
let playerHands = {};
let defIndex;
let currentAtkIndex;
let lastPlayedAtkIndex;
let firstAttackerIndex;
let closer;
let acceptingNewUsers = true;
let endGame = false;

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
        let card = deck.shift();
        cards.push(card);
    }
    return cards;
}

function findIndexOfPlayer(id) {
    //Returns an array of the indexes
    let keys = Object.keys(connectedUsers);
    for (let i = 0; i < keys.length; i++) {
        if (connectedUsers[keys[i]] === id) {
            //Returns the index where the given ID matches
            return Number(keys[i]);
        }
    }
    //If the ID isn't found, return -1
    return -1;
}

function endRound(defenderPickedUp) {
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
    console.log(`ending round - defenderPickedUp: ${defenderPickedUp}`);
    cardsInPlay.length = 0; //Empties the array for the new round
    io.emit('clear play area', '');
    io.to(connectedUsers[defIndex]).emit('setRole', ROLE_ATTACK);
    let numPlayers = Object.keys(connectedUsers).length;
    if (!endGame) {
        //Deal first attacker up to 6, then go through attackers, then finally defender
        let currentIndex = firstAttackerIndex;
        do {
            console.log(`currentIndex: ${currentIndex}`)
            if (currentIndex !== defIndex) {
                let userID = connectedUsers[currentIndex];
                let hand = deal(6 - playerHands[userID]);
                console.log("UserID and new cards drawn")
                console.log(userID)
                console.log(hand)
                io.to(userID).emit('add cards', hand);
            }
            currentIndex = (currentIndex + 1) % numPlayers;
        } while (currentIndex !== firstAttackerIndex)
        let defID = connectedUsers[defIndex];
        let hand = deal(6 - playerHands[defID]);
        console.log("UserID and new cards drawn")
        console.log(defID)
        console.log(hand)
        io.to(defID).emit('add cards', hand);
        //Enable endGame flag if deck is empty
        if (deck.length === 0) endGame = true;
    }
    //Set up indexes for next round
    let increaseBy = defenderPickedUp ? 2 : 1;
    let currentDefIndexInActive = activeIndexes.indexOf(defIndex);
    let nextDefIndexInActive = (currentDefIndexInActive + increaseBy) % activeIndexes.length;
    console.log(`defIndex = ${defIndex}`)
    defIndex = activeIndexes[nextDefIndexInActive];
    console.log(`defIndex = ${defIndex}`)
    let currentFirstAttackerIndexInActive = activeIndexes.indexOf(firstAttackerIndex);
    let nextFirstAttackerIndexInActive = (currentFirstAttackerIndexInActive + increaseBy) % activeIndexes.length;
    console.log(`firstAttackerIndex = ${firstAttackerIndex}`)
    firstAttackerIndex = activeIndexes[nextFirstAttackerIndexInActive];
    console.log(`firstAttackerIndex = ${firstAttackerIndex}`)
    currentAtkIndex = firstAttackerIndex;
    lastPlayedAtkIndex = firstAttackerIndex;
    io.to(connectedUsers[firstAttackerIndex]).emit('setTurn', true);
    io.to(connectedUsers[defIndex]).emit('setRole', ROLE_DEFEND);
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
}

function handleEndTurn(socket, defExit) {
    console.log("turn ended")
    socket.emit('setTurn', false);
    let playerIndex = findIndexOfPlayer(socket.id);
    let numPlayers = Object.keys(connectedUsers).length;
    if (playerIndex === currentAtkIndex) {
        let nextAttackerIndex = (playerIndex + 1) % numPlayers;
        //Skip the defender
        if (nextAttackerIndex === defIndex) {
            nextAttackerIndex = (nextAttackerIndex + 1) % numPlayers;
        }
        if (nextAttackerIndex === lastPlayedAtkIndex) {
            endRound(false);
            return;
        } else {
            //Using string coercion to map nextAttackerIndex to the object key property
            io.to(connectedUsers[nextAttackerIndex]).emit('setTurn', true);
            currentAtkIndex = nextAttackerIndex;
            return;
        }
    } else if (playerIndex === defIndex && !defExit) {
        console.log("~~~~~~~~~~~")
        console.log("cardsInPlay:")
        console.log(cardsInPlay)
        console.log("~~~~~~~~~~~")
        io.to(socket.id).emit('pickup cards', cardsInPlay);
        playerHands[socket.id] += cardsInPlay.length;
        endRound(true);
        return;
    } else if (defExit) {
        //Treat as if Defender picked up
        //Next player after Defender becomes Attacker, not Defender
        endRound(true)
    } else return;
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
    if (acceptingNewUsers) {
        connectedUsers[currentPlayers] = socket.id;
        activeIndexes.push(currentPlayers);
        currentPlayers++;
        if (currentPlayers === 6) acceptingNewUsers = false;
        console.log(connectedUsers)
    } else {
        socket.emit('not accepting connections', '');
        socket.disconnect(true);
    }

    socket.on("disconnect", () => {
        console.log(`Disconnect from ${socket.id}`);
    });

    socket.on('start game', () => {
        acceptingNewUsers = false;
        io.emit('start game');
        // Shuffle Deck
        deck = shuffle(CARDS);
        // Determine Closer
        closer = deck[deck.length - 1];
        console.log("closer:")
        console.log(closer)
        // Determine Defender
        defIndex = Math.floor(Math.random() * (currentPlayers))
        // Determine Current Attacker
        currentAtkIndex = defIndex !== 0 ? defIndex - 1 : currentPlayers - 1;
        lastPlayedAtkIndex = currentAtkIndex;
        firstAttackerIndex = currentAtkIndex;
        // Assign Roles, Deal 6 Cards to each player, and notify of closer
        for (let i = 0; i < currentPlayers; i++) {
            console.log({
                role: i === defIndex ? ROLE_DEFEND : ROLE_ATTACK,
                turn: i === currentAtkIndex
            })
            io.to(connectedUsers[i]).emit('pass closer', closer);
            io.to(connectedUsers[i]).emit('setRole', i === defIndex ? ROLE_DEFEND : ROLE_ATTACK);
            io.to(connectedUsers[i]).emit('setTurn', i === currentAtkIndex);
            let hand = deal(6);
            io.to(connectedUsers[i]).emit('add cards', hand);
            playerHands[connectedUsers[i]] = 6;
        }
        console.log("player hands:")
        console.log(playerHands)
    });

    socket.on('play attack card', (card) => {
        console.log("play attack card")
        playerHands[socket.id] -= 1;
        if (playerHands[socket.id] === 0 && endGame) {
            socket.emit('exit', '');
            activeIndexes.splice(currentAtkIndex, 1);
            if(activeIndexes.length === 1) {

            } else handleEndTurn(socket, false);
        }
        lastPlayedAtkIndex = findIndexOfPlayer(socket.id);
        console.log("~~~~~~~~~~~~~")
        console.log("new atk card in play:")
        console.log(card)
        console.log("~~~~~~~~~~~~~")
        cardsInPlay.push(card);
        io.emit('play attack card', card);
    });

    socket.on('play defend card', (cardData) => {
        console.log("play defend card")
        playerHands[socket.id] -= 1;
        if (playerHands[socket.id] === 0 && endGame) {
            socket.emit('exit', '');
            activeIndexes.splice(defIndex, 1);
            if(activeIndexes.length === 1) {

            } else handleEndTurn(connectedUsers[currentAtkIndex], true);
        }
        console.log("~~~~~~~~~~~~~")
        console.log("new def card in play:")
        console.log(cardData)
        console.log("~~~~~~~~~~~~~")
        cardsInPlay.push(cardData.card);
        io.emit('play defend card', cardData);
        io.to(connectedUsers[lastPlayedAtkIndex]).emit('setTurn', true);
    });

    socket.on('end turn', () => {
        handleEndTurn(socket, false)
    });
});

server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});