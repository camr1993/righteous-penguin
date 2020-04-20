import Phaser from 'phaser';
import Player from '../entities/Player';
import TestDummy from '../entities/TestDummy';
import Pistol from '../entities/Pistol';

export default class MainSceneTest extends Phaser.Scene {
  constructor() {
    super('MainSceneTest');

    this.gameOver = false;
    this.addPlayer = this.addPlayer.bind(this);
    this.addOtherPlayers = this.addOtherPlayers.bind(this);
    this.pickupWeapon = this.pickupWeapon.bind(this);
  }

  preload() {
    this.load.image('sky', 'assets/sky.png');
    this.load.image('tree', 'assets/tree.png');
    this.load.image('platform', 'assets/platform.png');
    this.load.image('pistol', 'assets/pistol.png');
    this.load.spritesheet('penguin', 'assets/penguin.png', {
      frameWidth: 64,
      frameHeight: 75,
    });
  }
  create() {
    this.players = this.add.group({
      classType: Player,
    });
    this.testDummies = this.add.group({
      classType: TestDummy,
      runChildUpdate: true,
    });
    this.pistols = this.physics.add.group({ classType: Pistol });
    // background:
    this.add.image(400, 300, 'sky');
    // tree
    // this.trees = this.physics.add.staticGroup();
    // this.trees.create(200, 493, 'tree').setScale(1.5);
    // platforms:
    this.platforms = this.physics.add.staticGroup();
    this.platforms.create(400, 568, 'platform').setScale(2).refreshBody();
    this.platforms.create(600, 400, 'platform');
    this.platforms.create(50, 250, 'platform');
    this.platforms.create(750, 200, 'platform');

    // sockets:
    const self = this;
    this.clientSocket = io(window.location.origin);
    this.roomName = window.location.pathname;

    this.clientSocket.on('connect', function () {
      console.log(`client side connected with user`);
      console.log('CLIENT SOCKET ID: ', self.clientSocket.id);
    });

    // Make the player from the info we get from the server:
    this.clientSocket.on('currentPlayers', (players) => {
      Object.keys(players).forEach((id) => {
        if (players[id].playerId === this.clientSocket.id) {
          this.addPlayer(players[id]);
        } else {
          this.addOtherPlayers(players[id]);
        }
      });
    });
    this.clientSocket.on('newPlayer', (playerInfo) => {
      this.addOtherPlayers(playerInfo);
    });
    this.clientSocket.on('disconnect', (playerId) => {
      this.testDummies.getChildren().forEach((enemy) => {
        if (playerId === enemy.playerId) {
          enemy.destroy();
        }
      });
    });
    this.clientSocket.on('playerMoved', (playerInfo) => {
      this.testDummies.getChildren().forEach((otherPlayer) => {
        if (playerInfo.playerId === otherPlayer.playerId) {
          otherPlayer.facingLeft = playerInfo.facingLeft;
          otherPlayer.setPosition(playerInfo.x, playerInfo.y);
          otherPlayer.currentWeapon = playerInfo.currentWeapon;
          otherPlayer.run = playerInfo.run;
        }
      });
    });
    this.clientSocket.on('pistolLocation', (pistolInfo) => {
      const pistol = this.pistols.create(pistolInfo.x, pistolInfo.y, 'pistol');
      pistol.id = pistolInfo.id;
    });
    this.clientSocket.on('pistolDestroy', (pistolId) => {
      this.pistols.getChildren().forEach((pistol) => {
        if (pistol.id === pistolId) {
          pistol.disableBody(true, true);
        }
      });
    });

    this.createPlayerAnims();
    this.cursors = this.input.keyboard.createCursorKeys();
    // collisions:
    this.collisions();
  }

  update(time, delta) {
    if (this.player) {
      this.player.update(this.cursors);

      // emit player movement
      let x = this.player.x;
      let y = this.player.y;
      let facingLeft = this.player.facingLeft;
      let holdingWeapon = this.player.currentWeapon.holding;
      if (
        this.player.oldPosition &&
        (x !== this.player.oldPosition.x ||
          y !== this.player.oldPosition.y ||
          facingLeft !== this.player.oldPosition.facingLeft ||
          holdingWeapon !== this.player.oldPosition.holdingWeapon)
      ) {
        this.clientSocket.emit('playerMovement', {
          x: this.player.x,
          y: this.player.y,
          facingLeft: this.player.facingLeft,
          currentWeapon: this.player.currentWeapon,
          run: x !== this.player.oldPosition.x,
        });
      }

      // save old position data
      this.player.oldPosition = {
        x: this.player.x,
        y: this.player.y,
        facingLeft: this.player.facingLeft,
        holdingWeapon: this.player.currentWeapon.holding,
      };
    }
  }

  collisions() {
    this.physics.add.collider(this.players, this.platforms);
    this.physics.add.collider(this.pistols, this.platforms);
    // this.physics.add.collider(this.player, this.trees);
    // this.physics.add.collider(this.pistols, this.trees);

    this.physics.add.collider(this.testDummies, this.platforms);
    // this.physics.add.collider(this.testDummy, this.trees);
    // this.physics.add.collider(this.testDummy, this.player);
    // this.physics.add.overlap(this.testDummy, this.bullets, this.hit);

    // this.physics.add.overlap(this.platforms, this.bullets, this.hit);
    // this.physics.add.overlap(this.trees, this.bullets, this.hit);
    this.physics.add.overlap(
      this.players,
      this.pistols,
      this.pickupWeapon,
      null,
      this
    );
  }

  createPlayerAnims() {
    this.anims.create({
      key: 'stop',
      frames: [{ key: 'penguin', frame: 0 }],
      frameRate: 20,
    });
    this.anims.create({
      key: 'run',
      frames: this.anims.generateFrameNumbers('penguin', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'jump',
      frames: [{ key: 'penguin', frame: 4 }],
      frameRate: 20,
    });

    this.anims.create({
      key: 'stoppistol',
      frames: [{ key: 'penguin', frame: 7 }],
      frameRate: 20,
    });
    this.anims.create({
      key: 'runpistol',
      frames: this.anims.generateFrameNumbers('penguin', { start: 7, end: 10 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'jumppistol',
      frames: [{ key: 'penguin', frame: 11 }],
      frameRate: 20,
    });
  }

  addPlayer(playerInfo) {
    this.player = this.players.create(playerInfo.x, playerInfo.y, 'penguin');
    // this.player = new Player(this, playerInfo.x, playerInfo.y, 'penguin');
    this.player.setScale(0.75);
    this.player.setCollideWorldBounds(true);
  }

  addOtherPlayers(playerInfo) {
    const otherPlayer = this.testDummies.create(
      playerInfo.x,
      playerInfo.y,
      'penguin'
    );
    if (playerInfo.team === 'blue') {
      otherPlayer.setTint(0x0000ff);
    } else {
      otherPlayer.setTint(0xff0000);
    }
    otherPlayer.setScale(0.75);
    otherPlayer.setCollideWorldBounds(true);
    otherPlayer.playerId = playerInfo.playerId;
  }

  pickupWeapon(player, weapon) {
    player.currentWeapon.name = `${weapon.texture.key}`;
    player.currentWeapon.holding = true;
    weapon.disableBody(true, true);

    this.clientSocket.emit('pistolPickedUp', weapon.id);
  }
}
