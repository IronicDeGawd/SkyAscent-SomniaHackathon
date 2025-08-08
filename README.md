# Sky Ascent 🎈

A blockchain-powered air balloon navigation game built as a Farcaster Mini App, featuring competitive leaderboards and token rewards on Somnia Network.

[![Deploy](https://img.shields.io/badge/Deploy-Vercel-black)](https://vercel.com) [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE) [![Somnia](https://img.shields.io/badge/Blockchain-Somnia-purple)](https://somnia.network)

## 🎮 Game Overview

**Sky Ascent** is an arcade-style balloon game where players:

- Navigate a hot air balloon through obstacles using swipe controls
- Collect powerups to maintain fuel and boost scores
- Compete on weekly leaderboards with other players
- Earn tokens based on performance and altitude reached
- Purchase revives using earned tokens

## How to Play

- Connect with your wallet
- Ensure you have STT Tokens, if not click get stt token to go the faucet page
- Start Play
- Use left arrow and right arrow keyboard key on keyboard or the onscreen buttons to steer your air balloon away from obstacles like airplane, birds, ufo
- Your fuel slowly deplets as you ascend or as you steer
- Collect powerups such as shields or fuel and survive as long as possible

## 🏗️ Architecture

### Smart Contracts (`/contracts`)

- **SkyAscentGame.sol**: Core game logic with score validation and leaderboards
- **Deployment**: Hardhat setup for Somnia Network
- **Testing**: Comprehensive test suite for anti-cheat mechanisms

### Frontend (`/frontend`)

- **Framework**: Next.js with TypeScript
- **Game Engine**: Phaser.js 3.70+ with mobile-optimized touch controls
- **Styling**: Tailwind CSS for responsive design
- **Blockchain**: ethers.js integration with Somnia Network

## 🚀 Quick Start

### 1. Smart Contract Deployment

```bash
cd contracts
npm install
cp .env.example .env
# Edit .env with your private key

# Compile and test
npm run compile
npm test

# Deploy to Somnia testnet
npm run deploy:somnia
```

### 2. Frontend Setup

```bash
cd frontend
npm install

# Configure environment
echo "NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=your_deployed_address" > .env.local

# Start development server
npm run dev
```

### 3. Farcaster Mini App Integration

1. Update contract addresses in frontend environment
2. Deploy frontend to production (Vercel/Netlify)
3. Update URLs in `public/.well-known/farcaster.json`
4. Enable Developer Mode in Farcaster
5. Test Mini App in Farcaster client

## 📊 Game Features

### Core Gameplay

- **Swipe Controls**: Left/right navigation optimized for mobile
- **Progressive Difficulty**: Increasing obstacle density and speed
- **Fuel Management**: Strategic movement to conserve fuel
- **Powerup System**: Fuel refills, shields, and score multipliers

### Blockchain Integration

- **Score Validation**: Anti-cheat algorithms prevent impossible scores
- **Weekly Leaderboards**: Automatic ranking and competition cycles
- **Token Economy**: Earn tokens based on performance metrics
- **Revive System**: Spend tokens to continue failed games

### Social Features

- **Farcaster Profiles**: Automatic user identification via FID
- **Achievement Sharing**: Cast high scores and challenges
- **Competitive Elements**: Weekly tournaments and rankings

## 🔧 Technical Stack

### Blockchain

- **Network**: Somnia Shannon Testnet (Chain ID: 50312)
- **RPC**: `https://dream-rpc.somnia.network`
- **Explorer**: `https://shannon-explorer.somnia.network`
- **Framework**: Hardhat with OpenZeppelin contracts

### Frontend

- **Runtime**: Next.js 15+ with App Router
- **Game Engine**: Phaser.js for 2D graphics and physics
- **Blockchain**: ethers.js v6 for Web3 interactions
- **Styling**: Tailwind CSS with mobile-first design
- **Integration**: Farcaster Mini App SDK

## 📁 Project Structure

```
sky-ascent/
├── contracts/                 # Smart contracts & blockchain
│   ├── contracts/SkyAscentGame.sol
│   ├── scripts/deploy.js
│   ├── test/SkyAscentGame.test.js
│   └── hardhat.config.js
├── frontend/                  # Next.js game application
│   ├── app/                   # App Router pages
│   │   ├── game/page.tsx
│   │   ├── scores/page.tsx
│   │   └── settings/page.tsx
│   ├── components/
│   │   └── PhaserGame.tsx    # Main game engine
│   ├── utils/blockchain.ts   # Web3 integration
│   └── public/
│       ├── .well-known/farcaster.json
│       └── *.png, *.webp     # Game assets
├── LICENSE
└── README.md
```

## 🔐 Security Features

### Smart Contract Security

- **Input Validation**: Comprehensive parameter checking
- **Anti-Cheat Logic**: Statistical analysis of submitted scores
- **Gas Optimization**: Efficient data structures and algorithms
- **Emergency Controls**: Pause mechanisms for critical issues

### Frontend Security

- **Wallet Integration**: Secure connection to MetaMask and Web3 wallets
- **Network Validation**: Automatic Somnia network switching
- **Error Handling**: Graceful handling of blockchain failures
- **Data Sanitization**: Input validation for all user data

## 🎯 Deployment Guide

### Prerequisites

- Node.js 22.11.0+
- MetaMask or compatible Web3 wallet
- Somnia testnet STT tokens (from faucet)

### Contract Deployment

1. Configure `.env` with deployer private key
2. Fund deployer wallet with STT tokens
3. Run `npm run deploy:somnia`
4. Save contract address for frontend configuration

### Frontend Deployment

1. Update `NEXT_PUBLIC_GAME_CONTRACT_ADDRESS` in environment
2. Deploy to Vercel: `vercel deploy`
3. Update Farcaster manifest URLs
4. Test Mini App functionality

### Farcaster Integration

1. Enable Developer Mode in Farcaster
2. Access Mini App tools dashboard
3. Validate manifest configuration
4. Submit for Mini App review

## 🧪 Testing

### Smart Contract Tests

```bash
cd contracts
npm test                    # Run full test suite
npm run test:coverage      # Generate coverage report
```

### Frontend Testing

```bash
cd frontend
npm run dev                # Local development
npm run build              # Production build test
npm run lint               # Code quality check
```

## 📈 Performance Optimization

### Game Performance

- **60 FPS Target**: Optimized for mobile devices
- **Object Pooling**: Efficient sprite management
- **Asset Compression**: Minimal loading times
- **Memory Management**: Automatic cleanup of off-screen objects

### Blockchain Efficiency

- **Gas Optimization**: Minimal transaction costs
- **Batch Operations**: Efficient leaderboard updates
- **Event Logging**: Comprehensive activity tracking
- **Error Recovery**: Robust failure handling

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Run tests: `npm test`
4. Commit changes: `git commit -m 'Add new feature'`
5. Push branch: `git push origin feature/new-feature`
6. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- **Documentation**: [Somnia Network Docs](https://docs.somnia.network)
- **Farcaster SDK**: [Mini Apps Documentation](https://docs.farcaster.xyz/reference/miniapp-sdk)
- **Block Explorer**: [Shannon Explorer](https://shannon-explorer.somnia.network)
- **Testnet Faucet**: [Somnia Faucet](https://testnet.somnia.network/)

## 🆘 Support

For issues and questions:

1. Check existing GitHub issues
2. Review documentation
3. Join Somnia Discord community
4. Submit new issue with detailed description

---

**Navigate the skies, collect rewards, compete globally** 🎈
