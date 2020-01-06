var Ida = artifacts.require("Ida");
var AUSD = artifacts.require("AliceUSD");
var ImpactPromise = artifacts.require("ImpactPromise");
var FluidToken = artifacts.require("FluidToken");
var Escrow = artifacts.require("Escrow");
var FluidEscrowFactory = artifacts.require("FluidEscrowFactory");
var Sts = artifacts.require("SimpleTokenSeller");
var StsFactory = artifacts.require("SimpleTokenSellerFactory");
var ImpactPromiseFactory = artifacts.require("ImpactPromiseFactory");
var IdaFactory = artifacts.require("IdaFactory");
var ClaimsRegistry = artifacts.require("ClaimsRegistry");


require("./test-setup");
const { time } = require('openzeppelin-test-helpers');

contract('Ida Factory', function ([owner, validator, arbiter, investor, unauthorised]) {
  var escrow;
  var usd;
  var ida;
  var paymentRights;
  var impactPromise;

  var factory, sts, claimsRegistry;
  var end;

  const COOL_OFF_PERIOD = 1000;

  before("deploy Ida factory & usd", async function () {
    end = await time.latest() + time.duration.years(1);
    usd = await AUSD.new();
    let impactPromiseFactory = await ImpactPromiseFactory.new();
    let stsFactory = await StsFactory.new();
    let escrowFactory = await FluidEscrowFactory.new();
    claimsRegistry = await ClaimsRegistry.new();
    factory = await IdaFactory.new(stsFactory.address, impactPromiseFactory.address, escrowFactory.address, claimsRegistry.address, {gas: 6500000});
  });

  it("should create a new Ida", async function () {

    let tx = await factory.createIda(usd.address, "TEST", 10, 100, validator, arbiter, end, COOL_OFF_PERIOD, {gas: 8000000});
    console.log("Gas used: " + tx.receipt.gasUsed);

    let idaAddress = tx.receipt.logs[0].args.ida;
    let stsAddress = tx.receipt.logs[0].args.sts;
    ida = await Ida.at(idaAddress);
    sts = await Sts.at(stsAddress);

    paymentRights = await FluidToken.at(await ida.paymentRights());
    (await paymentRights.balanceOf(owner)).should.be.bignumber.equal('1000');
    (await paymentRights.totalSupply()).should.be.bignumber.equal('1000');

    let impactPromiseAddress = await ida.impactPromise();
    impactPromise = await ImpactPromise.at(impactPromiseAddress);
    (await impactPromise.balanceOf(owner)).should.be.bignumber.equal('0');
    (await impactPromise.totalSupply()).should.be.bignumber.equal('0');

    escrow = await Escrow.at(await ida.escrow());
    (await escrow.capacity()).should.be.bignumber.equal('1000');
    (await usd.balanceOf(escrow.address)).should.be.bignumber.equal('0');
  });


  it("should not allow buying before price is set up", async function () {
    await usd.mint(investor, 100);
    await sts.buy(100, {from: investor}).shouldBeReverted();
  });


  it("should not allow updating conditions by other than owner", async function () {
    await paymentRights.approve(sts.address, 100, {from: owner});
    await sts.updateConditions(100, 50, {from: investor}).shouldBeReverted();
  });


  it("should allow updating conditions by owner", async function () {
    await sts.updateConditions(100, 50, {from: owner});

    (await sts.currentSupply()).should.be.bignumber.equal('100');
    (await sts.currentDiscount()).should.be.bignumber.equal('50');
  });


  it("should buy tokens by investor", async function () {
    await usd.approve(sts.address, 100, {from:investor});

    await sts.buy(50, {from: investor});

    (await usd.balanceOf(owner)).should.be.bignumber.equal('25');
    (await usd.balanceOf(investor)).should.be.bignumber.equal('75');

    (await paymentRights.balanceOf(sts.address)).should.be.bignumber.equal('50');
    (await paymentRights.balanceOf(investor)).should.be.bignumber.equal('50');
  });

});



