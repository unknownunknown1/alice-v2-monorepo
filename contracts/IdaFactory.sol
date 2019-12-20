pragma solidity ^0.5.2;

import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import './Ida.sol';
import './SimpleTokenSeller.sol';
import './ImpactPromiseFactory.sol';

/**
 * @title IdaFactory - a contract designed to orchestrate Ida creation
 * by automatically deploying and linking payment rights seller contract
 *
 */
contract IdaFactory {

  event IdaCreated(address indexed ida, address indexed sts);

  SimpleTokenSellerFactory simpleTokenSellerFactory;
  ImpactPromiseFactory impactPromiseFactory;
  ClaimsRegistry public claimsRegistry;


  constructor(SimpleTokenSellerFactory _simpleTokenSellerFactory, ImpactPromiseFactory _impactPromiseFactory, ClaimsRegistry _claimsRegistry) public {
    simpleTokenSellerFactory = _simpleTokenSellerFactory;
    impactPromiseFactory = _impactPromiseFactory;
    claimsRegistry = _claimsRegistry;
  }


  function createIda(
      ERC20 _paymentToken,
      string memory _name,
      uint256 _outcomesNumber,
      uint256 _outcomesPrice,
      address _validator,
      address _arbiter,
      uint256 _endTime,
      uint256 _validationCoolOffPeriod
  ) public returns (Ida) {

    ImpactPromise promiseToken = impactPromiseFactory.createImpactPromise();
    Ida ida = new Ida(_paymentToken, promiseToken, claimsRegistry, _name, _outcomesNumber, _outcomesPrice, _validator, _arbiter, _validationCoolOffPeriod, _endTime, msg.sender);
    promiseToken.addMinter(address(ida));
    SimpleTokenSeller sts = simpleTokenSellerFactory.createSimpleTokenSeller(ida.paymentToken(), ida.paymentRights(), msg.sender);

    emit IdaCreated(address(ida), address(sts));
    return ida;
  }

}
