const TruffleAssert = require("truffle-assertions");
const Ethers = require("ethers");

const Helpers = require("../../../helpers");

const ERC20HandlerContract = artifacts.require("ERC20Handler");
const BridgeContract = artifacts.require("Bridge");
const BasicFeeHandlerContract = artifacts.require("BasicPercentFeeHandler");
const ERC20MintableContract = artifacts.require("ERC20PresetMinterPauser");

contract("BasicPercentFeeHandler - [collectFee]", (accounts) => {
  const originDomainID = 1;
  const destinationDomainID = 2;
  const relayerThreshold = 0;
  const adminRole = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const domainID = 1;
  const relayer = accounts[0];

  const depositerAddress = accounts[1];
  const recipientAddress = accounts[2];

  const depositAmount = 10000000;
  const feeData = "0x0";

  let ERC20MintableInstance;
  let ERC20HandlerInstance;

  let resourceID;
  let depositData;

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

    basicPercentFeeHandler = await BasicFeeHandlerContract.new(BridgeInstance.address);

    await ERC20MintableInstance.approve(ERC20HandlerInstance.address, depositAmount, { from: depositerAddress });

    depositData = Helpers.createERCDepositData(depositAmount, 20, recipientAddress);
  });

  it("should allow generic deposit", async () => {
    await TruffleAssert.passes(
      BridgeInstance.deposit(domainID, resourceID, depositData, feeData, { from: depositerAddress })
    );
  });

  it("should collect fee", async () => {
    await BridgeInstance.adminChangeFeeHandler(basicPercentFeeHandler.address);
    await ERC20MintableInstance.mint(depositerAddress, 100000000000);
    await ERC20MintableInstance.increaseAllowance(BridgeInstance.address, 100000000000, { from: depositerAddress });
    await ERC20MintableInstance.increaseAllowance(basicPercentFeeHandler.address, 100000000000, { from: depositerAddress });
    await ERC20MintableInstance.increaseAllowance(ERC20HandlerInstance.address, 100000000000, { from: depositerAddress });
    const feePercent = 5000; //50%
    let res = await basicPercentFeeHandler.calculateFee.call(
      relayer,
      originDomainID,
      destinationDomainID,
      resourceID,
      depositData,
      feeData
    );
    assert.equal(res[0], 0);
    // Change fee to 50%
    await basicPercentFeeHandler.changeFeePercent(feePercent);

    let afterRes = await basicPercentFeeHandler.calculateFee.call(
        relayer,
        originDomainID,
        destinationDomainID,
        resourceID,
        depositData,
        feeData
      );
      let fee = await depositAmount * feePercent / 1e4;
      //check that fee is calculated correctly
      assert.equal(afterRes[0], fee);

    await TruffleAssert.passes(
      BridgeInstance.deposit(domainID, resourceID, depositData, feeData, { from: depositerAddress })
    );
  });

  it("deposit should revert if invalid fee amount supplied", async () => {
    await BridgeInstance.adminChangeFeeHandler(basicPercentFeeHandler.address);
    // current fee is set to 0
    assert.equal(await basicPercentFeeHandler._feePercent(), 0);

    await TruffleAssert.reverts(
      BridgeInstance.deposit(domainID, resourceID, depositData, feeData, {
        from: depositerAddress,
        value: Ethers.utils.parseEther("1.0"),
      }),
      "collectFee: msg.value != 0"
    );
  });

  it("deposit should pass if fee handler not set and fee not supplied", async () => {
    await TruffleAssert.passes(
      BridgeInstance.deposit(domainID, resourceID, depositData, feeData, { from: depositerAddress })
    );
  });
});
