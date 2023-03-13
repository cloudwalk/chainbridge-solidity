const TruffleAssert = require("truffle-assertions");
const Ethers = require("ethers");

const Helpers = require("../../../helpers");

const ERC20HandlerContract = artifacts.require("ERC20Handler");
const BridgeContract = artifacts.require("Bridge");
const BasicFeeHandlerContract = artifacts.require("BasicPercentFeeHandler");
const ERC20MintableContract = artifacts.require("ERC20PresetMinterPauser");

contract("BasicPercentFeeHandler - [constructor]", (accounts) => {

  const relayerThreshold = 0;
  const adminRole = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const domainID = 1;

  const depositerAddress = accounts[1];
  const recipientAddress = accounts[2];

  const depositAmount = 10000000;

  let ERC20MintableInstance;
  let ERC20HandlerInstance;

  let resourceID;

  let BridgeInstance;
  let basicPercentFeeHandler;

  beforeEach(async () => {
    await Promise.all([
      BridgeContract.new(domainID, [], relayerThreshold, 100).then((instance) => (BridgeInstance = instance)),
      ERC20MintableContract.new("token", "TOK").then((instance) => (ERC20MintableInstance = instance)),
    ]);

    resourceID = Helpers.createResourceID(ERC20MintableInstance.address, domainID);

    ERC20HandlerInstance = await ERC20HandlerContract.new(BridgeInstance.address);

    await Promise.all([
      ERC20MintableInstance.mint(depositerAddress, depositAmount),
      BridgeInstance.adminSetResource(ERC20HandlerInstance.address, resourceID, ERC20MintableInstance.address),
    ]);

    await ERC20MintableInstance.approve(ERC20HandlerInstance.address, depositAmount, { from: depositerAddress });

    depositData = Helpers.createERCDepositData(depositAmount, 20, recipientAddress);

    basicPercentFeeHandler = await BasicFeeHandlerContract.new(BridgeInstance.address);
  });

  it("correctly sets values in the constructor", async () => {
    const bridgeAddress = await basicPercentFeeHandler._bridgeAddress();
    const adminRoleHash = await basicPercentFeeHandler.DEFAULT_ADMIN_ROLE();
    const deployerIsAdmin = await basicPercentFeeHandler.hasRole(adminRole, accounts[0]);

    assert.strictEqual(bridgeAddress, BridgeInstance.address);
    assert.strictEqual(adminRoleHash, adminRole);
    assert.strictEqual(deployerIsAdmin, true);
  });
});
