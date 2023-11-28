/*----- imports -----*/
import {CARDS, ATTACK, DEFEND} from './constants.js'

/*----- state variables -----*/

/*----- cached elements  -----*/
const playArea = document.getElementById("PlayArea");
const attackerHand = document.querySelector(".AttackerHand"); 
const defenderHand = document.querySelector(".DefenderHand"); 


/*----- event listeners -----*/

/*----- Classes -----*/
class Game {
    constructor(){
        this.deck = this.shuffle(CARDS);
        this.determineCloser();
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
        console.log("vals")
        const vals = Object.values(this.deck);
        
        this.closer = vals[vals.length - 1].suit
    }
}

class Player {
    constructor(handEl, role){
        this.hand = [];
        this.handEl = handEl;
        this.role = role;
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
        newCardEl.classList.add(this.role)
        newCardEl.style.padding = "0px 5px 0px 5px"
        newCardEl.style.width = '15vmin';
        this.handEl.appendChild(newCardEl);
        this.hand.push(card)
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
    console.log(`game.closer: ${game.closer}`)
    console.log(`game.deck: ${game.deck}`)
    console.log(`attackerHand: ${attackerHand}`)
    console.log(`defenderHands: ${defenderHand}`)
    let attacker = new Player(attackerHand, ATTACK);
    console.log(attacker)
    game.deal(attacker, 6);
    console.log(attacker.hand)
    let defender = new Player(defenderHand, DEFEND);
    game.deal(defender, 6);
    console.log(defender.hand)
}

init();


/*----- Sortable JS -----*/
new Sortable(attackerHand, {
    group: {
        name: 'attackerHand',
        pull: true,
        put: false
    },
    animation: 150
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
        put: function(to, from) {
            return (to.el.children.length < 6) && from.el.classList.contains("AttackerHand")
        }
    },
    animation: 150,
    sort: false,
    swapThreshold: 0,
    onAdd: function(evt) {
        const attackCard = document.createElement("div");
        attackCard.classList.add("AttackCard")
        attackCard.appendChild(evt.item);
        evt.to.appendChild(attackCard)
        
        new Sortable(attackCard, {
            group: {
                name: 'attackCard',
                pull: false,
                put: function(to, from) {
                    return (to.el.children.length === 1) && (from.el.classList.contains("DefenderHand"))
                },
            },
            sort: false,
            onAdd: function(evt) {
                evt.item.classList.add("DefenderCard")
                evt.to.appendChild(evt.item)
            },
            direction: "vertical",
            swapThreshold: 0
        });
    }
});
