# Durak (In Development)
This is project one for the Software Engineering Intesive Bootcamp with [GeneralAssemb.ly](https://generalassemb.ly/education/software-engineering-immersive/). It is made with HTML, CSS, and JavaScript. A singe-player version of the game is available [here](http://arw-durak.surge.sh/)

![Image](https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Russian_card_game_Durak.jpg/1280px-Russian_card_game_Durak.jpg) <sup>[[Wikipedia]](https://en.wikipedia.org/wiki/Durak)</sup>


## Description
Durak is a traditional Russian card game where the objective is to shed one's cards once there are no more cards left in the deck. The final player with cards is the *durak*, or 'fool'.

### Setup
A game of Durak is played with a standard 52-card deck where cards with values of two through five are removed, resulting in a 36-card deck. After each player is dealt six cards, the bottom card of the deck is flipped face-up, and the suit of this card becomes the trump suit.
### Gameplay
There are two roles in Durak: Attacker and Defender. There is only one Defender per round.

The Attacker plays a card from their hand of any rank and suit, and the Defender must block that card with a card of the same suit and a higher rank. The trump suit can block any other suit. The Attacker may then continue their attack with any card that matches the rank of a card in the play area. If the Attacker passes, the next non-defending player can then make an attack with the same restrictions. There can be a maximum of 6 attacks per round.

After each round, players draw back up to six cards as needed. The order always goes from the first to the Last attacker, followed up by the Defender. If there are no more cards left to draw, then players are elligible to exit the game and avoid becoming the Durak by shedding all of their cards.

## Technologies Used
- HTML, CSS, JavaScript
- [SortableJS](https://github.com/SortableJS/Sortable)
- [socket.io](https://socket.io/)

## Goals
### MVP
- [x] Card Art
- [x] Drag & Drop
- [ ] ~~Computer Players~~
- [x] Playable from Start to Finish
### Stretch Goals
- [x] Multiplayer
- [ ] Tutorial
- [ ] Lightning Gameplay
- [ ] Advanced Computer Players

## Caveats
There are currently some bugs in multiplayer surrounding the end game logic. These must still be captured, categorized, and fixed.