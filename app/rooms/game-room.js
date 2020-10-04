const colyseus = require('colyseus');
const social = require('@colyseus/social');
const {Dispatcher} = require('@colyseus/command');
const GameState = require('./states/game-state');
const Commands = require('./commands/game-commands');

class GameRoom extends colyseus.Room {
  constructor() {
    super();
    this.dispatcher = new Dispatcher(this);
  }

  // When room is initialized
  onCreate() {
    this.setState(new GameState());
    this.maxClients = 8;
    this.onMessage('shop', (client, message) => {
      this.dispatcher.dispatch(new Commands.OnShopCommand(), {
        sessionId: client.sessionId,
        pokemonId: message.id
      });
    });

    this.onMessage('dragDrop', (client, message) => {
      this.dispatcher.dispatch(new Commands.OnDragDropCommand(), {
        client: client,
        detail: message.detail
      });
    });

    this.onMessage('sellDrop', (client, message) => {
      this.dispatcher.dispatch(new Commands.OnSellDropCommand(), {
        client,
        detail: message.detail
      });
    });

    this.onMessage('refresh', (client, message) => {
      this.dispatcher.dispatch(new Commands.OnRefreshCommand(), client.sessionId);
    });

    this.onMessage('lock', (client, message) => {
      this.dispatcher.dispatch(new Commands.OnLockCommand(), client.sessionId);
    });

    this.onMessage('levelUp', (client, message) => {
      this.dispatcher.dispatch(new Commands.OnLevelUpCommand(), client.sessionId);
    });

    this.setSimulationInterval((deltaTime) =>
      this.dispatcher.dispatch(new Commands.OnUpdateCommand(), deltaTime));
  }

  async onAuth(client, options, request) {
    const token = social.verifyToken(options.token);
    const user = await social.User.findById(token._id);
    return user;
  }

  onJoin(client, options, auth) {
    this.dispatcher.dispatch(new Commands.OnJoinCommand(), {client, options, auth});
  }

  onLeave(client, consented) {
    this.dispatcher.dispatch(new Commands.OnLeaveCommand(), {client, consented});
  }

  onDispose() {
    this.dispatcher.stop();
  }

  getRandomOpponent(playerId) {
    const playersId = [];
    const numberOfPlayers = Object.keys(this.state.players).length;
    for (const id in this.state.players) {
      if (this.state.players[id].alive && (id != playerId || numberOfPlayers == 1 )) {
        playersId.push(id);
      }
    }
    if (playersId.length > 0) {
      const n = Math.floor(Math.random() * playersId.length);
      return this.state.players[playersId[n]].id;
    } else {
      return '';
    }
  }

  swap(board, pokemon, x, y) {
    if (!this.isPositionEmpty(board, x, y)) {
      const pokemonToSwap = this.getPokemonByPosition(board, x, y);
      pokemonToSwap.positionX = pokemon.positionX;
      pokemonToSwap.positionY = pokemon.positionY;
    }
    pokemon.positionX = x;
    pokemon.positionY = y;
  }


  getPokemonByPosition(board, x, y) {
    for (const id in board) {
      const pokemon = board[id];
      if (pokemon.positionX == x && pokemon.positionY == y) {
        return pokemon;
      }
    }
  }

  isPositionEmpty(board, x, y) {
    let empty = true;
    for (const id in board) {
      const pokemon = board[id];
      if (pokemon.positionX == x && pokemon.positionY == y) {
        empty = false;
      }
    }
    return empty;
  }

  getFirstAvailablePositionInBoard(board) {
    for (let i = 0; i < 9; i++) {
      if (this.isPositionEmpty(board, i, 0)) {
        return i;
      }
    }
    return new Error('no place found, board full');
  }

  getFirstAvailablePositionInTeam(board) {
    for (let x = 0; x < 9; x++) {
      for (let y = 1; y < 4; y++) {
        if (this.isPositionEmpty(board, x, y)) {
          return [x, y];
        }
      }
    }
    return new Error('no place found, team full');
  }
}

module.exports = GameRoom;
