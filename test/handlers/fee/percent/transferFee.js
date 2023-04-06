const TruffleAssert = require("truffle-assertions");
const Ethers = require("ethers");

const Helpers = require("../../../helpers");

const ERC20HandlerContract = artifacts.require("CW20Handler");
const BridgeContract = artifacts.require("Bridge");
const PercentFeeHandlerContract = artifacts.require("PercentFeeHandler");
const ERC20MintableContract = artifacts.require("ERC20PresetMinterPauser");

contract("PercentFeeHandler - [transferFee]", (accounts) => {
  const relayerThreshold = 0;
  const domainID = 1;

  const depositerAddress = accounts[1];
  const recipientAddress = accounts[2];

  const amount = 10000000;

  let ERC20MintableInstance;
  let ERC20HandlerInstance;

  let resourceID;

  let BridgeInstance;
  let PercentFeeHandlerInstance;

  beforeEach(async () => {
    BridgeInstance = await BridgeContract.new(domainID, [], relayerThreshold, 100).then(
      (instance) => (BridgeInstance = instance),
      await ERC20MintableContract.new("token", "TOK").then((instance) => (ERC20MintableInstance = instance))
    );

    resourceID = Helpers.createResourceID(ERC20MintableInstance.address, domainID);
    depositData = Helpers.createERCDepositData(amount, 20, recipientAddress);

    ERC20HandlerInstance = await ERC20HandlerContract.new(BridgeInstance.address);
    PercentFeeHandlerInstance = await PercentFeeHandlerContract.new(BridgeInstance.address);

    await ERC20MintableInstance.mint(depositerAddress, amount);
    await BridgeInstance.adminSetResource(ERC20HandlerInstance.address, resourceID, ERC20MintableInstance.address);

    await ERC20MintableInstance.approve(PercentFeeHandlerInstance.address, amount, { from: depositerAddress });
    await ERC20MintableInstance.approve(ERC20HandlerInstance.address, amount, { from: depositerAddress });

  });

  it("should transfer tokens", async () => {
    await ERC20MintableInstance.mint(PercentFeeHandlerInstance.address, amount)
    await ERC20MintableInstance.increaseAllowance(PercentFeeHandlerInstance.address, amount, { from: depositerAddress });

    await TruffleAssert.passes(
        await PercentFeeHandlerInstance.transferFee(resourceID, [depositerAddress], [amount])
      );
  });

  it("should require admin role to transfer tokens", async () => {
    await TruffleAssert.reverts(
        PercentFeeHandlerInstance.transferFee(resourceID, [depositerAddress], [amount], { from: recipientAddress })
    )
  })
});
