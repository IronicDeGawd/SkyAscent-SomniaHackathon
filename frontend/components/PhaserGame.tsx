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
    finalTime: number,
    gameEndReason?: string
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
  private gameEndReason: string = "";
  
  // Environmental zones based on altitude
  private currentEnvironmentalZone: 'city' | 'sky' | 'stratosphere' | 'space' = 'city';

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
  
  // New physics-based balloon system
  private buoyancyForce = 80; // Base lift force when fuel available
  private balloonMass = 1; // Balloon mass for physics calculations
  private airResistance = 0.98; // Air resistance factor (0.98 = 2% resistance)
  private terminalVelocity = 150; // Maximum fall speed
  private liftEfficiency = 1.0; // How efficiently fuel converts to lift (1.0 = 100%)
  
  // NEW: Enhanced spawning system
  private currentWavePattern: string = 'none';
  private waveStartTime = 0;
  private waveDuration = 0;
  private playerMovementHistory: number[] = [];
  private comboCount = 0;
  private lastComboTime = 0;
  private dangerZoneActive = false;
  private thermalUpdraftActive = false;
  private windCurrentDirection = 0; // -1 left, 0 none, 1 right

  // Touch control optimization
  private touchStartX = 0;
  private isDragging = false;

  // Keyboard control optimization
  private aKey?: Phaser.Input.Keyboard.Key;
  private dKey?: Phaser.Input.Keyboard.Key;
  private leftKey?: Phaser.Input.Keyboard.Key;
  private rightKey?: Phaser.Input.Keyboard.Key;

  // UI Control buttons
  private leftButton!: Phaser.GameObjects.Sprite;
  private rightButton!: Phaser.GameObjects.Sprite;
  private leftButtonPressed = false;
  private rightButtonPressed = false;

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
    this.load.image("bird_right", "/bird_right.png");
    this.load.image("airplane", "/airplane.png");
    this.load.image("airplane_right", "/airplane_right.png");
    this.load.image("ufo", "/ufo.png");
    this.load.image("fuel", "/fuel.png");
    this.load.image("shield", "/shield.png");
    this.load.image("cloud1", "/cloud1.png");
    this.load.image("cloud2", "/cloud2.png");
    this.load.image("left_arrow", "/left_arrow.png");
    this.load.image("right_arrow", "/right_arrow.png");

    this.load.image("background", "/bg_extend.webp");
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
    graphics.clear();

    // Left arrow fallback (blue triangle pointing left)
    graphics.fillStyle(0x0088ff, 1);
    graphics.fillTriangle(10, 30, 50, 10, 50, 50);
    graphics.generateTexture("left_arrow_fallback", 60, 60);
    graphics.clear();

    // Right arrow fallback (blue triangle pointing right)
    graphics.fillStyle(0x0088ff, 1);
    graphics.fillTriangle(50, 30, 10, 10, 10, 50);
    graphics.generateTexture("right_arrow_fallback", 60, 60);

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

    // Create control buttons
    this.createControlButtons();

    // Create countdown UI
    this.createCountdownUI();

    // Start countdown
    this.startCountdown();

    this.gameCallbacks.current.onGameStateChange("playing");
  }

  createRepeatingBackground() {
    // Use the background texture we loaded (bg_extend.png)
    const backgroundKey = "background";

    // Create repeating TileSprite background with fallback to gradient
    if (this.textures.exists(backgroundKey)) {
      // Create TileSprite sized to camera viewport for proper infinite scrolling
      this.backgroundTile = this.add.tileSprite(
        0,
        0,
        this.cameras.main.width,
        this.cameras.main.height,
        backgroundKey
      );
      this.backgroundTile.setOrigin(0, 0);
      this.backgroundTile.setDepth(-1000); // Far behind everything
      this.backgroundTile.setScrollFactor(0); // Fixed to camera viewport
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
    // Pre-create objects for pooling with initial capacity
    this.objectPool.set("obstacles", []);
    this.objectPool.set("powerups", []);
    this.objectPool.set("clouds", []);
    
    // Pre-create initial pool objects for better performance
    for (let i = 0; i < 10; i++) {
      // Pre-create obstacle sprites
      const obstacleSprite = this.physics.add.sprite(-1000, -1000, 'bird_fallback');
      obstacleSprite.setActive(false).setVisible(false);
      this.objectPool.get("obstacles")!.push(obstacleSprite);
      
      // Pre-create powerup sprites  
      const powerupSprite = this.physics.add.sprite(-1000, -1000, 'fuel_fallback');
      powerupSprite.setActive(false).setVisible(false);
      this.objectPool.get("powerups")!.push(powerupSprite);
    }
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
    // Keep swipe controls as backup, but make them less sensitive
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver || !this.isGameStarted) return;

      this.touchStartX = pointer.x;
      this.isDragging = true;
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || this.isGameOver || !this.isGameStarted) return;

      const deltaX = pointer.x - this.touchStartX;
      // Increased threshold to prevent accidental swipes while using buttons
      if (Math.abs(deltaX) > 30) {
        this.handleContinuousMovement(deltaX);
        this.touchStartX = pointer.x;
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

  createControlButtons() {
    // Calculate button positioning based on screen size
    const buttonSize = Math.min(this.cameras.main.width * 0.12, 80); // 12% of width or max 80px
    const bottomMargin = this.cameras.main.height * 0.15; // 15% from bottom
    const sideMargin = this.cameras.main.width * 0.08; // 8% from sides

    // Create left arrow button with fallback
    const leftArrowTexture = this.textures.exists("left_arrow") 
      ? "left_arrow" 
      : "left_arrow_fallback";
    this.leftButton = this.add.sprite(
      sideMargin + buttonSize / 2,
      this.cameras.main.height - bottomMargin,
      leftArrowTexture
    );
    this.leftButton.setScale(buttonSize / this.leftButton.width);
    this.leftButton.setScrollFactor(0); // Fixed to camera
    this.leftButton.setDepth(200); // Above all game elements
    this.leftButton.setInteractive();
    this.leftButton.setAlpha(0.8); // Slightly transparent

    // Create right arrow button with fallback
    const rightArrowTexture = this.textures.exists("right_arrow") 
      ? "right_arrow" 
      : "right_arrow_fallback";
    this.rightButton = this.add.sprite(
      this.cameras.main.width - sideMargin - buttonSize / 2,
      this.cameras.main.height - bottomMargin,
      rightArrowTexture
    );
    this.rightButton.setScale(buttonSize / this.rightButton.width);
    this.rightButton.setScrollFactor(0); // Fixed to camera
    this.rightButton.setDepth(200); // Above all game elements
    this.rightButton.setInteractive();
    this.rightButton.setAlpha(0.8); // Slightly transparent

    // Add button interactions
    this.setupButtonInteractions();
  }

  setupButtonInteractions() {
    // Left button interactions
    this.leftButton.on("pointerdown", () => {
      if (!this.isGameOver && this.isGameStarted) {
        this.leftButtonPressed = true;
        this.handleSwipe("left"); // Initial movement
        this.leftButton.setAlpha(1.0); // Full opacity when pressed
        this.leftButton.setScale(this.leftButton.scale * 0.95); // Slight scale down
      }
    });

    this.leftButton.on("pointerup", () => {
      this.leftButtonPressed = false;
      this.leftButton.setAlpha(0.8);
      this.leftButton.setScale(this.leftButton.scale / 0.95); // Reset scale
    });

    this.leftButton.on("pointerout", () => {
      this.leftButtonPressed = false;
      this.leftButton.setAlpha(0.8);
      this.leftButton.setScale(this.leftButton.scale / 0.95); // Reset scale
    });

    // Right button interactions
    this.rightButton.on("pointerdown", () => {
      if (!this.isGameOver && this.isGameStarted) {
        this.rightButtonPressed = true;
        this.handleSwipe("right"); // Initial movement
        this.rightButton.setAlpha(1.0); // Full opacity when pressed
        this.rightButton.setScale(this.rightButton.scale * 0.95); // Slight scale down
      }
    });

    this.rightButton.on("pointerup", () => {
      this.rightButtonPressed = false;
      this.rightButton.setAlpha(0.8);
      this.rightButton.setScale(this.rightButton.scale / 0.95); // Reset scale
    });

    this.rightButton.on("pointerout", () => {
      this.rightButtonPressed = false;
      this.rightButton.setAlpha(0.8);
      this.rightButton.setScale(this.rightButton.scale / 0.95); // Reset scale
    });

    // Show/hide buttons based on game state
    this.updateButtonVisibility();
  }

  updateButtonVisibility() {
    const visible = this.isGameStarted && !this.isGameOver && !this.countdownActive;
    this.leftButton.setVisible(visible);
    this.rightButton.setVisible(visible);
  }

  handleKeyboardInput() {
    // Only process keyboard input if game is active
    if (this.isGameOver || !this.isGameStarted || this.fuel <= 0) return;

    // Check for continuous key presses (holding down keys) or button presses
    const leftPressed = this.aKey?.isDown || this.leftKey?.isDown || this.leftButtonPressed;
    const rightPressed = this.dKey?.isDown || this.rightKey?.isDown || this.rightButtonPressed;

    // Apply continuous movement when keys/buttons are held down
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

    // NEW: Fuel consumption based on movement intensity
    const movementIntensity = Math.abs(deltaX) / 100; // 0-1 scale
    const fuelConsumption = movementIntensity * 0.15; // Max 0.15 fuel per movement
    this.fuel = Math.max(0, this.fuel - fuelConsumption);
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

    // NEW: Moderate fuel consumption for discrete movements
    this.fuel = Math.max(0, this.fuel - 0.3);

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
    
    // NEW: Track player movement for adaptive spawning
    this.trackPlayerMovement();

    // NEW: Physics-based balloon movement with proper buoyancy
    this.updateBalloonPhysics(delta);

    // Update altitude
    this.updateAltitude();

    // Update background scrolling
    this.updateBackgroundScroll();

    // Update shield
    this.updateShield(time);

    // Update difficulty
    this.updateDifficulty();

    // NEW: No passive fuel consumption - fuel only consumed during movement
    // Fuel depletion handled in updateBalloonPhysics() and movement functions
    
    if (this.fuel <= 0) {
      this.fuel = 0;
      this.gameEndReason = "Out of fuel!";
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
    // Update TileSprite scrolling for infinite background repetition
    if (this.backgroundTile) {
      // NEW: Calculate scroll speed based on balloon's actual velocity
      const balloonBody = this.balloon.body as Phaser.Physics.Arcade.Body;
      const scrollSpeed = Math.abs(balloonBody.velocity.y) * 0.3; // Parallax effect multiplier

      // Update tile position for continuous scrolling effect
      // Positive values scroll the texture downward, creating upward movement illusion
      this.backgroundTile.tilePositionY += scrollSpeed * 0.016; // 60fps normalized

      // TileSprite handles infinite repetition automatically - no need to reset position
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

      // Visual feedback for level up (removed flash to prevent screen flashing)
      // this.cameras.main.flash(500, 255, 255, 255, false);
    }
  }

  // NEW: Physics-based balloon movement system
  updateBalloonPhysics(delta: number) {
    const balloonBody = this.balloon.body as Phaser.Physics.Arcade.Body;
    const deltaSeconds = delta / 1000;
    
    // Get current velocity
    let currentVelocityY = balloonBody.velocity.y;
    
    if (this.fuel > 0) {
      // Calculate buoyancy force based on fuel level
      const fuelRatio = this.fuel / 100; // 0-1 range
      const effectiveBuoyancy = this.buoyancyForce * fuelRatio * this.liftEfficiency;
      
      // Apply buoyancy force (negative Y = upward)
      const buoyancyVelocity = -effectiveBuoyancy;
      
      // Combine with current velocity and apply air resistance
      const targetVelocity = (currentVelocityY + buoyancyVelocity) * this.airResistance;
      
      // Smooth transition to target velocity
      const smoothedVelocity = Phaser.Math.Linear(currentVelocityY, targetVelocity, deltaSeconds * 2);
      balloonBody.setVelocityY(smoothedVelocity);
      
    } else {
      // No fuel: balloon falls with gravity, but with air resistance
      const gravity = 100; // Gravity force when no fuel
      const fallVelocity = currentVelocityY + (gravity * deltaSeconds);
      
      // Apply air resistance and terminal velocity limit
      const resistedVelocity = Math.min(fallVelocity * this.airResistance, this.terminalVelocity);
      balloonBody.setVelocityY(resistedVelocity);
    }
  }

  spawnManager(time: number) {
    // Update environmental zone based on altitude
    this.updateEnvironmentalZone();
    
    // NEW: Intelligent wave-based spawning system
    this.manageWavePatterns(time);
    
    // Adaptive spawning rates based on multiple factors
    const baseObstacleRate = this.getAdaptiveSpawnRate('obstacles');
    const basePowerupRate = this.getAdaptiveSpawnRate('powerups');

    if (time - this.lastObstacleTime > baseObstacleRate) {
      if (this.currentWavePattern !== 'none') {
        this.spawnWaveObstacle();
      } else {
        this.spawnObstacle();
      }
      this.lastObstacleTime = time;
    }

    if (time - this.lastPowerupTime > basePowerupRate) {
      this.spawnPowerup();
      this.lastPowerupTime = time;
    }
    
    // Spawn special environmental elements
    if (Math.random() < 0.003) { // 0.3% chance per frame
      this.spawnEnvironmentalElement(time);
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

        // Collision detected - removed debug logging for performance

        if (!this.shieldActive) {
          this.gameEndReason = `Hit by ${obstacleSprite.getData("type")}!`;
          this.createDamageParticles(this.balloon.x, this.balloon.y);
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

    // Determine if spawning from right side and choose appropriate texture
    const spawnDirection = x > this.cameras.main.centerX ? "right" : "left";
    let textureKey = obstacleType;

    // Use directional sprites for birds and airplanes when spawning from right
    if (
      spawnDirection === "right" &&
      (obstacleType === "bird" || obstacleType === "airplane")
    ) {
      const rightTextureKey = `${obstacleType}_right`;
      textureKey = this.textures.exists(rightTextureKey)
        ? rightTextureKey
        : obstacleType;
    }

    // Fallback to generated texture if main texture doesn't exist
    if (!this.textures.exists(textureKey)) {
      textureKey = `${obstacleType}_fallback`;
    }

    // Try to get pooled object first, create new if none available
    let obstacle = this.getPooledObject("obstacles", textureKey);
    if (!obstacle) {
      obstacle = this.physics.add.sprite(x, y, textureKey);
    } else {
      obstacle.setPosition(x, y);
      obstacle.setTexture(textureKey);
    }
    
    obstacle.setData("direction", spawnDirection);
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

    // NEW: Enhanced power-up types with environmental consideration
    const powerupTypes = this.getEnvironmentalPowerups();
    const powerupType = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];

    const textureKey = this.textures.exists(powerupType)
      ? powerupType
      : `${powerupType}_fallback`;

    // Try to get pooled object first, create new if none available
    let powerup = this.getPooledObject("powerups", textureKey);
    if (!powerup) {
      powerup = this.physics.add.sprite(x, y, textureKey);
    } else {
      powerup.setPosition(x, y);
      powerup.setTexture(textureKey);
    }
    
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

    // NEW: Enhanced power-up effects with combo system
    this.handleComboSystem();

    switch (powerupType) {
      case "fuel":
        this.fuel = Math.min(100, this.fuel + 30);
        this.score += 100 * this.getComboMultiplier();

        // NEW: Fuel boost effect - temporary lift efficiency increase
        this.liftEfficiency = 2.0; // Double efficiency for 3 seconds
        this.time.delayedCall(3000, () => {
          this.liftEfficiency = 1.0; // Reset to normal
        });
        break;

      case "shield":
        this.activateShield();
        this.score += 200 * this.getComboMultiplier();
        break;
        
      case "thermal":
        this.activateThermalUpdraft();
        this.score += 150 * this.getComboMultiplier();
        break;
        
      case "wind":
        this.activateWindCurrent();
        this.score += 120 * this.getComboMultiplier();
        break;
        
      case "turbo":
        this.activateTurboBoost();
        this.score += 300 * this.getComboMultiplier();
        break;
    }

    // Collection effect
    this.createCollectionEffect(powerup);
    this.returnToPool(powerup, "powerups");

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
      this.shieldSprite.setScale(0.5);
      this.shieldSprite.setAlpha(0.5);
      this.shieldSprite.setDepth(8);

      this.tweens.add({
        targets: this.shieldSprite,
        scaleX: 0.6,
        scaleY: 0.6,
        alpha: 0.1,
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

    // Calculate responsive font size for score popup
    const scaleFactor = Math.min(
      this.cameras.main.width / 720,
      this.cameras.main.height / 1280
    );
    const scorePopupFontSize = Math.max(32, 40 * scaleFactor); // Responsive score popup font

    // Score popup
    const scoreText = this.add.text(sprite.x, sprite.y, "+100", {
      fontSize: `${scorePopupFontSize}px`,
      color: "#ffff00",
      fontFamily: 'var(--font-pixelify), "Pixelify Sans", monospace',
      stroke: "#000000",
      strokeThickness: Math.max(2, 3 * scaleFactor),
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

  createDamageParticles(x: number, y: number) {
    // Create red/orange damage particles explosion
    for (let i = 0; i < 12; i++) {
      const particle = this.add.circle(
        x,
        y,
        Phaser.Math.Between(3, 8),
        Phaser.Math.Between(0xff0000, 0xff8800)
      );

      const angle =
        (i / 12) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.5, 0.5);
      const speed = Phaser.Math.Between(80, 150);
      const gravity = Phaser.Math.Between(50, 100);

      this.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * speed,
        y: particle.y + Math.sin(angle) * speed + gravity,
        alpha: 0,
        scale: 0,
        duration: Phaser.Math.Between(800, 1200),
        ease: "Power2",
        onComplete: () => particle.destroy(),
      });
    }

    // Create sparks effect
    for (let i = 0; i < 6; i++) {
      const spark = this.add.rectangle(x, y, 2, 8, 0xffff00);
      const angle = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.Between(100, 200);

      spark.setRotation(angle);

      this.tweens.add({
        targets: spark,
        x: spark.x + Math.cos(angle) * speed,
        y: spark.y + Math.sin(angle) * speed,
        alpha: 0,
        scaleX: 0,
        duration: 600,
        ease: "Power2",
        onComplete: () => spark.destroy(),
      });
    }
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

    // Clean up obstacles - use object pooling instead of destroying
    const obstaclesToRemove: Phaser.Physics.Arcade.Sprite[] = [];
    this.obstacles.children.entries.forEach((obj) => {
      const sprite = obj as Phaser.Physics.Arcade.Sprite;
      if (sprite.y > cleanupY || sprite.y < cleanupTop) {
        obstaclesToRemove.push(sprite);
      }
    });
    
    obstaclesToRemove.forEach(sprite => {
      this.obstacles.remove(sprite);
      this.returnToPool(sprite, "obstacles");
    });

    // Clean up powerups - use object pooling instead of destroying
    const powerupsToRemove: Phaser.Physics.Arcade.Sprite[] = [];
    this.powerups.children.entries.forEach((obj) => {
      const sprite = obj as Phaser.Physics.Arcade.Sprite;
      if (sprite.y > cleanupY || sprite.y < cleanupTop) {
        powerupsToRemove.push(sprite);
      }
    });
    
    powerupsToRemove.forEach(sprite => {
      this.powerups.remove(sprite);
      this.returnToPool(sprite, "powerups");
    });

    // Clean up clouds - limit total count instead of destroying all
    const cloudsToRemove: Phaser.GameObjects.Sprite[] = [];
    this.clouds.children.entries.forEach((cloud) => {
      const sprite = cloud as Phaser.GameObjects.Sprite;
      if (sprite.y > cleanupY + 200) {
        cloudsToRemove.push(sprite);
      }
    });
    
    // Only remove excess clouds, keep some for performance
    cloudsToRemove.slice(0, Math.max(0, cloudsToRemove.length - 5)).forEach(sprite => {
      sprite.destroy();
    });
  }

  gameOver() {
    if (this.isGameOver) return;

    // Game over triggered - removed debug logging for performance

    this.isGameOver = true;
    this.physics.pause();

    // Hide control buttons
    this.updateButtonVisibility();

    // Clean up countdown timer if still running
    if (this.countdownTimer) {
      this.countdownTimer.destroy();
      this.countdownTimer = null as any;
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

    // Calculate responsive font size for death message
    const scaleFactor = Math.min(
      this.cameras.main.width / 720,
      this.cameras.main.height / 1280
    );
    const deathMessageFontSize = Math.max(42, 56 * scaleFactor); // Responsive death message font

    // Show game end reason
    const reasonText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 100,
      this.gameEndReason,
      {
        fontSize: `${deathMessageFontSize}px`,
        fontFamily: 'var(--font-pixelify), "Pixelify Sans", monospace',
        color: "#ff4444",
        stroke: "#000000",
        strokeThickness: Math.max(3, 4 * scaleFactor), // Responsive stroke
        align: "center",
      }
    );
    reasonText.setOrigin(0.5);
    reasonText.setScrollFactor(0);
    reasonText.setDepth(101);
    reasonText.setAlpha(0);

    // Animate reason text
    this.tweens.add({
      targets: reasonText,
      alpha: 1,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 800,
      ease: "Back.easeOut",
    });

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
          Math.floor(this.gameTime),
          this.gameEndReason
        );
        this.gameCallbacks.current.onGameStateChange("ended");
      },
    });
  }

  createCountdownUI() {
    // Calculate responsive font size based on camera dimensions
    const scaleFactor = Math.min(
      this.cameras.main.width / 720,
      this.cameras.main.height / 1280
    );
    // Increased minimum and base size for better visibility
    const responsiveFontSize = Math.max(120, 180 * scaleFactor); // Increased minimum from 80px to 120px, base from 128 to 180
    const instructionFontSize = Math.max(28, 36 * scaleFactor); // Responsive instruction text

    // Countdown text
    this.countdownText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 50,
      this.countdownValue.toString(),
      {
        fontSize: `${responsiveFontSize}px`,
        fontFamily: 'var(--font-pixelify), "Pixelify Sans", monospace',
        color: "#ffffff",
        stroke: "#4A90E2",
        strokeThickness: Math.max(3, 5 * scaleFactor), // Increased stroke thickness
      }
    );
    this.countdownText.setOrigin(0.5);
    this.countdownText.setScrollFactor(0);
    this.countdownText.setDepth(100);

    // Instructions
    this.instructionText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 100,
      "Use arrow buttons to move\nCollect fuel to survive!",
      {
        fontSize: `${instructionFontSize}px`,
        fontFamily: 'var(--font-pixelify), "Pixelify Sans", monospace',
        color: "#ffffff",
        align: "center",
        stroke: "#000000",
        strokeThickness: Math.max(2, 3 * scaleFactor), // Responsive stroke thickness
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

    // Countdown timer started - removed debug logging
  }

  updateCountdown() {
    // Prevent execution if countdown already completed
    if (this.countdownCompleted || this.countdownValue <= 0) {
      return;
    }
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
        this.countdownTimer.destroy();
        this.countdownTimer = null as any; // Clear reference
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

    // Show control buttons
    this.updateButtonVisibility();

    // NEW: Initialize balloon physics system
    const balloonBody = this.balloon.body as Phaser.Physics.Arcade.Body;
    balloonBody.setVelocityY(-this.buoyancyForce); // Start with initial upward velocity

    // Reset timers
    this.gameStartTime = this.time.now;
    this.lastObstacleTime = this.time.now;
    this.lastPowerupTime = this.time.now;

    // Game is now ready - balloon maintains stable scale for smooth gameplay
  }

  // NEW: Environmental zone management
  updateEnvironmentalZone() {
    const altitude = this.altitude;
    let newZone: 'city' | 'sky' | 'stratosphere' | 'space';
    
    if (altitude < 1000) {
      newZone = 'city';
    } else if (altitude < 3000) {
      newZone = 'sky';
    } else if (altitude < 6000) {
      newZone = 'stratosphere';
    } else {
      newZone = 'space';
    }
    
    if (newZone !== this.currentEnvironmentalZone) {
      this.currentEnvironmentalZone = newZone;
      this.onEnvironmentalZoneChange(newZone);
    }
  }
  
  onEnvironmentalZoneChange(newZone: string) {
    // Visual feedback for zone transitions
    this.cameras.main.flash(1000, 100, 150, 255, false);
    
    // Create zone transition particles
    for (let i = 0; i < 20; i++) {
      const particle = this.add.circle(
        this.balloon.x + Phaser.Math.Between(-100, 100),
        this.balloon.y + Phaser.Math.Between(-50, 50),
        Phaser.Math.Between(2, 6),
        0x00ffff
      );
      
      this.tweens.add({
        targets: particle,
        alpha: 0,
        scale: 0,
        duration: 1500,
        ease: "Power2",
        onComplete: () => particle.destroy(),
      });
    }
  }

  // NEW: Intelligent wave pattern management
  manageWavePatterns(time: number) {
    // Check if current wave has ended
    if (this.currentWavePattern !== 'none' && time > this.waveStartTime + this.waveDuration) {
      this.currentWavePattern = 'none';
    }
    
    // Start new wave pattern if none active
    if (this.currentWavePattern === 'none' && Math.random() < 0.002) { // 0.2% chance per frame
      this.startNewWavePattern(time);
    }
  }
  
  startNewWavePattern(time: number) {
    const wavePatterns = ['vformation', 'wall', 'spiral', 'scatter', 'funnel'];
    const weights = [0.25, 0.20, 0.15, 0.25, 0.15]; // Different probabilities for each pattern
    
    this.currentWavePattern = this.weightedRandom(wavePatterns, weights);
    this.waveStartTime = time;
    this.waveDuration = Phaser.Math.Between(3000, 7000); // 3-7 seconds
  }

  // NEW: Adaptive spawn rate calculation
  getAdaptiveSpawnRate(type: 'obstacles' | 'powerups'): number {
    let baseRate: number;
    let difficultyMultiplier: number;
    
    if (type === 'obstacles') {
      baseRate = 2000;
      difficultyMultiplier = this.difficultyLevel * 120;
      
      // Adjust based on player movement patterns
      const avgMovement = this.getAverageMovement();
      if (avgMovement > 0.7) { // Very active player
        baseRate *= 0.8; // Spawn more frequently
      } else if (avgMovement < 0.3) { // Passive player
        baseRate *= 1.2; // Spawn less frequently
      }
      
    } else { // powerups
      baseRate = 4000;
      difficultyMultiplier = this.difficultyLevel * 200;
      
      // More powerups in higher difficulty zones
      if (this.currentEnvironmentalZone === 'stratosphere' || this.currentEnvironmentalZone === 'space') {
        baseRate *= 0.7; // More frequent powerups at high altitude
      }
    }
    
    return Math.max(600, baseRate - difficultyMultiplier);
  }
  
  getAverageMovement(): number {
    if (this.playerMovementHistory.length === 0) return 0;
    const sum = this.playerMovementHistory.reduce((a, b) => a + b, 0);
    return sum / this.playerMovementHistory.length;
  }

  // NEW: Wave-based obstacle spawning
  spawnWaveObstacle() {
    switch (this.currentWavePattern) {
      case 'vformation':
        this.spawnVFormation();
        break;
      case 'wall':
        this.spawnWallPattern();
        break;
      case 'spiral':
        this.spawnSpiralPattern();
        break;
      case 'scatter':
        this.spawnScatterPattern();
        break;
      case 'funnel':
        this.spawnFunnelPattern();
        break;
      default:
        this.spawnObstacle();
    }
  }

  spawnVFormation() {
    const centerX = this.cameras.main.centerX;
    const y = this.balloon.y - 600;
    const spacing = 80;
    
    // Create V formation with 5 obstacles
    for (let i = 0; i < 5; i++) {
      const xOffset = (i - 2) * spacing;
      const yOffset = Math.abs(i - 2) * 40; // V shape
      this.spawnObstacleAt(centerX + xOffset, y - yOffset);
    }
  }
  
  spawnWallPattern() {
    const y = this.balloon.y - 600;
    const gapPosition = Phaser.Math.Between(1, 4); // Gap position in wall
    const spacing = this.cameras.main.width / 6;
    
    // Create wall with gap
    for (let i = 0; i < 6; i++) {
      if (i !== gapPosition) {
        this.spawnObstacleAt(spacing * i + spacing/2, y);
      }
    }
  }
  
  spawnSpiralPattern() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.balloon.y - 500;
    const radius = 120;
    
    // Create spiral with 8 obstacles
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius * 0.5; // Flatten spiral
      this.spawnObstacleAt(x, y);
    }
  }
  
  spawnScatterPattern() {
    const count = Phaser.Math.Between(3, 6);
    const minY = this.balloon.y - 800;
    const maxY = this.balloon.y - 400;
    
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(60, this.cameras.main.width - 60);
      const y = Phaser.Math.Between(minY, maxY);
      
      // Ensure not too close to balloon
      if (Math.abs(x - this.balloon.x) > 100) {
        this.spawnObstacleAt(x, y);
      }
    }
  }
  
  spawnFunnelPattern() {
    const centerX = this.cameras.main.centerX;
    const topY = this.balloon.y - 700;
    const bottomY = this.balloon.y - 400;
    const topWidth = 200;
    const bottomWidth = 80;
    
    // Create funnel shape with multiple rows
    for (let row = 0; row < 4; row++) {
      const y = topY + (bottomY - topY) * (row / 3);
      const width = topWidth - (topWidth - bottomWidth) * (row / 3);
      
      // Left and right sides of funnel
      this.spawnObstacleAt(centerX - width/2, y);
      this.spawnObstacleAt(centerX + width/2, y);
    }
  }
  
  spawnObstacleAt(x: number, y: number) {
    // Ensure coordinates are within bounds
    x = Phaser.Math.Clamp(x, 60, this.cameras.main.width - 60);
    
    const obstacleTypes = this.getEnvironmentalObstacles();
    const obstacleType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    
    // Create obstacle with environmental texture
    let textureKey = obstacleType;
    if (!this.textures.exists(textureKey)) {
      textureKey = `${obstacleType}_fallback`;
    }
    
    let obstacle = this.getPooledObject("obstacles", textureKey);
    if (!obstacle) {
      obstacle = this.physics.add.sprite(x, y, textureKey);
    } else {
      obstacle.setPosition(x, y);
      obstacle.setTexture(textureKey);
    }
    
    obstacle.setData("type", obstacleType);
    obstacle.setData("waveSpawned", true);
    
    // Apply obstacle configuration
    const config = this.getObstacleConfig(obstacleType);
    obstacle.setScale(config.scale);
    
    const obstacleBody = obstacle.body as Phaser.Physics.Arcade.Body;
    const hitboxWidth = obstacle.width * config.scale * config.hitboxWidth;
    const hitboxHeight = obstacle.height * config.scale * config.hitboxHeight;
    obstacleBody.setSize(hitboxWidth, hitboxHeight);
    
    this.obstacles.add(obstacle);
    this.addObstacleMovement(obstacle, obstacleType);
  }
  
  getEnvironmentalObstacles(): string[] {
    switch (this.currentEnvironmentalZone) {
      case 'city':
        return ['bird', 'airplane'];
      case 'sky':
        return ['bird', 'airplane', 'ufo'];
      case 'stratosphere':
        return ['airplane', 'ufo'];
      case 'space':
        return ['ufo'];
      default:
        return ['bird', 'airplane', 'ufo'];
    }
  }
  
  getObstacleConfig(obstacleType: string) {
    const configs = {
      bird: { scale: 0.25, hitboxWidth: 0.6, hitboxHeight: 0.8 },
      airplane: { scale: 0.35, hitboxWidth: 0.7, hitboxHeight: 0.5 },
      ufo: { scale: 0.4, hitboxWidth: 0.8, hitboxHeight: 0.6 },
    };
    return configs[obstacleType as keyof typeof configs] || { scale: 1, hitboxWidth: 0.7, hitboxHeight: 0.7 };
  }

  // NEW: Environmental power-up types
  getEnvironmentalPowerups(): string[] {
    const basePowerups = ['fuel', 'shield'];
    
    switch (this.currentEnvironmentalZone) {
      case 'city':
        return [...basePowerups, 'wind']; // Wind currents common in city
      case 'sky':
        return [...basePowerups, 'thermal', 'wind']; // Thermals and winds
      case 'stratosphere':
        return [...basePowerups, 'thermal', 'turbo']; // Rare turbo boost
      case 'space':
        return ['fuel', 'turbo']; // Only advanced powerups in space
      default:
        return basePowerups;
    }
  }

  // NEW: Enhanced power-up effects
  activateThermalUpdraft() {
    this.thermalUpdraftActive = true;
    this.liftEfficiency = 3.0; // Triple efficiency
    this.buoyancyForce *= 1.5; // Stronger lift
    
    // Visual thermal effect
    for (let i = 0; i < 15; i++) {
      const particle = this.add.circle(
        this.balloon.x + Phaser.Math.Between(-50, 50),
        this.balloon.y + Phaser.Math.Between(0, 100),
        Phaser.Math.Between(3, 8),
        0xff6600
      );
      
      this.tweens.add({
        targets: particle,
        y: particle.y - 200,
        alpha: 0,
        scale: 0.2,
        duration: 2000,
        ease: "Power2",
        onComplete: () => particle.destroy(),
      });
    }
    
    // Reset after 5 seconds
    this.time.delayedCall(5000, () => {
      this.thermalUpdraftActive = false;
      this.liftEfficiency = 1.0;
      this.buoyancyForce /= 1.5;
    });
  }
  
  activateWindCurrent() {
    this.windCurrentDirection = Math.random() > 0.5 ? 1 : -1; // Random direction
    
    // Apply wind force to balloon
    const balloonBody = this.balloon.body as Phaser.Physics.Arcade.Body;
    const windForce = this.windCurrentDirection * 60;
    balloonBody.setVelocityX(balloonBody.velocity.x + windForce);
    
    // Visual wind effect
    for (let i = 0; i < 10; i++) {
      const particle = this.add.rectangle(
        this.balloon.x + Phaser.Math.Between(-100, 100),
        this.balloon.y + Phaser.Math.Between(-50, 50),
        Phaser.Math.Between(20, 40),
        2,
        0x87ceeb
      );
      
      this.tweens.add({
        targets: particle,
        x: particle.x + (this.windCurrentDirection * 150),
        alpha: 0,
        duration: 1500,
        ease: "Power2",
        onComplete: () => particle.destroy(),
      });
    }
    
    // Reset after 4 seconds
    this.time.delayedCall(4000, () => {
      this.windCurrentDirection = 0;
    });
  }
  
  activateTurboBoost() {
    // Temporary massive speed boost
    const balloonBody = this.balloon.body as Phaser.Physics.Arcade.Body;
    this.liftEfficiency = 4.0; // Quadruple efficiency
    this.buoyancyForce *= 2; // Double buoyancy
    
    // Turbo visual effects
    this.balloon.setTint(0x00ff00); // Green tint
    
    for (let i = 0; i < 20; i++) {
      const particle = this.add.circle(
        this.balloon.x + Phaser.Math.Between(-30, 30),
        this.balloon.y + Phaser.Math.Between(20, 60),
        Phaser.Math.Between(2, 5),
        0x00ff00
      );
      
      this.tweens.add({
        targets: particle,
        y: particle.y + 150,
        alpha: 0,
        scale: 0,
        duration: 800,
        ease: "Power2",
        onComplete: () => particle.destroy(),
      });
    }
    
    // Camera shake for impact
    this.cameras.main.shake(200, 0.01);
    
    // Reset after 3 seconds
    this.time.delayedCall(3000, () => {
      this.liftEfficiency = 1.0;
      this.buoyancyForce /= 2;
      this.balloon.clearTint();
    });
  }

  // NEW: Combo system
  handleComboSystem() {
    const currentTime = this.time.now;
    
    if (currentTime - this.lastComboTime < 3000) { // Within 3 seconds
      this.comboCount++;
    } else {
      this.comboCount = 1; // Reset combo
    }
    
    this.lastComboTime = currentTime;
    
    // Show combo text
    if (this.comboCount > 1) {
      const comboText = this.add.text(
        this.balloon.x,
        this.balloon.y - 80,
        `COMBO x${this.comboCount}!`,
        {
          fontSize: '28px',
          color: '#ffff00',
          fontFamily: 'var(--font-pixelify), "Pixelify Sans", monospace',
          stroke: '#000000',
          strokeThickness: 3,
        }
      );
      comboText.setOrigin(0.5);
      
      this.tweens.add({
        targets: comboText,
        y: comboText.y - 40,
        alpha: 0,
        scale: 1.5,
        duration: 1500,
        ease: "Power2",
        onComplete: () => comboText.destroy(),
      });
    }
  }
  
  getComboMultiplier(): number {
    return Math.min(3, 1 + (this.comboCount - 1) * 0.5); // Max 3x multiplier
  }

  // NEW: Environmental element spawning
  spawnEnvironmentalElement(time: number) {
    const elementTypes = ['dangerZone', 'bonusAltitude'];
    const elementType = elementTypes[Math.floor(Math.random() * elementTypes.length)];
    
    switch (elementType) {
      case 'dangerZone':
        this.createDangerZone();
        break;
      case 'bonusAltitude':
        this.createBonusAltitudeZone();
        break;
    }
  }
  
  createDangerZone() {
    if (this.dangerZoneActive) return;
    
    this.dangerZoneActive = true;
    const width = this.cameras.main.width;
    const height = 150;
    const x = 0;
    const y = this.balloon.y - 500;
    
    // Create danger zone visual
    const dangerZone = this.add.rectangle(x, y, width, height, 0xff0000, 0.3);
    dangerZone.setOrigin(0, 0);
    
    // Pulsing effect
    this.tweens.add({
      targets: dangerZone,
      alpha: 0.1,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
    
    // Spawn extra obstacles in danger zone
    for (let i = 0; i < 4; i++) {
      const obstacleX = Phaser.Math.Between(60, width - 60);
      const obstacleY = y + Phaser.Math.Between(0, height);
      this.spawnObstacleAt(obstacleX, obstacleY);
    }
    
    // Spawn high-value powerup as reward
    this.time.delayedCall(1000, () => {
      const powerupX = Phaser.Math.Between(100, width - 100);
      const powerupY = y + height / 2;
      this.spawnPowerupAt(powerupX, powerupY, 'turbo');
    });
    
    // Clean up after 8 seconds
    this.time.delayedCall(8000, () => {
      dangerZone.destroy();
      this.dangerZoneActive = false;
    });
  }
  
  createBonusAltitudeZone() {
    const width = this.cameras.main.width;
    const height = 100;
    const x = 0;
    const y = this.balloon.y - 400;
    
    // Create bonus zone visual
    const bonusZone = this.add.rectangle(x, y, width, height, 0x00ff00, 0.2);
    bonusZone.setOrigin(0, 0);
    
    // Gentle glow effect
    this.tweens.add({
      targets: bonusZone,
      alpha: 0.1,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    
    // Spawn fuel powerups throughout the zone
    for (let i = 0; i < 3; i++) {
      const powerupX = Phaser.Math.Between(100, width - 100);
      const powerupY = y + Phaser.Math.Between(20, height - 20);
      this.spawnPowerupAt(powerupX, powerupY, 'fuel');
    }
    
    // Clean up after 6 seconds
    this.time.delayedCall(6000, () => {
      bonusZone.destroy();
    });
  }
  
  spawnPowerupAt(x: number, y: number, type: string) {
    const textureKey = this.textures.exists(type) ? type : `${type}_fallback`;
    
    let powerup = this.getPooledObject("powerups", textureKey);
    if (!powerup) {
      powerup = this.physics.add.sprite(x, y, textureKey);
    } else {
      powerup.setPosition(x, y);
      powerup.setTexture(textureKey);
    }
    
    powerup.setScale(0.25); // Slightly larger for special powerups
    powerup.setData("type", type);
    powerup.setData("special", true);
    
    // Enhanced hitbox for easier collection
    const powerupBody = powerup.body as Phaser.Physics.Arcade.Body;
    powerupBody.setSize(powerup.width * 0.25 * 3, powerup.height * 0.25 * 3);
    
    this.powerups.add(powerup);
    
    // Special glow animation
    this.tweens.add({
      targets: powerup,
      alpha: 0.6,
      scale: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // Track player movement for adaptive spawning
  trackPlayerMovement() {
    const balloonBody = this.balloon.body as Phaser.Physics.Arcade.Body;
    const movementIntensity = Math.abs(balloonBody.velocity.x) / 200; // Normalize to 0-1
    
    this.playerMovementHistory.push(movementIntensity);
    
    // Keep only last 100 samples (about 1.5 seconds at 60fps)
    if (this.playerMovementHistory.length > 100) {
      this.playerMovementHistory.shift();
    }
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
          debug: false,
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
