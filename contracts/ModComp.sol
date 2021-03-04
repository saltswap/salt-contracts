pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import './libs/IBEP20.sol';
import './libs/SafeBEP20.sol';
import "@openzeppelin/contracts/access/Ownable.sol";

contract ModComp is Ownable {
    using SafeMath for uint256;
    using SafeBEP20 for IBEP20;

    // Info of each mod.
    struct UserInfo {
        uint256 lastBlockClaim; // last claimed block
        uint256 claimPerBlock; //  block payment
        uint256 endBlock; // end of salary
    }

    // SALT TOKEN
    IBEP20 public paymentToken;

    // Info of each mod
    mapping (address => UserInfo) public userInfo;

    event Claim(address indexed user, uint256 amount);
    event AddMod(address indexed user, uint256 claimPerBlock);
    event RemoveMod(address indexed user);

    constructor(
        IBEP20 _paymentToken
    ) public {
        paymentToken = _paymentToken;
    }

    function claim() public {
        uint256 reward = pendingReward(msg.sender);
        if (reward > 0) {
            UserInfo storage user = userInfo[msg.sender];
            user.lastBlockClaim = min(block.number, user.endBlock);
            paymentToken.transfer(address(msg.sender), reward);
            emit Claim(msg.sender, reward);     
        }
    }

    // View function to see pending Reward on frontend.
    function pendingReward(address _user) public view returns (uint256) {
        UserInfo storage user = userInfo[_user];
        uint256 claimableBlocks = min(block.number, user.endBlock) - user.lastBlockClaim;
        uint256 claimablePayment = claimableBlocks.mul(user.claimPerBlock);
        return claimablePayment;
    }

    function addMod(address _mod, uint256 _claimPerBlock) public onlyOwner {
        UserInfo storage user = userInfo[_mod];
        user.lastBlockClaim = block.number;
        user.claimPerBlock = _claimPerBlock;
        user.endBlock = 1115342314;
        emit AddMod(_mod, _claimPerBlock);
    }

    function removeMod(address _mod) public onlyOwner {
        delete userInfo[_mod];
        emit RemoveMod(_mod);
    }

    function updateSalary(address _mod, uint256 _claimPerBlock) public onlyOwner {
        UserInfo storage user = userInfo[_mod];
        user.claimPerBlock = _claimPerBlock;
    }

    /**
     * @dev block = 0 sets the current block as the endBlock.
     */
    function stopSalary(address _mod, uint256 _block) public onlyOwner {
        UserInfo storage user = userInfo[_mod];
        if (_block == 0) {
            user.endBlock = block.number;
        } else {
            user.endBlock = _block;
        }
    }

    // Withdraw reward. EMERGENCY ONLY.
    function emergencyPaymentWithdraw(uint256 _amount) public onlyOwner {
        paymentToken.safeTransfer(address(msg.sender), _amount);
    }

     /**
     * @dev Returns the smallest of two numbers.
     */
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

}