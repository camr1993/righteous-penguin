import Phaser from 'phaser';

var config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  render: {
    pixelArt: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 300 },
      debug: false,
    },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};

const game = new Phaser.Game(config);

function preload() {
  this.load.image('sky', 'assets/sky.png');
  this.load.image('ground', 'assets/platform.png');
  this.load.image('star', 'assets/star.png');
  this.load.image('bomb', 'assets/bomb.png');
  this.load.spritesheet('penguin', 'assets/penguin.png', {
    frameWidth: 18,
    frameHeight: 21,
  });
}

let platforms;
let player;
let cursors;
let stars;
let bombs;

let score = 0;
let scoreText;
let gameOver = false;

function create() {
  // background:
  this.add.image(400, 300, 'sky');

  // platforms:
  platforms = this.physics.add.staticGroup();

  platforms.create(400, 568, 'ground').setScale(2).refreshBody();
  platforms.create(600, 400, 'ground');
  platforms.create(50, 250, 'ground');
  platforms.create(750, 200, 'ground');

  // player:
  player = this.physics.add.sprite(100, 450, 'penguin');
  player.setScale(2.0);
  // player.setBounce(0.2);
  player.setCollideWorldBounds(true);

  this.anims.create({
    key: 'left',
    frames: this.anims.generateFrameNumbers('penguin', { start: 4, end: 7 }),
    frameRate: 10,
    repeat: -1,
  });

  this.anims.create({
    key: 'stop',
    frames: [{ key: 'penguin', frame: 0 }],
    frameRate: 20,
  });

  this.anims.create({
    key: 'right',
    frames: this.anims.generateFrameNumbers('penguin', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1,
  });

  this.anims.create({
    key: 'jumpRight',
    frames: [{ key: 'penguin', frame: 9 }],
    frameRate: 20,
  });

  this.anims.create({
    key: 'jumpLeft',
    frames: [{ key: 'penguin', frame: 8 }],
    frameRate: 20,
  });

  cursors = this.input.keyboard.createCursorKeys();

  // stars:
  stars = this.physics.add.group({
    key: 'star',
    repeat: 11,
    setXY: { x: 12, y: 0, stepX: 70 },
  });

  stars.children.iterate((child) => {
    child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
  });

  // score:
  scoreText = this.add.text(16, 16, 'score: 0', {
    fontSize: '32px',
    fill: '#000',
  });

  // bombs:
  bombs = this.physics.add.group();

  // collisions:
  this.physics.add.collider(player, platforms);
  this.physics.add.collider(stars, platforms);
  this.physics.add.collider(bombs, platforms);

  this.physics.add.overlap(player, stars, collectStar, null, this);
  this.physics.add.collider(player, bombs, hitBomb, null, this);
}

function update() {
  // jumping from ground
  if (cursors.up.isDown && player.body.touching.down) {
    player.setVelocityY(-330);
  }

  if (cursors.left.isDown) {
    player.setVelocityX(-160);
    if (player.body.touching.down) {
      player.anims.play('left', true);
    } else {
      player.anims.play('jumpLeft');
    }
  } else if (cursors.right.isDown) {
    player.setVelocityX(160);
    if (player.body.touching.down) {
      player.anims.play('right', true);
    } else {
      player.anims.play('jumpRight');
    }
  } else {
    player.setVelocityX(0);
    if (player.body.touching.down) {
      player.anims.play('stop');
    } else {
      player.anims.play('jumpRight');
    }
  }
}

function collectStar(player, star) {
  star.disableBody(true, true);

  score += 10;
  scoreText.setText('Score: ' + score);

  // if we collect all the stars, re-enable them and create bombs
  if (stars.countActive(true) === 0) {
    stars.children.iterate((child) => {
      // keeps their x position and resets y position to 0
      child.enableBody(true, child.x, 0, true, true);
    });

    // find out where the player is and so we can put the bomb's x position on the other side
    const x =
      player.x < 400
        ? Phaser.Math.Between(400, 800)
        : Phaser.Math.Between(0, 400);

    // create bomb with x and y coords, add bounce/collision and set velocity
    const bomb = bombs.create(x, 16, 'bomb');
    bomb.setBounce(1);
    bomb.setCollideWorldBounds(true);
    bomb.setVelocity(Phaser.Math.Between(-400, 400), 20);
  }
}

function hitBomb(player, bomb) {
  this.physics.pause();
  player.setTint(0xff0000);
  player.anims.play('stop');
  gameOver = true;
}
