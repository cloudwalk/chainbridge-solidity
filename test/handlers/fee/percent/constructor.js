const Helpers = require("../../../helpers");

const BridgeContract = artifacts.require("Bridge");
const ERC20MintableContract = artifacts.require("ERC20PresetMinterPauser");
const ERC20HandlerContract = artifacts.require("ERC20Handler");
const BasicFeeHandlerContract = artifacts.require("BasicPercentFeeHandler");

contract("BasicPercentFeeHandler - [constructor]", (accounts) => {
  const relayerThreshold = 0;
  const adminRole = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const domainID = 1;
  const depositerAddress = accounts[1];
  const depositAmount = 10000000;

  let BridgeInstance;
  let ERC20MintableInstance;
  let ERC20HandlerInstance;
  let BasicFeeHandlerInstance;
  let resourceID;

  beforeEach(async () => {
    await Promise.all([
      BridgeContract.new(domainID, [], relayerThreshold, 100).then((instance) => (BridgeInstance = instance)),
      ERC20MintableContract.new("token", "TOK").then((instance) => (ERC20MintableInstance = instance))
    ]);

    resourceID = Helpers.createResourceID(ERC20MintableInstance.address, domainID);

    ERC20HandlerInstance = await ERC20HandlerContract.new(BridgeInstance.address);

    await Promise.all([
      ERC20MintableInstance.mint(depositerAddress, depositAmount),
      BridgeInstance.adminSetResource(ERC20HandlerInstance.address, resourceID, ERC20MintableInstance.address)
    ]);

    await ERC20MintableInstance.approve(ERC20HandlerInstance.address, depositAmount, { from: depositerAddress });

    BasicFeeHandlerInstance = await BasicFeeHandlerContract.new(BridgeInstance.address);
  });

  it("correctly sets values in the constructor", async () => {
    const bridgeAddress = await BasicFeeHandlerInstance._bridgeAddress();
    const adminRoleHash = await BasicFeeHandlerInstance.DEFAULT_ADMIN_ROLE();
    const deployerIsAdmin = await BasicFeeHandlerInstance.hasRole(adminRole, accounts[0]);

    assert.strictEqual(bridgeAddress, BridgeInstance.address);
    assert.strictEqual(adminRoleHash, adminRole);
    assert.strictEqual(deployerIsAdmin, true);
  });
});
