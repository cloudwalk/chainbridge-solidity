const TruffleAssert = require("truffle-assertions");

const Helpers = require("../../../helpers");

const BridgeContract = artifacts.require("Bridge");
const ERC20MintableContract = artifacts.require("ERC20PresetMinterPauser");
const ERC20HandlerContract = artifacts.require("ERC20Handler");
const PercentFeeHandlerContract = artifacts.require("PercentFeeHandler");

contract("PercentFeeHandler - [changeMinimumFeeAmount]", async (accounts) => {
  const relayerThreshold = 0;
  const originDomainID = 1;
  const destinationDomainID = 2;
  const relayer = accounts[0];
  const otherAccount = accounts[1];
  const depositAmount = 1000;
  const feeData = "0x0";

  let BridgeInstance;
  let ERC20MintableInstance;
  let PercentFeeHandlerInstance;
  let resourceID;
  let depositData;

  const assertOnlyAdmin = (method, ...params) => {
    return TruffleAssert.reverts(method(...params, { from: otherAccount }), "sender doesn't have admin role");
  };

  beforeEach(async () => {
    await Promise.all([
      BridgeContract.new(originDomainID, [relayer], relayerThreshold, 100).then((instance) => (BridgeInstance = instance)),
      ERC20MintableContract.new("token", "TOK").then((instance) => (ERC20MintableInstance = instance))
    ]);

    resourceID = Helpers.createResourceID(ERC20MintableInstance.address, originDomainID);

    PercentFeeHandlerInstance = await PercentFeeHandlerContract.new(BridgeInstance.address);

    ERC20HandlerInstance = await ERC20HandlerContract.new(BridgeInstance.address);

    await BridgeInstance.adminSetResource(ERC20HandlerInstance.address, resourceID, ERC20MintableInstance.address);
  });

  it("should return minimum amount of fee", async () => {
    await BridgeInstance.adminChangeFeeHandler(PercentFeeHandlerInstance.address);
    const feePercent = 1000; // 10%
    const minFeeAmount = 400;
    const maxFeeAmount = 600;
    depositData = web3.eth.abi.encodeParameter("uint256", depositAmount);
    // Current fee is set to 0%
    let res = await PercentFeeHandlerInstance.calculateFee.call(
      relayer,
      originDomainID,
      destinationDomainID,
      resourceID,
      depositData,
      feeData
    );
    assert.equal(res[0], 0);
    // Change fee to 10%
    await PercentFeeHandlerInstance.changeFeePercent(resourceID, feePercent);
    await PercentFeeHandlerInstance.changeMaximumFeeAmount(resourceID, maxFeeAmount);
    await PercentFeeHandlerInstance.changeMinimumFeeAmount(resourceID, minFeeAmount);
    res = await PercentFeeHandlerInstance.calculateFee.call(
      relayer,
      originDomainID,
      destinationDomainID,
      resourceID,
      depositData,
      feeData
    );
    const feeObj = await PercentFeeHandlerInstance.calculateFee(
      relayer,
      originDomainID,
      destinationDomainID,
      resourceID,
      depositData,
      feeData
    );
    const expectedFee = minFeeAmount;
    assert.equal(feeObj[0], expectedFee);
  });

  it("should return maximum amount of fee", async () => {
    await BridgeInstance.adminChangeFeeHandler(PercentFeeHandlerInstance.address);
    const feePercent = 9000; // 90%
    const minFeeAmount = 400;
    const maxFeeAmount = 600;
    depositData = web3.eth.abi.encodeParameter("uint256", depositAmount);
    // Current fee is set to 0%
    let res = await PercentFeeHandlerInstance.calculateFee.call(
      relayer,
      originDomainID,
      destinationDomainID,
      resourceID,
      depositData,
      feeData
    );
    assert.equal(res[0], 0);
    // Change fee to 90%
    await PercentFeeHandlerInstance.changeFeePercent(resourceID, feePercent);
    await PercentFeeHandlerInstance.changeMaximumFeeAmount(resourceID, maxFeeAmount);
    await PercentFeeHandlerInstance.changeMinimumFeeAmount(resourceID, minFeeAmount);
    res = await PercentFeeHandlerInstance.calculateFee.call(
      relayer,
      originDomainID,
      destinationDomainID,
      resourceID,
      depositData,
      feeData
    );
    const feeObj = await PercentFeeHandlerInstance.calculateFee(
      relayer,
      originDomainID,
      destinationDomainID,
      resourceID,
      depositData,
      feeData
    );
    assert.equal(feeObj[0], maxFeeAmount);
  });

  it("should return percent amount of fee", async () => {
    await BridgeInstance.adminChangeFeeHandler(PercentFeeHandlerInstance.address);
    const feePercent = 5000; //50%
    const minFeeAmount = 400;
    const maxFeeAmount = 600;
    depositData = web3.eth.abi.encodeParameter("uint256", depositAmount);
    // Current fee is set to 0%
    let res = await PercentFeeHandlerInstance.calculateFee.call(
      relayer,
      originDomainID,
      destinationDomainID,
      resourceID,
      depositData,
      feeData
    );
    assert.equal(res[0], 0);
    // Change fee to 50%
    await PercentFeeHandlerInstance.changeFeePercent(resourceID, feePercent);
    await PercentFeeHandlerInstance.changeMaximumFeeAmount(resourceID, maxFeeAmount);
    await PercentFeeHandlerInstance.changeMinimumFeeAmount(resourceID, minFeeAmount);
    res = await PercentFeeHandlerInstance.calculateFee.call(
      relayer,
      originDomainID,
      destinationDomainID,
      resourceID,
      depositData,
      feeData
    );
    const feeObj = await PercentFeeHandlerInstance.calculateFee(
      relayer,
      originDomainID,
      destinationDomainID,
      resourceID,
      depositData,
      feeData
    );
    const expectedFee = depositAmount * feePercent / 1e4;
    assert.equal(feeObj[0], expectedFee);
  });

  it("should revert if maximum fee is less than minimum fee", async () => {
    const minFeeAmount = 400;
    const maxFeeAmount = 600;
    await BridgeInstance.adminChangeFeeHandler(PercentFeeHandlerInstance.address);
    await PercentFeeHandlerInstance.changeMaximumFeeAmount(resourceID, maxFeeAmount);
    await PercentFeeHandlerInstance.changeMinimumFeeAmount(resourceID, minFeeAmount);
    await TruffleAssert.reverts(
      PercentFeeHandlerInstance.changeMaximumFeeAmount(resourceID, minFeeAmount - 1),
      "maximum fee amount is less than minimum fee"
    );
  });

  it("should revert if minimum fee is greater than maximum fee", async () => {
    const maxFeeAmount = 600;
    await BridgeInstance.adminChangeFeeHandler(PercentFeeHandlerInstance.address);
    await PercentFeeHandlerInstance.changeMaximumFeeAmount(resourceID, maxFeeAmount);
    await TruffleAssert.reverts(
      PercentFeeHandlerInstance.changeMinimumFeeAmount(resourceID, maxFeeAmount + 1),
      "minimum fee amount is greater than maximum fee"
    );
  });

  it("should require admin role to change minimum fee amount", async () => {
    const PercentFeeHandlerInstance = await PercentFeeHandlerContract.new(BridgeInstance.address);
    await assertOnlyAdmin(PercentFeeHandlerInstance.changeMinimumFeeAmount, resourceID, 1);
  });

  it("should require admin role to change maximum fee amount", async () => {
    const PercentFeeHandlerInstance = await PercentFeeHandlerContract.new(BridgeInstance.address);
    await assertOnlyAdmin(PercentFeeHandlerInstance.changeMaximumFeeAmount, resourceID, 1);
  });
});
