const Helpers = require("../../../helpers");

const BridgeContract = artifacts.require("Bridge");
const ERC20MintableContract = artifacts.require("ERC20PresetMinterPauser");
const ERC20HandlerContract = artifacts.require("ERC20Handler");
const PercentFeeHandlerContract = artifacts.require("PercentFeeHandler");

contract("PercentFeeHandler - [calculateFee]", async (accounts) => {
  const relayerThreshold = 0;
  const originDomainID = 1;
  const destinationDomainID = 2;
  const relayer = accounts[0];
  const depositAmount = 1000;
  const feeData = "0x0";

  let BridgeInstance;
  let ERC20MintableInstance;
  let PercentFeeHandlerInstance;
  let resourceID;
  let depositData;

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

  it("should return amount of fee", async () => {
    await BridgeInstance.adminChangeFeeHandler(PercentFeeHandlerInstance.address);
    const feePercent = 5000; // 50%
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
});
