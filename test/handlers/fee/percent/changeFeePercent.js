const TruffleAssert = require("truffle-assertions");

const Helpers = require("../../../helpers");

const BridgeContract = artifacts.require("Bridge");
const ERC20MintableContract = artifacts.require("ERC20PresetMinterPauser");
const ERC20HandlerContract = artifacts.require("ERC20Handler");
const PercentFeeHandlerContract = artifacts.require("PercentFeeHandler");

contract("PercentFeeHandler - [changeFeePercent]", async (accounts) => {
  const relayerThreshold = 0;
  const domainID = 1;
  const initialRelayers = accounts.slice(0, 3);

  const assertOnlyAdmin = (method, ...params) => {
    return TruffleAssert.reverts(method(...params, { from: initialRelayers[1] }), "sender doesn't have admin role");
  };

  let BridgeInstance;
  let ERC20MintableInstance;
  let PercentFeeHandlerInstance;
  let resourceID;

  beforeEach(async () => {
    await Promise.all([
      BridgeContract.new(domainID, [], relayerThreshold, 100).then((instance) => (BridgeInstance = instance)),
      ERC20MintableContract.new("token", "TOK").then((instance) => (ERC20MintableInstance = instance))
    ]);

    resourceID = Helpers.createResourceID(ERC20MintableInstance.address, domainID);

    PercentFeeHandlerInstance = await PercentFeeHandlerContract.new(BridgeInstance.address);

    ERC20HandlerInstance = await ERC20HandlerContract.new(BridgeInstance.address);

    await BridgeInstance.adminSetResource(ERC20HandlerInstance.address, resourceID, ERC20MintableInstance.address);
  });

  it("contract should be deployed successfully", async () => {
    TruffleAssert.passes(await PercentFeeHandlerContract.new(BridgeInstance.address));
  });

  it("should set fee percent", async () => {
    const feePercent = 50;
    await PercentFeeHandlerInstance.changeFeePercent(resourceID, feePercent);
    const newFeePercent = await PercentFeeHandlerInstance._feePercent.call(resourceID);
    assert.equal(newFeePercent, 50);
  });

  it("should not set the same fee percent", async () => {
    await TruffleAssert.reverts(
      PercentFeeHandlerInstance.changeFeePercent(resourceID, 0),
      "new fee percent is equal to current fee"
    );
  });

  it("should require admin role to change fee percent", async () => {
    await assertOnlyAdmin(PercentFeeHandlerInstance.changeFeePercent, resourceID, 1);
  });
});
