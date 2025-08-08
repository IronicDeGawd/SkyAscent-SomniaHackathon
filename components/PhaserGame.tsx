"use client";

import { useEffect, useRef } from "react";
import * as Phaser from "phaser";

interface PhaserGameProps {
  onScoreUpdate: (score: number) => void;
  onAltitudeUpdate: (altitude: number) => void;
  onFuelUpdate: (fuel: number) => void;
  onTimeUpdate: (time: number) => void;
  onGameEnd: (
    finalScore: number,
    finalAltitude: number,
    finalTime: number
  ) => void;
  onGameStateChange: (
    state: "loading" | "playing" | "paused" | "ended"
  ) => void;
}

class GameScene extends Phaser.Scene {
  private balloon!: Phaser.GameObjects.Sprite;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private powerups!: Phaser.Physics.Arcade.Group;
  private clouds!: Phaser.GameObjects.Group;
  private backgroundTile!: Phaser.GameObjects.TileSprite;
  private score = 0;
  private altitude = 0;
  private fuel = 100;
  private gameSpeed = 2;
  private gameTime = 0;
  private lastObstacleTime = 0;
  private lastPowerupTime = 0;
  private isGameOver = false;
  private shieldActive = false;
  private shieldSprite?: Phaser.GameObjects.Sprite;
  private shieldEndTime = 0;
  private difficultyLevel = 1;
  private nextDifficultyScore = 1000;
  private gameCallbacks: React.MutableRefObject<PhaserGameProps>;

  // Countdown and game start logic
  private isGameStarted = false;
  private countdownActive = true;
  private countdownCompleted = false; // Flag to prevent countdown re-execution
  private countdownValue = 3; // Reduced from 5 to 3 for better UX
  private countdownText!: Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;
  private countdownTimer!: Phaser.Time.TimerEvent; // Timer event reference for proper cleanup
  private gameStartTime = 0;

  // Performance optimizations
  private objectPool: Map<string, Phaser.GameObjects.Sprite[]> = new Map();
  private baseAscendSpeed = -100; // Base upward speed
  private currentAscendSpeed = 0;

  // Touch control optimization
  private touchStartX = 0;
  private isDragging = false;

  // Keyboard control optimization
  private aKey?: Phaser.Input.Keyboard.Key;
  private dKey?: Phaser.Input.Keyboard.Key;
  private leftKey?: Phaser.Input.Keyboard.Key;
  private rightKey?: Phaser.Input.Keyboard.Key;

  constructor(callbacks: React.MutableRefObject<PhaserGameProps>) {
    super({ key: "GameScene" });
    this.gameCallbacks = callbacks;
  }

  preload() {
    // Create simple colored rectangles as fallback assets
    this.createFallbackAssets();

    // Load game assets with fallback handling
    this.load.image("balloon", "/balloon_default.png");
    this.load.image("bird", "/bird.png");
    this.load.image("airplane", "/airplane.png");
    this.load.image("ufo", "/ufo.png");
    this.load.image("fuel", "/fuel.png");
    this.load.image("shield", "/shield.png");
    this.load.image("cloud1", "/cloud1.png");
    this.load.image("cloud2", "/cloud2.png");
    this.load.image("background", "/bg.png");
  }

  createFallbackAssets() {
    // Create colored rectangles as fallback textures
    const graphics = this.make.graphics({ x: 0, y: 0 });

    // Balloon fallback (orange circle)
    graphics.fillStyle(0xff6b6b, 1);
    graphics.fillCircle(32, 32, 32);
    graphics.generateTexture("balloon_fallback", 64, 64);
    graphics.clear();

    // Bird fallback (brown rectangle)
    graphics.fillStyle(0x8b4513, 1);
    graphics.fillRect(0, 0, 40, 30);
    graphics.generateTexture("bird_fallback", 40, 30);
    graphics.clear();

    // Airplane fallback (gray rectangle)
    graphics.fillStyle(0x808080, 1);
    graphics.fillRect(0, 0, 60, 40);
    graphics.generateTexture("airplane_fallback", 60, 40);
    graphics.clear();

    // UFO fallback (gray circle)
    graphics.fillStyle(0x4a4a4a, 1);
    graphics.fillCircle(30, 20, 30);
    graphics.generateTexture("ufo_fallback", 60, 40);
    graphics.clear();

    // Fuel fallback (red canister)
    graphics.fillStyle(0xff0000, 1);
    graphics.fillRect(0, 0, 30, 40);
    graphics.generateTexture("fuel_fallback", 30, 40);
    graphics.clear();

    // Shield fallback (blue shield)
    graphics.fillStyle(0x0088ff, 1);
    graphics.fillCircle(25, 25, 25);
    graphics.generateTexture("shield_fallback", 50, 50);
    graphics.clear();

    // Cloud fallback
    graphics.fillStyle(0xffffff, 0.8);
    graphics.fillEllipse(40, 20, 80, 40);
    graphics.generateTexture("cloud_fallback", 80, 40);

    graphics.destroy();
  }

