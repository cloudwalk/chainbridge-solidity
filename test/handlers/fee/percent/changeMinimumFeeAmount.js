const Helpers = require("../../../helpers");

const BridgeContract = artifacts.require("Bridge");
const ERC20MintableContract = artifacts.require("ERC20PresetMinterPauser");
const ERC20HandlerContract = artifacts.require("ERC20Handler");
const BasicFeeHandlerContract = artifacts.require("BasicPercentFeeHandler");

contract("BasicPercentFeeHandler - [changeMinimumFeeAmount]", async (accounts) => {
  const relayerThreshold = 0;
  const originDomainID = 1;
  const destinationDomainID = 2;
  const relayer = accounts[0];
  const depositAmount = 1000;
  const feeData = "0x0";

  let BridgeInstance;
  let ERC20MintableInstance;
  let BasicFeeHandlerInstance;
  let resourceID;
  let depositData;

  beforeEach(async () => {
    await Promise.all([
      BridgeContract.new(originDomainID, [relayer], relayerThreshold, 100).then((instance) => (BridgeInstance = instance)),
      ERC20MintableContract.new("token", "TOK").then((instance) => (ERC20MintableInstance = instance))
    ]);

    resourceID = Helpers.createResourceID(ERC20MintableInstance.address, originDomainID);

    BasicFeeHandlerInstance = await BasicFeeHandlerContract.new(BridgeInstance.address);

    ERC20HandlerInstance = await ERC20HandlerContract.new(BridgeInstance.address);

    await BridgeInstance.adminSetResource(ERC20HandlerInstance.address, resourceID, ERC20MintableInstance.address);
  });

  it("should return minimum amount of fee", async () => {
    await BridgeInstance.adminChangeFeeHandler(BasicFeeHandlerInstance.address);
    const feePercent = 1000; // 10%
    depositData = web3.eth.abi.encodeParameter("uint256", depositAmount);
    // Current fee is set to 0%
    let res = await BasicFeeHandlerInstance.calculateFee.call(
      relayer,
      originDomainID,
      destinationDomainID,
      resourceID,
      depositData,
      feeData
    );
    assert.equal(res[0], 0);
    // Change fee to 10%
    await BasicFeeHandlerInstance.changeFeePercent(feePercent);
    await BasicFeeHandlerInstance.changeMinimumFeeAmount(resourceID, 500);
    res = await BasicFeeHandlerInstance.calculateFee.call(
      relayer,
      originDomainID,
      destinationDomainID,
      resourceID,
      depositData,
      feeData
    );
    const feeObj = await BasicFeeHandlerInstance.calculateFee(
      relayer,
      originDomainID,
      destinationDomainID,
      resourceID,
      depositData,
      feeData
    );
    const expectedFee = 500;
    assert.equal(feeObj[0], expectedFee);
  });

  it("should return percent amount of fee", async () => {
    await BridgeInstance.adminChangeFeeHandler(BasicFeeHandlerInstance.address);
    const feePercent = 7000; // 70%
    depositData = web3.eth.abi.encodeParameter("uint256", depositAmount);
    // Current fee is set to 0%
    let res = await BasicFeeHandlerInstance.calculateFee.call(
      relayer,
      originDomainID,
      destinationDomainID,
      resourceID,
      depositData,
      feeData
    );
    assert.equal(res[0], 0);
    // Change fee to 70%
    await BasicFeeHandlerInstance.changeFeePercent(feePercent);
    await BasicFeeHandlerInstance.changeMinimumFeeAmount(resourceID, 500);
    res = await BasicFeeHandlerInstance.calculateFee.call(
      relayer,
      originDomainID,
      destinationDomainID,
      resourceID,
      depositData,
      feeData
    );
    const feeObj = await BasicFeeHandlerInstance.calculateFee(
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
});
