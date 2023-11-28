/*----- imports -----*/
import CARDS from './constants.js'
import ATTACK from './constants.js'
import DEFEND from './constants.js'

/*----- state variables -----*/

/*----- cached elements  -----*/
const playArea = document.getElementById("PlayArea");
const hand = document.getElementById("Hand");

/*----- event listeners -----*/

/*----- Classes -----*/
class Game {
    constructor(){
        this.deck = this.shuffle(CARDS);
        this.closer = this.determineCloser();
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
            player.hand.push(this.deck.shift())
        }
    }
    determineCloser(){
        const vals = Object.values(this.deck);
        this.closer = vals[vals.length - 1].suit
    }
}

class Player {
    constructor(){
        this.hand = [];
        this.handEl = null;
        this.role = null;
        this.exited = false;
    }
    setAttack(){
        this.role = ATTACK
    }
    setDefend(){
        this.role = DEFEND
    }
    setHandEl(){}
    addCard(card){
        const newCardEl = document.createElement("img");
        newCardEl.src = card.src;
        newCardEl.id = card.id;
        newCardEl.classList.add(`${card.rank}`);
        newCardEl.classList.add(`${card.suit}`);
        newCardEl.classList.add('Card');
        newCardEl.style.padding = "0px 5px 0px 5px"
        newCardEl.style.width = '15vmin';
        this.handEl.appendChild(newCardEl);
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
    let game = new Game();
    console.log(game.closer)
    console.log(game.deck)
}

init();


/*----- Sortable JS -----*/
new Sortable(hand, {
    group: {
        name: 'shared',
        pull: true,
        put: false
    },
    animation: 150
});

new Sortable(playArea, {
    group: {
        name: 'shared',
        pull: false,
        put: true
    },
    animation: 150,
    sort: false
});