  create() {
    // Initialize object pools for performance
    this.initializeObjectPools();

    // Set up physics world with optimized bounds
    this.physics.world.setBounds(0, -10000, this.cameras.main.width, 11000);

    // Create repeating background
    this.createRepeatingBackground();

    // Create groups
    this.obstacles = this.physics.add.group();
    this.powerups = this.physics.add.group();
    this.clouds = this.add.group();

    // Create balloon with proper texture handling
    this.createBalloon();

    // Set up camera
    this.cameras.main.startFollow(this.balloon);
    this.cameras.main.setFollowOffset(0, 300);
    this.cameras.main.setLerp(0.1, 0.1); // Smooth camera following

    // Create initial clouds
    this.createInitialClouds();

    // Set up optimized controls
    this.setupOptimizedControls();

    // Set up collisions
    this.setupCollisions();

    // Create countdown UI
    this.createCountdownUI();

    // Start countdown
    this.startCountdown();

    this.gameCallbacks.current.onGameStateChange("playing");
  }

  createRepeatingBackground() {
    // Create repeating TileSprite background with fallback to gradient
    if (this.textures.exists("background")) {
      // Use the bg.png asset for infinite vertical scrolling
      this.backgroundTile = this.add.tileSprite(
        0,
        0,
        this.cameras.main.width,
        this.cameras.main.height * 3, // Extra height for smooth scrolling
        "background"
      );
      this.backgroundTile.setOrigin(0, 0);
      this.backgroundTile.setDepth(-1); // Behind everything
      this.backgroundTile.setScrollFactor(0, 0.2); // Parallax effect
    } else {
      // Fallback to gradient if asset loading fails
      this.createGradientBackgroundFallback();
    }
  }

  createGradientBackgroundFallback() {
    // Fallback gradient background
    const graphics = this.add.graphics();
    const colors = [0x87ceeb, 0x98bbe8, 0xb8a6d9, 0xd8a6c9, 0xf0b6b9];
    const height = this.cameras.main.height;

    for (let i = 0; i < 5; i++) {
      graphics.fillStyle(colors[i], 1);
      graphics.fillRect(
        0,
        (height / 5) * i,
        this.cameras.main.width,
        height / 5
      );
    }

    graphics.setScrollFactor(0, 0.2);
  }

  createBalloon() {
    const x = this.cameras.main.centerX;
    const y = this.cameras.main.height - 150;

    // Try to use actual texture, fallback if needed
    const textureKey = this.textures.exists("balloon")
      ? "balloon"
      : "balloon_fallback";

    this.balloon = this.physics.add.sprite(x, y, textureKey);
    this.balloon.setScale(0.3); // Match debug scene scale
    this.balloon.setDepth(10);

    const balloonBody = this.balloon.body as Phaser.Physics.Arcade.Body;
    balloonBody.setCollideWorldBounds(true);
    balloonBody.setDragX(200); // Increased drag for better control
    balloonBody.setMaxVelocity(200, 300); // Cap max velocities

    // Set hitbox to match debug scene: larger hitbox for better gameplay
    const hitboxWidth = this.balloon.width * 0.3 * 2; // Match debug scene
    const hitboxHeight = this.balloon.height * 0.3 * 2.5; // Match debug scene
    balloonBody.setSize(hitboxWidth, hitboxHeight);
    balloonBody.setOffset(
      (this.balloon.width - hitboxWidth) / 2,
      (this.balloon.height - hitboxHeight) / 2
    );
  }

  initializeObjectPools() {
    // Pre-create objects for pooling
    this.objectPool.set("obstacles", []);
    this.objectPool.set("powerups", []);
    this.objectPool.set("clouds", []);
  }

  getPooledObject(
    type: string,
    texture: string
  ): Phaser.GameObjects.Sprite | null {
    const pool = this.objectPool.get(type);
    if (!pool) return null;

    const inactive = pool.find((obj) => !obj.active);
    if (inactive) {
      inactive.setActive(true).setVisible(true);
      inactive.setTexture(texture);
      return inactive;
    }

    return null;
  }

  returnToPool(sprite: Phaser.GameObjects.Sprite, type: string) {
    sprite.setActive(false).setVisible(false);
    sprite.setPosition(-1000, -1000); // Move off screen
    const pool = this.objectPool.get(type);
    if (pool && !pool.includes(sprite)) {
      pool.push(sprite);
    }
  }

  setupOptimizedControls() {
    // Optimized touch controls with better responsiveness
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver || !this.isGameStarted) return;

