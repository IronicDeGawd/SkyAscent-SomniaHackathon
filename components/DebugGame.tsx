"use client";

import { useEffect, useRef } from "react";
import * as Phaser from "phaser";

class DebugScene extends Phaser.Scene {
  private balloon!: Phaser.GameObjects.Sprite;
  private obstacles: Phaser.GameObjects.Sprite[] = [];
  private powerups: Phaser.GameObjects.Sprite[] = [];
  private backgroundTile!: Phaser.GameObjects.TileSprite;

  constructor() {
    super({ key: "DebugScene" });
  }

  preload() {
    // Create fallback assets
    this.createFallbackAssets();

    // Load game assets with fallback handling
    this.load.image("balloon", "/balloon_default.png");
    this.load.image("bird", "/bird.png");
    this.load.image("airplane", "/airplane.png");
    this.load.image("ufo", "/ufo.png");
    this.load.image("fuel", "/fuel.png");
    this.load.image("shield", "/shield.png");
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

    // UFO fallback (green ellipse)
    graphics.fillStyle(0x00ff00, 1);
    graphics.fillEllipse(30, 20, 60, 40);
    graphics.generateTexture("ufo_fallback", 60, 40);
    graphics.clear();

    // Fuel fallback (blue rectangle)
    graphics.fillStyle(0x4dabf7, 1);
    graphics.fillRect(0, 0, 24, 32);
    graphics.generateTexture("fuel_fallback", 24, 32);
    graphics.clear();

    // Shield fallback (cyan circle)
    graphics.fillStyle(0x00ffff, 1);
    graphics.fillCircle(16, 16, 16);
    graphics.generateTexture("shield_fallback", 32, 32);
    graphics.clear();

    graphics.destroy();
  }

