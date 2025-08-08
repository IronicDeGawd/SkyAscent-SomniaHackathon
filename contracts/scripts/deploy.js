const hre = require("hardhat");

async function main() {
  console.log("Deploying SkyAscentGame to Somnia Network...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  const SkyAscentGame = await hre.ethers.getContractFactory("SkyAscentGame");
  const skyAscentGame = await SkyAscentGame.deploy();

  await skyAscentGame.waitForDeployment();

  const contractAddress = await skyAscentGame.getAddress();
  console.log("SkyAscentGame deployed to:", contractAddress);

  // Verify contract on block explorer (optional)
  if (hre.network.name !== "hardhat") {
    console.log("Waiting for block confirmations...");
    await skyAscentGame.deploymentTransaction().wait(6);
    
    console.log("Verifying contract on block explorer...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("Contract verified successfully");
    } catch (error) {
      console.log("Error verifying contract:", error.message);
    }
  }

  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    deployerAddress: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber()
  };
  
  fs.writeFileSync(
    "./deployments.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("Deployment info saved to deployments.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });