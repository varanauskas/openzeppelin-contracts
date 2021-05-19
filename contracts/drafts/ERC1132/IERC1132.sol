// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @title Interface of the ERC1132 standard as defined in the EIP.
 * @dev see https://github.com/ethereum/EIPs/issues/1132
 */
interface IERC1132 {
  /**
   * @dev Locks a specified amount of tokens against an address,
   *      for a specified reason and time
   * @param _reason The reason to lock tokens
   * @param _amount Number of tokens to be locked
   * @param _time Lock time in seconds
   */
  function lock(bytes32 _reason, uint256 _amount, uint256 _time) external returns (bool);
 
  /**
   * @dev Returns tokens locked for a specified address for a
   *      specified reason
   *
   * @param _of The address whose tokens are locked
   * @param _reason The reason to query the lock tokens for
   */
  function tokensLocked(address _of, bytes32 _reason) external returns (uint256 amount);
  
  /**
   * @dev Returns tokens locked for a specified address for a
   *      specified reason at a specific time
   *
   * @param _of The address whose tokens are locked
   * @param _reason The reason to query the lock tokens for
   * @param _time The timestamp to query the lock tokens for
   */
  function tokensLockedAtTime(address _of, bytes32 _reason, uint256 _time) external view returns (uint256 amount);
  
  /**
    * @dev @dev Returns total tokens held by an address (locked + transferable)
    * @param _of The address to query the total balance of
    */
  function totalBalanceOf(address _of) external view returns (uint256 amount);
  
  /**
   * @dev Extends lock for a specified reason and time
   * @param _reason The reason to lock tokens
   * @param _time Lock extension time in seconds
   */
  function extendLock(bytes32 _reason, uint256 _time) external returns (bool);
  
  /**
   * @dev Increase number of tokens locked for a specified reason
   * @param _reason The reason to lock tokens
   * @param _amount Number of tokens to be increased
   */
  function increaseLockAmount(bytes32 _reason, uint256 _amount) external returns (bool);

  /**
   * @dev Returns unlockable tokens for a specified address for a specified reason
   * @param _of The address to query the the unlockable token count of
   * @param _reason The reason to query the unlockable tokens for
   */
  function tokensUnlockable(address _of, bytes32 _reason) external view returns (uint256 amount);
 
  /**
   * @dev Gets the unlockable tokens of a specified address
   * @param _of The address to query the the unlockable token count of
   */
  function getUnlockableTokens(address _of) external view returns (uint256 unlockableTokens);

  /**
   * @dev Unlocks the unlockable tokens of a specified address
   * @param _of Address of user, claiming back unlockable tokens
   */
  function unlock(address _of) external returns (uint256 unlockableTokens);

  /**
   * @dev Emitted when `_amount` tokens are locked in the account (`_of`)
   * for the given `_reason`
   */
  event Locked(address indexed _of, bytes32 indexed _reason, uint256 _amount, uint256 _validity);

  /**
   * @dev Emitted when `_amount` tokens that were locked in the account (`_of`)
   * for the given `_reason` are unlocked.
   */
  event Unlocked(address indexed _of, bytes32 indexed _reason, uint256 _amount);
}
