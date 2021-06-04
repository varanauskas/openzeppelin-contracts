// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../token/ERC1132/draft-ERC1132.sol";

contract ERC1132Mock is Context, ERC1132 {
    constructor(
        string memory name,
        string memory symbol,
        address initialAccount,
        uint256 initialBalance
    ) ERC1132(name, symbol) {
        _mint(initialAccount, initialBalance);
    }

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }
}