  create() {
    // Add background
    this.createRepeatingBackground();

    // Add title
    this.add
      .text(360, 50, "DEBUG MODE - HITBOX VISUALIZATION", {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    // Create balloon in center
    this.createBalloon();

    // Create obstacles at different positions
    this.createObstacles();

    // Create powerups
    this.createPowerups();

    // Add debug info text
    this.addDebugInfo();
  }

  createRepeatingBackground() {
    const textureKey = this.textures.exists("background")
      ? "background"
      : "background_fallback";

    if (!this.textures.exists(textureKey)) {
      // Create a simple blue gradient background
      const graphics = this.make.graphics({ x: 0, y: 0 });
      graphics.fillGradientStyle(0x87ceeb, 0x87ceeb, 0x4682b4, 0x4682b4, 1);
      graphics.fillRect(
        0,
        0,
        this.cameras.main.width,
        this.cameras.main.height
      );
      graphics.generateTexture(
        "background_fallback",
        this.cameras.main.width,
        this.cameras.main.height
      );
      graphics.destroy();
    }

    this.backgroundTile = this.add.tileSprite(
      0,
      0,
      this.cameras.main.width,
      this.cameras.main.height,
      textureKey
    );
    this.backgroundTile.setDepth(-1);
    this.backgroundTile.setOrigin(0, 0);
  }

  createBalloon() {
    const textureKey = this.textures.exists("balloon")
      ? "balloon"
      : "balloon_fallback";

    // Create balloon in center
    this.balloon = this.add.sprite(360, 640, textureKey);
    this.balloon.setScale(0.3);

    // Enable physics and show debug hitbox
    this.physics.add.existing(this.balloon);
    const balloonBody = this.balloon.body as Phaser.Physics.Arcade.Body;

    // Set hitbox to match game logic (60% of sprite size)
    const hitboxWidth = this.balloon.width * 0.3 * 2;
    const hitboxHeight = this.balloon.height * 0.3 * 2.5;
    balloonBody.setSize(hitboxWidth, hitboxHeight);
    balloonBody.setOffset(
      (this.balloon.width - hitboxWidth) / 2,
      (this.balloon.height - hitboxHeight) / 2
    );

    // Add label
    this.add
      .text(
        this.balloon.x,
        this.balloon.y - 100,
        "BALLOON\nScale: 0.3\nHitbox: 2x width, 2.5x height",
        {
          fontFamily: "Arial",
          fontSize: "12px",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 1,
          align: "center",
        }
      )
      .setOrigin(0.5);
  }

  createObstacles() {
    const obstacleData = [
      {
        name: "AIRPLANE",
        texture: "airplane",
        fallback: "airplane_fallback",
        scale: 0.35,
        hitboxWidth: 0.7,
        hitboxHeight: 0.5,
        x: 150,
        y: 200,
      },
      {
        name: "UFO",
        texture: "ufo",
        fallback: "ufo_fallback",
        scale: 0.4,
        hitboxWidth: 0.8,
        hitboxHeight: 0.6,
        x: 570,
        y: 300,
      },
      {
        name: "BIRD",
        texture: "bird",
        fallback: "bird_fallback",
        scale: 0.25,
        hitboxWidth: 0.6,
        hitboxHeight: 0.8,
        x: 360,
        y: 400,
      },
    ];

    obstacleData.forEach((data) => {
      const textureKey = this.textures.exists(data.texture)
        ? data.texture
        : data.fallback;

      // Create obstacle
      const obstacle = this.add.sprite(data.x, data.y, textureKey);
      obstacle.setScale(data.scale);

      // Enable physics and show debug hitbox
      this.physics.add.existing(obstacle);
      const obstacleBody = obstacle.body as Phaser.Physics.Arcade.Body;

      // Set hitbox with separate configurations for each obstacle type
      const hitboxWidth = obstacle.width * data.scale * data.hitboxWidth;
      const hitboxHeight = obstacle.height * data.scale * data.hitboxHeight;
      obstacleBody.setSize(hitboxWidth, hitboxHeight);
      obstacleBody.setOffset(
        (obstacle.width - hitboxWidth) / 2,
        (obstacle.height - hitboxHeight) / 2
      );

      this.obstacles.push(obstacle);

      // Add label
      this.add
        .text(
          obstacle.x,
          obstacle.y - 80,
          `${data.name}\nScale: ${data.scale}\nHitbox: ${data.hitboxWidth}x${data.hitboxHeight}`,
          {
            fontFamily: "Arial",
            fontSize: "12px",
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 1,
            align: "center",
          }
        )
        .setOrigin(0.5);
    });
  }

  createPowerups() {
    const powerupData = [
      {
        name: "FUEL",
        texture: "fuel",
        fallback: "fuel_fallback",
        scale: 0.2,
        x: 200,
        y: 800,
      },
      {
        name: "SHIELD",
        texture: "shield",
        fallback: "shield_fallback",
        scale: 0.2,
        x: 520,
        y: 900,
      },
    ];

    powerupData.forEach((data) => {
      const textureKey = this.textures.exists(data.texture)
        ? data.texture
        : data.fallback;

      // Create powerup
      const powerup = this.add.sprite(data.x, data.y, textureKey);
      powerup.setScale(data.scale);

      // Enable physics and show debug hitbox
      this.physics.add.existing(powerup);
      const powerupBody = powerup.body as Phaser.Physics.Arcade.Body;

      // Set hitbox to match game logic (85% of scaled size for easier collection)
      const hitboxExpansion = 2.5;
      const hitboxWidth = powerup.width * data.scale * hitboxExpansion;
      const hitboxHeight = powerup.height * data.scale * hitboxExpansion;
      powerupBody.setSize(hitboxWidth, hitboxHeight);
      powerupBody.setOffset(
        (powerup.width - hitboxWidth) / 2,
        (powerup.height - hitboxHeight) / 2
      );

      this.powerups.push(powerup);

      // Add label
      this.add
        .text(
          powerup.x,
          powerup.y + 80,
          `${data.name}\nScale: ${data.scale}\nHitbox: 2.5x expansion`,
          {
            fontFamily: "Arial",
            fontSize: "12px",
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 1,
            align: "center",
          }
        )
        .setOrigin(0.5);
    });
  }

  addDebugInfo() {
    const debugText = `DEBUG INFO:
• Red boxes show collision boundaries
• All sprites are static for measurement
• Balloon: 0.3 scale, 2x width, 2.5x height hitbox
• Obstacles: Bird (0.25, 0.6x0.8), Airplane (0.35, 0.7x0.5), UFO (0.4, 0.8x0.6)
• Powerups: 0.2 scale, 2.5x hitbox expansion for easier collection
• Each obstacle type has custom hitbox dimensions for fair gameplay`;

    this.add
      .text(360, 1150, debugText, {
        fontFamily: "Arial",
        fontSize: "14px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 1,
        align: "center",
      })
      .setOrigin(0.5);
  }
}

export default function DebugGame() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const GAME_WIDTH = 720;
    const GAME_HEIGHT = 1280;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      parent: containerRef.current,
      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: true, // Enable debug mode to show hitboxes
        },
      },
      scene: new DebugScene(),
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
      },
      render: {
        pixelArt: true,
        antialias: false,
        roundPixels: true,
      },
      backgroundColor: "#87CEEB",
      disableContextMenu: true,
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-900">
      <div ref={containerRef} className="portrait-game-container" />
    </div>
  );
}