      this.touchStartX = pointer.x;
      this.isDragging = true;
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || this.isGameOver || !this.isGameStarted) return;

      const deltaX = pointer.x - this.touchStartX;
      if (Math.abs(deltaX) > 10) {
        // Minimum threshold for movement
        this.handleContinuousMovement(deltaX);
        this.touchStartX = pointer.x; // Reset for continuous movement
      }
    });

    this.input.on("pointerup", () => {
      this.isDragging = false;
    });

    // Enhanced keyboard controls for desktop
    if (this.input.keyboard) {
      // Create key objects for WASD and arrow keys
      this.aKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.dKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.leftKey = this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.LEFT
      );
      this.rightKey = this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.RIGHT
      );

      // Enable key repeat for continuous movement
      if (this.aKey) this.aKey.setEmitOnRepeat(true);
      if (this.dKey) this.dKey.setEmitOnRepeat(true);
      if (this.leftKey) this.leftKey.setEmitOnRepeat(true);
      if (this.rightKey) this.rightKey.setEmitOnRepeat(true);

      // Set up key event listeners for A and D keys
      this.input.keyboard.on("keydown-A", () => {
        if (!this.isGameOver && this.isGameStarted) this.handleSwipe("left");
      });

      this.input.keyboard.on("keydown-D", () => {
        if (!this.isGameOver && this.isGameStarted) this.handleSwipe("right");
      });

      // Keep original arrow key support
      this.input.keyboard.on("keydown-LEFT", () => {
        if (!this.isGameOver && this.isGameStarted) this.handleSwipe("left");
      });

      this.input.keyboard.on("keydown-RIGHT", () => {
        if (!this.isGameOver && this.isGameStarted) this.handleSwipe("right");
      });
    }
  }

  handleKeyboardInput() {
    // Only process keyboard input if game is active
    if (this.isGameOver || !this.isGameStarted || this.fuel <= 0) return;

    // Check for continuous key presses (holding down keys)
    const leftPressed = this.aKey?.isDown || this.leftKey?.isDown;
    const rightPressed = this.dKey?.isDown || this.rightKey?.isDown;

    // Apply continuous movement when keys are held down
    if (leftPressed && !rightPressed) {
      // Smooth continuous movement to the left
      this.handleContinuousMovement(-80); // Negative for left movement
    } else if (rightPressed && !leftPressed) {
      // Smooth continuous movement to the right
      this.handleContinuousMovement(80); // Positive for right movement
    }
  }

  handleContinuousMovement(deltaX: number) {
    if (this.fuel <= 0) return;

    const balloonBody = this.balloon.body as Phaser.Physics.Arcade.Body;
    const moveForce = Phaser.Math.Clamp(deltaX * 2, -150, 150);
    balloonBody.setVelocityX(moveForce);

    // Consume less fuel for continuous movement
    const fuelBefore = this.fuel;
    this.fuel = Math.max(0, this.fuel - 0.5);
    if (fuelBefore !== this.fuel) {
      console.log(`CONTINUOUS FUEL CONSUMPTION: ${fuelBefore.toFixed(1)} -> ${this.fuel.toFixed(1)} (consumed 0.5)`);
    }
  }

  handleSwipe(direction: "left" | "right") {
    if (this.fuel <= 0 || this.isGameOver) return;

    const moveForce = 120;
    const balloonBody = this.balloon.body as Phaser.Physics.Arcade.Body;

    if (direction === "left") {
      balloonBody.setVelocityX(-moveForce);
    } else {
      balloonBody.setVelocityX(moveForce);
    }

    // Consume fuel (reduced from 1.5 to 0.8)
    const fuelBefore = this.fuel;
    this.fuel = Math.max(0, this.fuel - 0.8);
    console.log(`SWIPE FUEL CONSUMPTION: ${fuelBefore.toFixed(1)} -> ${this.fuel.toFixed(1)} (consumed 0.8)`);

    // Visual feedback with tilt
    this.tweens.add({
      targets: this.balloon,
      angle: direction === "left" ? -10 : 10,
      duration: 200,
      yoyo: true,
      ease: "Power2",
    });

    // Haptic feedback
    if ("vibrate" in navigator) {
      navigator.vibrate(30);
    }
  }

  update(time: number, delta: number) {
    if (this.isGameOver) return;

    if (this.countdownActive || !this.isGameStarted) return;

    // Update game time
    this.gameTime += delta / 1000;
    this.gameCallbacks.current.onTimeUpdate(Math.floor(this.gameTime));

    // Handle continuous keyboard input for desktop
    this.handleKeyboardInput();

    // Update balloon ascending speed based on fuel
    if (this.fuel > 0) {
      const balloonBody = this.balloon.body as Phaser.Physics.Arcade.Body;
      this.currentAscendSpeed =
        this.baseAscendSpeed * (1 + this.difficultyLevel * 0.1);
      balloonBody.setVelocityY(this.currentAscendSpeed);
    } else {
      // Fall when out of fuel
      const balloonBody = this.balloon.body as Phaser.Physics.Arcade.Body;
      balloonBody.setVelocityY(150);
    }

    // Update altitude
    this.updateAltitude();

    // Update background scrolling
    this.updateBackgroundScroll();

    // Update shield
    this.updateShield(time);

    // Update difficulty
    this.updateDifficulty();

    // Consume fuel (further reduced consumption rate)
    const fuelConsumptionRate = 0.002 + this.difficultyLevel * 0.0005; // Reduced from 0.005 to 0.002
    const oldFuel = this.fuel;
    this.fuel -= delta * fuelConsumptionRate;
    
    // Debug fuel consumption
    if (this.fuel <= 10 && this.fuel > 0) {
      console.log("LOW FUEL WARNING:", {
        fuel: this.fuel.toFixed(2),
        consumed: (delta * fuelConsumptionRate).toFixed(4),
        delta,
        fuelConsumptionRate,
        difficultyLevel: this.difficultyLevel
      });
    }
    
    if (this.fuel <= 0) {
      console.log("FUEL DEPLETED - triggering game over:", {
        oldFuel: oldFuel.toFixed(2),
        consumed: (delta * fuelConsumptionRate).toFixed(4),
        gameTime: this.gameTime
      });
      this.fuel = 0;
      // Game over immediately when fuel reaches zero
      this.gameOver();
      return;
    }
    this.gameCallbacks.current.onFuelUpdate(Math.max(0, Math.floor(this.fuel)));

    // Spawn obstacles and powerups
    this.spawnManager(time);

    // Update clouds
    this.updateClouds();

    // Clean up off-screen objects
    this.cleanupObjects();
  }

  updateAltitude() {
    const newAltitude = Math.floor(
      Math.abs(this.balloon.y - this.cameras.main.height) / 10
    );
    if (newAltitude > this.altitude) {
      const altitudeGained = newAltitude - this.altitude;
      this.altitude = newAltitude;
      this.gameCallbacks.current.onAltitudeUpdate(this.altitude);

      // Progressive scoring
      const altitudePoints = altitudeGained * 10 * this.difficultyLevel;
      this.score += altitudePoints;

      // Survival bonus
      if (this.gameTime > 30) {
        this.score += Math.floor(this.gameTime / 10);
      }

      this.gameCallbacks.current.onScoreUpdate(this.score);
    }
  }

  updateBackgroundScroll() {
    // Update TileSprite scrolling to sync with balloon ascent
    if (this.backgroundTile) {
      // Calculate scroll speed based on balloon's ascending movement
      const scrollSpeed = Math.abs(this.currentAscendSpeed) * 0.2; // Match scroll factor
      this.backgroundTile.tilePositionY += scrollSpeed * 0.016; // 60fps normalized
    }
  }

  updateShield(time: number) {
    if (this.shieldActive && time > this.shieldEndTime) {
      this.shieldActive = false;
      this.balloon.clearTint();
      if (this.shieldSprite) {
        this.shieldSprite.destroy();
        this.shieldSprite = undefined;
      }
    }

    // Update shield sprite position if active
    if (this.shieldActive && this.shieldSprite) {
      this.shieldSprite.setPosition(this.balloon.x, this.balloon.y);
    }
  }

  updateDifficulty() {
    if (this.score >= this.nextDifficultyScore) {
      this.difficultyLevel++;
      this.nextDifficultyScore += 1500;
      this.gameSpeed = Math.min(6, this.gameSpeed + 0.4);

      // Visual feedback for level up
      this.cameras.main.flash(500, 255, 255, 255, false);
    }
  }

  spawnManager(time: number) {
    // Dynamic spawn rates based on difficulty
    const obstacleSpawnRate = Math.max(800, 2000 - this.difficultyLevel * 150);
    const powerupSpawnRate = 3500 + this.difficultyLevel * 300;

    if (time - this.lastObstacleTime > obstacleSpawnRate) {
      this.spawnObstacle();
      this.lastObstacleTime = time;
    }

    if (time - this.lastPowerupTime > powerupSpawnRate) {
      this.spawnPowerup();
      this.lastPowerupTime = time;
    }
  }

  setupCollisions() {
    this.physics.add.overlap(
      this.balloon,
      this.obstacles,
      (_balloon, obstacle) => {
        const obstacleSprite = obstacle as Phaser.Physics.Arcade.Sprite;
        const balloonBody = this.balloon.body as Phaser.Physics.Arcade.Body;
        const obstacleBody = obstacleSprite.body as Phaser.Physics.Arcade.Body;

        // Debug collision information
        console.log("=== COLLISION DETECTED ===");
        console.log("Balloon Position:", { x: this.balloon.x, y: this.balloon.y });
        console.log("Balloon Scale:", this.balloon.scale);
        console.log("Balloon Hitbox:", { 
          x: balloonBody.x, 
          y: balloonBody.y, 
          width: balloonBody.width, 
          height: balloonBody.height 
        });
        console.log("Obstacle Position:", { x: obstacleSprite.x, y: obstacleSprite.y });
        console.log("Obstacle Scale:", obstacleSprite.scale);
        console.log("Obstacle Type:", obstacleSprite.getData("type"));
        console.log("Obstacle Hitbox:", { 
          x: obstacleBody.x, 
          y: obstacleBody.y, 
          width: obstacleBody.width, 
          height: obstacleBody.height 
        });
        console.log("Distance between centers:", 
          Math.sqrt(
            Math.pow(this.balloon.x - obstacleSprite.x, 2) + 
            Math.pow(this.balloon.y - obstacleSprite.y, 2)
          )
        );
        console.log("========================");

        if (!this.shieldActive) {
          this.gameOver();
        } else {
          // Destroy obstacle when shielded
          this.destroyObstacle(obstacle as Phaser.Physics.Arcade.Sprite);
          this.score += 50;
          this.gameCallbacks.current.onScoreUpdate(this.score);

          // Visual feedback
          this.cameras.main.shake(100, 0.02);
        }
      }
    );

    this.physics.add.overlap(
      this.balloon,
      this.powerups,
      (_balloon, powerup) => {
        this.collectPowerup(powerup as Phaser.Physics.Arcade.Sprite);
      }
    );
  }

  spawnObstacle() {
    const margin = 60;
    const safeZoneRadius = 120; // Minimum distance from balloon
    let x: number;

    // Ensure obstacle doesn't spawn too close to balloon horizontally
    do {
      x = Phaser.Math.Between(margin, this.cameras.main.width - margin);
    } while (Math.abs(x - this.balloon.x) < safeZoneRadius);

    // Increased spawn distance for better reaction time
    const y = this.balloon.y - 800 - Phaser.Math.Between(0, 300);

    const obstacleTypes = ["bird", "airplane", "ufo"];
    const weights = [0.5, 0.3, 0.2]; // Bird more common, UFO rare
    const obstacleType = this.weightedRandom(obstacleTypes, weights);

    // Check texture existence
    const textureKey = this.textures.exists(obstacleType)
      ? obstacleType
      : `${obstacleType}_fallback`;

    const obstacle = this.physics.add.sprite(x, y, textureKey);
    obstacle.setData("type", obstacleType);

    // Set scale and hitbox based on type with separate configurations
    const obstacleConfigs = {
      bird: { scale: 0.25, hitboxWidth: 0.6, hitboxHeight: 0.8 },
      airplane: { scale: 0.35, hitboxWidth: 0.7, hitboxHeight: 0.5 },
      ufo: { scale: 0.4, hitboxWidth: 0.8, hitboxHeight: 0.6 },
    };

    const config = obstacleConfigs[
      obstacleType as keyof typeof obstacleConfigs
    ] || { scale: 1, hitboxWidth: 0.7, hitboxHeight: 0.7 };

    obstacle.setScale(config.scale);

    // Adjust physics body with separate hitbox for each obstacle type
    const obstacleBody = obstacle.body as Phaser.Physics.Arcade.Body;
    const hitboxWidth = obstacle.width * config.scale * config.hitboxWidth;
    const hitboxHeight = obstacle.height * config.scale * config.hitboxHeight;

    obstacleBody.setSize(hitboxWidth, hitboxHeight);
    obstacleBody.setOffset(
      (obstacle.width - hitboxWidth) / 2,
      (obstacle.height - hitboxHeight) / 2
    );

    this.obstacles.add(obstacle);
    this.addObstacleMovement(obstacle, obstacleType);
  }

  addObstacleMovement(obstacle: Phaser.Physics.Arcade.Sprite, type: string) {
    const obstacleBody = obstacle.body as Phaser.Physics.Arcade.Body;
    const speedMultiplier = 1 + (this.difficultyLevel - 1) * 0.4;

    switch (type) {
      case "bird":
        // Smooth sine wave movement
        const birdSpeed = Phaser.Math.Between(-60, 60) * speedMultiplier;
        obstacleBody.setVelocityX(birdSpeed);
        this.tweens.add({
          targets: obstacle,
          y: obstacle.y + Phaser.Math.Between(-30, 30),
          duration: 2000,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
        break;

      case "airplane":
        // Fast horizontal movement
        const airplaneSpeed = Phaser.Math.Between(-120, 120) * speedMultiplier;
        obstacleBody.setVelocityX(airplaneSpeed);
        obstacle.setAngle(airplaneSpeed > 0 ? 5 : -5);
        break;

      case "ufo":
        // Erratic movement
        this.time.addEvent({
          delay: 1000,
          callback: () => {
            if (obstacle.active) {
              const newSpeed = Phaser.Math.Between(-100, 100) * speedMultiplier;
              obstacleBody.setVelocityX(newSpeed);

              // Teleport effect
              if (Math.random() < 0.15) {
                this.tweens.add({
                  targets: obstacle,
                  alpha: 0,
                  duration: 150,
                  yoyo: true,
                  onComplete: () => {
                    obstacle.x = Phaser.Math.Between(
                      50,
                      this.cameras.main.width - 50
                    );
                  },
                });
              }
            }
          },
          loop: true,
        });
        break;
    }
  }

  spawnPowerup() {
    const margin = 60;
    const x = Phaser.Math.Between(margin, this.cameras.main.width - margin);
    const y = this.balloon.y - 400 - Phaser.Math.Between(0, 150);

    const powerupTypes = ["fuel", "shield"];
    const weights = [0.7, 0.3]; // Fuel more common
    const powerupType = this.weightedRandom(powerupTypes, weights);

    const textureKey = this.textures.exists(powerupType)
      ? powerupType
      : `${powerupType}_fallback`;

    const powerup = this.physics.add.sprite(x, y, textureKey);
    powerup.setScale(0.2); // Match debug scene scale
    powerup.setData("type", powerupType);

    // Adjust physics body to match debug scene - larger hitbox for easier collection
    const powerupBody = powerup.body as Phaser.Physics.Arcade.Body;
    const hitboxExpansion = 2.5; // Match debug scene hitbox expansion
    const hitboxWidth = powerup.width * 0.2 * hitboxExpansion;
    const hitboxHeight = powerup.height * 0.2 * hitboxExpansion;

    powerupBody.setSize(hitboxWidth, hitboxHeight);
    powerupBody.setOffset(
      (powerup.width - hitboxWidth) / 2,
      (powerup.height - hitboxHeight) / 2
    );

    this.powerups.add(powerup);

    // Floating animation
    this.tweens.add({
      targets: powerup,
      y: powerup.y - 15,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Glow effect
    this.tweens.add({
      targets: powerup,
      alpha: 0.7,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  collectPowerup(powerup: Phaser.Physics.Arcade.Sprite) {
    const powerupType = powerup.getData("type");

    switch (powerupType) {
      case "fuel":
        this.fuel = Math.min(100, this.fuel + 30);
        this.score += 100;

        // Boost effect
        const balloonBody = this.balloon.body as Phaser.Physics.Arcade.Body;
        balloonBody.setVelocityY(this.currentAscendSpeed * 1.5);
        this.time.delayedCall(500, () => {
          balloonBody.setVelocityY(this.currentAscendSpeed);
        });
        break;

      case "shield":
        this.activateShield();
        this.score += 200;
        break;
    }

    // Collection effect
    this.createCollectionEffect(powerup);
    powerup.destroy();

    this.gameCallbacks.current.onScoreUpdate(this.score);
    this.gameCallbacks.current.onFuelUpdate(Math.floor(this.fuel));
  }

  activateShield() {
    this.shieldActive = true;
    this.shieldEndTime = this.time.now + 5000;
    this.balloon.setTint(0x0088ff);

    // Create shield visual
    if (!this.shieldSprite) {
      const textureKey = this.textures.exists("shield")
        ? "shield"
        : "shield_fallback";
      this.shieldSprite = this.add.sprite(
        this.balloon.x,
        this.balloon.y,
        textureKey
      );
      this.shieldSprite.setScale(1.5);
      this.shieldSprite.setAlpha(0.5);
      this.shieldSprite.setDepth(11);

      this.tweens.add({
        targets: this.shieldSprite,
        scaleX: 1.8,
        scaleY: 1.8,
        alpha: 0.3,
        duration: 1000,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  createCollectionEffect(sprite: Phaser.Physics.Arcade.Sprite) {
    // Create particle burst effect
    for (let i = 0; i < 8; i++) {
      const particle = this.add.circle(sprite.x, sprite.y, 4, 0xffff00);

      const angle = (i / 8) * Math.PI * 2;
      const speed = 100;

      this.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * speed,
        y: particle.y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0,
        duration: 500,
        ease: "Power2",
        onComplete: () => particle.destroy(),
      });
    }

    // Score popup
    const scoreText = this.add.text(sprite.x, sprite.y, "+100", {
      fontSize: "24px",
      color: "#ffff00",
      fontFamily: "Arial",
    });
    scoreText.setOrigin(0.5);

    this.tweens.add({
      targets: scoreText,
      y: scoreText.y - 50,
      alpha: 0,
      duration: 1000,
      ease: "Power2",
      onComplete: () => scoreText.destroy(),
    });
  }

  destroyObstacle(obstacle: Phaser.Physics.Arcade.Sprite) {
    // Explosion effect
    for (let i = 0; i < 6; i++) {
      const particle = this.add.circle(obstacle.x, obstacle.y, 3, 0xff6600);

      const angle = (i / 6) * Math.PI * 2;
      const speed = 80;

      this.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * speed,
        y: particle.y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0,
        duration: 400,
        ease: "Power2",
        onComplete: () => particle.destroy(),
      });
    }

    obstacle.destroy();
  }

  createInitialClouds() {
    for (let i = 0; i < 15; i++) {
      this.createCloud(
        Phaser.Math.Between(0, this.cameras.main.width),
        Phaser.Math.Between(-2000, this.cameras.main.height)
      );
    }
  }

  createCloud(x: number, y: number) {
    const cloudType = Math.random() > 0.5 ? "cloud1" : "cloud2";
    const textureKey = this.textures.exists(cloudType)
      ? cloudType
      : "cloud_fallback";

    const cloud = this.add.sprite(x, y, textureKey);
    cloud.setScale(Phaser.Math.FloatBetween(0.3, 0.7));
    cloud.setAlpha(Phaser.Math.FloatBetween(0.4, 0.7));
    cloud.setScrollFactor(Phaser.Math.FloatBetween(0.1, 0.3));
    cloud.setDepth(Phaser.Math.Between(0, 2));
    this.clouds.add(cloud);

    // Gentle drift
    this.tweens.add({
      targets: cloud,
      x: cloud.x + Phaser.Math.Between(-30, 30),
      duration: Phaser.Math.Between(10000, 20000),
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  updateClouds() {
    // Add new clouds as we ascend
    if (Math.random() < 0.02 && this.clouds.children.entries.length < 30) {
      this.createCloud(
        Phaser.Math.Between(0, this.cameras.main.width),
        this.balloon.y - 600
      );
    }
  }

  cleanupObjects() {
    const cleanupY = this.balloon.y + 400;
    const cleanupTop = this.balloon.y - 1000;

    // Clean up obstacles
    this.obstacles.children.entries.forEach((obj) => {
      const sprite = obj as Phaser.Physics.Arcade.Sprite;
      if (sprite.y > cleanupY || sprite.y < cleanupTop) {
        sprite.destroy();
      }
    });

    // Clean up powerups
    this.powerups.children.entries.forEach((obj) => {
      const sprite = obj as Phaser.Physics.Arcade.Sprite;
      if (sprite.y > cleanupY || sprite.y < cleanupTop) {
        sprite.destroy();
      }
    });

    // Clean up clouds
    this.clouds.children.entries.forEach((cloud) => {
      const sprite = cloud as Phaser.GameObjects.Sprite;
      if (sprite.y > cleanupY + 200) {
        sprite.destroy();
      }
    });
  }

  gameOver() {
    if (this.isGameOver) return;

    // Debug: Log what caused game over
    console.log("=== GAME OVER TRIGGERED ===");
    console.log("Fuel level:", this.fuel);
    console.log("Balloon position:", { x: this.balloon.x, y: this.balloon.y });
    console.log("Shield active:", this.shieldActive);
    console.log("Game time:", this.gameTime);
    console.log("Score:", this.score);
    console.log("Stack trace:");
    console.trace();
    console.log("========================");

    this.isGameOver = true;
    this.physics.pause();

    // Clean up countdown timer if still running
    if (this.countdownTimer) {
      console.log(
        "Game over - destroying countdown timer:",
        this.countdownTimer
      );
      this.countdownTimer.destroy();
      this.countdownTimer = null as any;
      console.log("Game over - countdown timer destroyed");
    }

    // Stop balloon
    const balloonBody = this.balloon.body as Phaser.Physics.Arcade.Body;
    balloonBody.setVelocity(0, 0);

    // Strong haptic feedback
    if ("vibrate" in navigator) {
      navigator.vibrate([100, 50, 100]);
    }

    // Death animation
    this.cameras.main.shake(500, 0.03);
    this.cameras.main.fade(1000, 0, 0, 0);

    // Balloon fall animation
    this.tweens.add({
      targets: this.balloon,
      y: this.balloon.y + 200,
      angle: 180,
      scale: 0.35,
      alpha: 0.35,
      duration: 1000,
      ease: "Power2",
      onComplete: () => {
        this.gameCallbacks.current.onGameEnd(
          this.score,
          this.altitude,
          Math.floor(this.gameTime)
        );
        this.gameCallbacks.current.onGameStateChange("ended");
      },
    });
  }

  createCountdownUI() {
    // Countdown text
    this.countdownText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 50,
      this.countdownValue.toString(),
      {
        fontSize: "96px",
        fontFamily: 'var(--font-pixelify), "Pixelify Sans", monospace',
        color: "#ffffff",
        stroke: "#4A90E2",
        strokeThickness: 6,
      }
    );
    this.countdownText.setOrigin(0.5);
    this.countdownText.setScrollFactor(0);
    this.countdownText.setDepth(100);

    // Instructions
    this.instructionText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 100,
      "Swipe to move\nCollect fuel to survive!",
      {
        fontSize: "24px",
        fontFamily: 'var(--font-pixelify), "Pixelify Sans", monospace',
        color: "#ffffff",
        align: "center",
        stroke: "#000000",
        strokeThickness: 2,
      }
    );
    this.instructionText.setOrigin(0.5);
    this.instructionText.setScrollFactor(0);
    this.instructionText.setDepth(100);
  }

  startCountdown() {
    // Safety check: prevent multiple countdown timers
    if (this.countdownTimer) {
      this.countdownTimer.destroy();
      this.countdownTimer = null as any;
    }

    // Prevent starting countdown if already completed in this scene
    if (this.countdownCompleted) {
      return;
    }

    // Ensure proper initial state
    this.gameStartTime = this.time.now;
    this.countdownActive = true;
    this.countdownCompleted = false; // Reset completion flag
    this.isGameStarted = false;
    this.countdownValue = 3; // Reset countdown value

    // Countdown timer - store reference for proper cleanup
    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      callback: this.updateCountdown,
      callbackScope: this,
      loop: true,
    });

    console.log("Countdown timer started:", this.countdownTimer);
  }

  updateCountdown() {
    // Prevent execution if countdown already completed
    if (this.countdownCompleted || this.countdownValue <= 0) {
      console.log(
        "UpdateCountdown blocked - completed:",
        this.countdownCompleted,
        "value:",
        this.countdownValue
      );
      return;
    }

    console.log(
      "UpdateCountdown executing - value before decrement:",
      this.countdownValue
    );
    this.countdownValue--;

    if (this.countdownValue > 0) {
      // Update display
      this.countdownText.setText(this.countdownValue.toString());

      // Pulse animation
      this.tweens.add({
        targets: this.countdownText,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 200,
        yoyo: true,
        ease: "Back.easeOut",
      });

      // Sound effect alternative (visual flash)
      this.cameras.main.flash(200, 255, 255, 255, false);

      // Haptic
      if ("vibrate" in navigator) {
        navigator.vibrate(50);
      }
    } else if (this.countdownValue <= 0) {
      // CRITICAL: Stop the timer immediately to prevent infinite loop
      if (this.countdownTimer) {
        console.log("Destroying countdown timer:", this.countdownTimer);
        this.countdownTimer.destroy();
        this.countdownTimer = null as any; // Clear reference
        console.log("Countdown timer destroyed and nullified");
      }

      // Ensure countdown is marked as complete
      this.countdownActive = false;
      this.countdownCompleted = true; // Mark completion to prevent re-execution

      // Show "GO!"
      this.countdownText.setText("GO!");
      this.countdownText.setColor("#00ff00");

      this.tweens.add({
        targets: this.countdownText,
        scaleX: 1.5,
        scaleY: 1.5,
        alpha: 0,
        duration: 500,
        ease: "Power2",
        onComplete: () => {
          this.startGame();
        },
      });

      // Fade out instructions
      this.tweens.add({
        targets: this.instructionText,
        alpha: 0,
        duration: 500,
        onComplete: () => this.instructionText.destroy(),
      });
    }
  }

  startGame() {
    // Clean up countdown
    this.countdownText.destroy();

    // Ensure timer is fully cleaned up
    if (this.countdownTimer) {
      this.countdownTimer.destroy();
      this.countdownTimer = null as any;
    }

    // Start game with clean state
    this.isGameStarted = true;
    this.countdownActive = false;

    // Start balloon ascending
    const balloonBody = this.balloon.body as Phaser.Physics.Arcade.Body;
    this.currentAscendSpeed = this.baseAscendSpeed;
    balloonBody.setVelocityY(this.currentAscendSpeed);

    // Reset timers
    this.gameStartTime = this.time.now;
    this.lastObstacleTime = this.time.now;
    this.lastPowerupTime = this.time.now;

    // Game is now ready - balloon maintains stable scale for smooth gameplay
  }

  // Utility function for weighted random selection
  weightedRandom(items: string[], weights: number[]): string {
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }

    return items[items.length - 1];
  }

  // Scene cleanup method to handle proper destruction
  shutdown() {
    // Clean up countdown timer
    if (this.countdownTimer) {
      this.countdownTimer.destroy();
      this.countdownTimer = null as any;
    }

    // Clean up background tile
    if (this.backgroundTile) {
      this.backgroundTile.destroy();
    }

    // Clean up object pools
    this.objectPool.clear();
  }
}

export default function PhaserGame(props: PhaserGameProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callbacksRef = useRef<PhaserGameProps>(props);

  // Update callbacks ref when props change
  useEffect(() => {
    callbacksRef.current = props;
  }, [props]);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    // Optimized dimensions for mobile portrait mode
    const GAME_WIDTH = 720; // Reduced width for better performance
    const GAME_HEIGHT = 1280; // 16:9 portrait ratio

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      parent: containerRef.current,
      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: true,
        },
      },
      scene: new GameScene(callbacksRef),
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        min: {
          width: 360,
          height: 640,
        },
        max: {
          width: 720,
          height: 1280,
        },
      },
      render: {
        pixelArt: true,
        antialias: false,
        roundPixels: true,
        powerPreference: "high-performance",
      },
      fps: {
        target: 60,
        forceSetTimeOut: false,
      },
      backgroundColor: "#87CEEB",
      input: {
        activePointers: 1,
        smoothFactor: 0,
      },
      disableContextMenu: true,
    };

    // Create game instance
    gameRef.current = new Phaser.Game(config);

    // Handle visibility change for better performance
    const handleVisibilityChange = () => {
      if (!gameRef.current) return;

      if (document.hidden) {
        gameRef.current.pause();
      } else {
        gameRef.current.resume();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []); // Empty dependencies - callbacks are managed via ref

  return (
    <div
      ref={containerRef}
      className="w-full h-full touch-none select-none"
      style={{
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        KhtmlUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        userSelect: "none",
      }}
    />
  );
}
