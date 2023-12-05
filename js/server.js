/*----- Imports -----*/
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io'
import { CARDS, ROLE_ATTACK, ROLE_DEFEND, ATTACK_CARD, DEFEND_CARD } from './constants.js'

/*----- Cached Elements  -----*/
let connectedUsers = {};
let currentPlayers = 0;
let deck = [];
let cardsInPlay = [];
let playerHands = {};
let defIndex;
let currentAtkIndex;
let lastPlayedAtkIndex;
let closer;
let acceptingNewUsers = true;

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

function endRound() {
    cardsInPlay.length = 0; //Empties the array for the new round
    io.emit('clear play area', '');
    //TODO logic for swapping roles, dealing cards, etc.
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
    if(acceptingNewUsers){
        connectedUsers[currentPlayers] = socket.id;
        currentPlayers++;
        if(currentPlayers === 6) acceptingNewUsers = false;
        console.log(connectedUsers)
    } else {
        socket.emit('game already started', '');
        socket.disconnect(true);
    }

    socket.on("disconnect", () => {
        console.log(`Disconnect from ${socket.id}`);
    });

    socket.on('start game', () => {
        acceptingNewUsers = false;
        io.emit('start game');
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
        lastPlayedAtkIndex = currentAtkIndex;
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
        console.log("player hands:")
        console.log(playerHands)
        lastPlayedAtkIndex = findIndexOfPlayer(socket.id);
        cardsInPlay.push(card);
        io.emit('play attack card', card);
    });

    socket.on('play defend card', (card) => {
        console.log("play defend card")
        playerHands[socket.id] -= 1;
        console.log("player hands:")
        console.log(playerHands)
        console.log(card)
        cardsInPlay.push(card);
        io.emit('play defend card', card);
        io.to(connectedUsers[lastPlayedAtkIndex]).emit('setTurn', true);
    });

    socket.on('end turn', () => {
        console.log("turn ended")
        let playerIndex = findIndexOfPlayer(socket.id);
        if(playerIndex === currentAtkIndex) {
            let nextAttackerIndex = playerIndex + 1;
            if(nextAttackerIndex >= Object.keys(connectedUsers).length) nextAttackerIndex = 0; 
            if(nextAttackerIndex === defIndex) nextAttackerIndex++;
            if(nextAttackerIndex === lastPlayedAtkIndex) {
                endRound();//
                return;
            } else {
                socket.emit('setTurn', false);
                //Using string coercion to map nextAttackerIndex to the object key property
                io.to(connectedUsers[nextAttackerIndex]).emit('setTurn', true);
                currentAtkIndex = nextAttackerIndex;
                return;
            }
        } else if(playerIndex === defIndex){
            console.log(cardsInPlay)
            io.to(socket.id).emit('pickup cards', cardsInPlay);
            playerHands[socket.id] += cardsInPlay.length;
            endRound();
            return;
        }
        console.log("err 001 - You shouldn't be here")
        return;
    });
});

server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});