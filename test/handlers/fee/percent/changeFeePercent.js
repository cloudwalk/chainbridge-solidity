const TruffleAssert = require("truffle-assertions");
const Ethers = require("ethers");

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
    BridgeInstance = await BridgeContract.new(domainID, [], relayerThreshold, 100).then(
      (instance) => (BridgeInstance = instance)
    );
  });

  it("contract should be deployed successfully", async () => {
    TruffleAssert.passes(await BasicFeeHandlerContract.new(BridgeInstance.address));
  });

  it("should set fee", async () => {
    const BasicFeeHandlerInstance = await BasicFeeHandlerContract.new(BridgeInstance.address);
    const fee = 50;
    await BasicFeeHandlerInstance.changeFeePercent(fee);
    const newFee = await BasicFeeHandlerInstance._feePercent.call();
    assert.equal(newFee, 50);
  });

  it("should not set the same fee", async () => {
    const BasicFeeHandlerInstance = await BasicFeeHandlerContract.new(BridgeInstance.address);
    await TruffleAssert.reverts(BasicFeeHandlerInstance.changeFeePercent(0), "Current fee is equal to new fee");
  });

  it("should require admin role to change fee", async () => {
    const BasicFeeHandlerInstance = await BasicFeeHandlerContract.new(BridgeInstance.address);
    await assertOnlyAdmin(BasicFeeHandlerInstance.changeFeePercent, 1);
  });
});
