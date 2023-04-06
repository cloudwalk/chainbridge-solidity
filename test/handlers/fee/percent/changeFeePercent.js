const TruffleAssert = require("truffle-assertions");

const BridgeContract = artifacts.require("Bridge");
const BasicFeeHandlerContract = artifacts.require("BasicPercentFeeHandler");

contract("BasicPercentFeeHandler - [changeFeePercent]", async (accounts) => {
  const relayerThreshold = 0;
  const domainID = 1;
  const initialRelayers = accounts.slice(0, 3);

  const assertOnlyAdmin = (method, ...params) => {
    return TruffleAssert.reverts(method(...params, { from: initialRelayers[1] }), "sender doesn't have admin role");
  };

  let BridgeInstance;

  beforeEach(async () => {
    await BridgeContract.new(domainID, [], relayerThreshold, 100).then((instance) => (BridgeInstance = instance));
  });

  it("contract should be deployed successfully", async () => {
    TruffleAssert.passes(await BasicFeeHandlerContract.new(BridgeInstance.address));
  });

  it("should set fee percent", async () => {
    const BasicFeeHandlerInstance = await BasicFeeHandlerContract.new(BridgeInstance.address);
    const feePercent = 50;
    await BasicFeeHandlerInstance.changeFeePercent(feePercent);
    const newFeePercent = await BasicFeeHandlerInstance._feePercent.call();
    assert.equal(newFeePercent, 50);
  });

  it("should not set the same fee percent", async () => {
    const BasicFeeHandlerInstance = await BasicFeeHandlerContract.new(BridgeInstance.address);
    await TruffleAssert.reverts(BasicFeeHandlerInstance.changeFeePercent(0), "current fee is equal to new fee");
  });

  it("should require admin role to change fee percent", async () => {
    const BasicFeeHandlerInstance = await BasicFeeHandlerContract.new(BridgeInstance.address);
    await assertOnlyAdmin(BasicFeeHandlerInstance.changeFeePercent, 1);
  });
});
