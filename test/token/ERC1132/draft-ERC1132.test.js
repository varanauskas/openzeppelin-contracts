const { BN, time, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const ERC1132 = artifacts.require('ERC1132Mock');

const ZERO = web3.utils.toBN(0);
const ONE = web3.utils.toBN(1);

contract('ERC1132', function (accounts) {
  const [initialHolder, receiver] = accounts;

  const name = 'ERC1132Test';
  const symbol = '1132T';

  const initialSupply = new BN(1000);

  const lockedAmount = new BN(20);
  const lockReason = web3.utils.asciiToHex('VEST');
  const otherLockReason = web3.utils.asciiToHex('TEST');
  const lockPeriod = new BN(1000);

  beforeEach(async function () {
    this.token = await ERC1132.new(name, symbol, initialHolder, initialSupply);
  });

  it('has the right balance for the holder', async function () {
    expect(await this.token.balanceOf(initialHolder)).to.be.bignumber.equal(initialSupply);
    expect(await this.token.totalBalanceOf(initialHolder)).to.be.bignumber.equal(initialSupply);
    expect(await this.token.totalSupply()).to.be.bignumber.equal(initialSupply);
  });

  context('with locked tokens', function () {
    beforeEach(async function () {
      this.initialBalance = await this.token.balanceOf(initialHolder);
      const receipt = await this.token.lock(lockReason, lockedAmount, lockPeriod, { from: initialHolder });
      const block = await web3.eth.getBlock(receipt.receipt.blockHash);
      this.lockTimestamp = web3.utils.toBN(block.timestamp);
    });

    it('reduces locked tokens from transferable balance', async function () {
      const balance = await this.token.balanceOf(initialHolder);
      expect(balance).to.be.bignumber.equal(this.initialBalance.sub(lockedAmount));
      expect(await this.token.totalBalanceOf(initialHolder)).to.be.bignumber.equal(this.initialBalance);
      expect(await this.token.tokensLocked(initialHolder, lockReason)).to.be.bignumber.equal(lockedAmount);
      const atTime = this.lockTimestamp.add(lockPeriod).add(ONE);
      const lockedAtTime = await this.token.tokensLockedAtTime(initialHolder, lockReason, atTime);
      expect(lockedAtTime).to.be.bignumber.equal(ZERO);

      const transferAmount = ONE;
      const { logs } = await this.token.transfer(receiver, transferAmount, { from: initialHolder });
      expect(await this.token.balanceOf(initialHolder)).to.be.bignumber.equal(balance.sub(transferAmount));
      expect(await this.token.balanceOf(receiver)).to.be.bignumber.equal(transferAmount);
      expect(logs.length).to.equal(1);
      expect(logs[0].event).to.equal('Transfer');
      expect(logs[0].args.from).to.equal(initialHolder);
      expect(logs[0].args.to).to.equal(receiver);
      expect(logs[0].args.value).to.bignumber.equal(transferAmount);
    });

    it('reverts locking more tokens via lock function', async function () {
      const balance = await this.token.balanceOf(initialHolder);
      await expectRevert(
        this.token.lock(lockReason, balance, lockPeriod, { from: initialHolder }),
        'Tokens already locked',
      );
    });

    it('can extend lock period for an existing lock', async function () {
      const initialLock = await this.token.locked(initialHolder, lockReason);
      await this.token.extendLock(lockReason, lockPeriod, { from: initialHolder });
      const extendedLock = await this.token.locked(initialHolder, lockReason);
      expect(extendedLock.validity).to.be.bignumber.equal(initialLock.validity.add(lockPeriod));
      await expectRevert(
        this.token.extendLock(otherLockReason, lockPeriod, { from: initialHolder }),
        'No tokens locked',
      );
    });

    it('can increase the number of tokens locked', async function () {
      const initialLockedAmount = await this.token.tokensLocked(initialHolder, lockReason);
      await this.token.increaseLockAmount(lockReason, lockedAmount, { from: initialHolder });
      const increasedLockAmount = await this.token.tokensLocked(initialHolder, lockReason);
      expect(increasedLockAmount).to.be.bignumber.equal(initialLockedAmount.add(lockedAmount));
      await expectRevert(
        this.token.increaseLockAmount(otherLockReason, lockedAmount, { from: initialHolder }),
        'No tokens locked',
      );
    });

    it('can unlock tokens', async function () {
      const extendedLock = await this.token.locked(initialHolder, lockReason);
      const initialBalance = await this.token.balanceOf(initialHolder);
      const tokensLocked = await this.token.tokensLockedAtTime(initialHolder, lockReason, this.lockTimestamp);
      await time.increase(extendedLock.validity.add(web3.utils.toBN(60)).sub(this.lockTimestamp));
      expect(await this.token.getUnlockableTokens(initialHolder)).to.be.bignumber.equal(tokensLocked);
      await this.token.unlock(initialHolder);
      expect(await this.token.getUnlockableTokens(initialHolder)).to.be.bignumber.equal(ZERO);
      const unlockedBalance = await this.token.balanceOf(initialHolder);
      expect(unlockedBalance).to.be.bignumber.equal(initialBalance.add(tokensLocked));
      await this.token.unlock(initialHolder);
      expect(await this.token.balanceOf(initialHolder)).to.be.bignumber.equal(unlockedBalance);
    });

    it('should not allow to increase lock amount by more than balance', async function () {
      await expectRevert(
        this.token.increaseLockAmount(
          lockReason,
          (await this.token.balanceOf(initialHolder)).add(ONE),
          { from: initialHolder },
        ),
        'ERC20: transfer amount exceeds balance',
      );
    });

    it('should show 0 lock amount for unknown reasons', async function () {
      expect(await this.token.tokensLocked(initialHolder, otherLockReason)).to.be.bignumber.equal(ZERO);
    });
  });

  it('should allow to lock token again', async function () {
    await this.token.lock(otherLockReason, ONE, ZERO, { from: initialHolder });
    await this.token.unlock(initialHolder);
    await this.token.lock(otherLockReason, ONE, ONE, { from: initialHolder });
    expect(await this.token.tokensLocked(initialHolder, otherLockReason)).to.be.bignumber.equal(ONE);
  });

  it('can transferWithLock', async function () {
    const holderBalance = await this.token.balanceOf(initialHolder);
    const receiverBalance = await this.token.balanceOf(receiver);
    await this.token.transferWithLock(receiver, otherLockReason, holderBalance.sub(ONE), ZERO, { from: initialHolder });
    await expectRevert(
      this.token.transferWithLock(receiver, otherLockReason, holderBalance, lockPeriod, { from: initialHolder }),
      'Tokens already locked',
    );
    const locked = await this.token.locked(receiver, otherLockReason);
    expect(await this.token.balanceOf(initialHolder)).to.be.bignumber.equal(ONE);
    expect(await this.token.balanceOf(receiver)).to.be.bignumber.equal(receiverBalance);
    expect(locked.amount).to.be.bignumber.equal(holderBalance.sub(ONE));
  });

  it('should allow transfer with lock again after claiming', async function () {
    const initialLockedAmount = await this.token.tokensLocked(receiver, otherLockReason);
    await this.token.transferWithLock(receiver, otherLockReason, ONE, 10000, { from: initialHolder });
    const actualLockedAmount = await this.token.tokensLocked(receiver, otherLockReason);
    expect(actualLockedAmount).to.be.bignumber.equal(initialLockedAmount.add(ONE));
  });

  it('should not allow 0 lock amount', async function () {
    await expectRevert(this.token.lock(otherLockReason, 0, 1, { from: initialHolder }), 'Amount can not be 0');
    await expectRevert(
      this.token.transferWithLock(receiver, otherLockReason, 0, lockPeriod, { from: initialHolder }),
      'Amount can not be 0',
    );
  });

  it('should not allow to transfer and lock more than balance', async function () {
    const balance = await this.token.balanceOf(initialHolder);
    await expectRevert(
      this.token.transferWithLock(receiver, otherLockReason, balance.add(ONE), lockPeriod, { from: initialHolder }),
      'ERC20: transfer amount exceeds balance',
    );
  });
});
