pragma solidity ^0.5.0;

import './AdminUpgradeabilityProxy.sol';

/**
 * @title BaseCautiousAdminUpgradeabilityProxy
 * @dev This contract combines an upgradeability proxy with an authorization
 * mechanism for administrative tasks and adds checks to avoid any possible
 * administrative lockout.
 * All external functions in this contract meant to be used
 * only by the current admin must be guarded by the `ifAdmin` modifier.
 * See ethereum/solidity#3864 for a Solidity feature proposal
 * that would enable this to be done automatically.
 * All external functions in this contract meant to be used only by the
 * pending new admin must be guarded by the `ifAdminPending` modifier.
 */
contract BaseCautiousAdminUpgradeabilityProxy is BaseAdminUpgradeabilityProxy {

  /**
   * @dev Emitted when an administration transfer has been initiated.
   * @param currentAdmin Address of the previous admin.
   * @param pendingAdmin Address of the new admin.
   */
  event AdminChangeInitiated(address currentAdmin, address pendingAdmin);

  /**
   * @dev Storage slot with the new, pending admin of the contract.
   * This is the keccak-256 hash of "eip1967.proxy.admin.transfer" subtracted by 1, and is
   * validated in the constructor.
   */
  bytes32 internal constant ADMIN_TRANSFER_SLOT = 0x147ba29b71eaec5e1c94e0bf7116e0eb388c27cbd036ab502f269504fec99904;

  /**
   * @dev Modifier to check whether the `msg.sender` is the pending/next admin.
   * If it is, it will run the function. Otherwise, it will delegate the call
   * to the implementation.
   */
  modifier ifAdminPending() {
    if (msg.sender == _adminPending()) {
      _;
    } else {
      _fallback();
    }
  }

  /**
   * @return The address of the pending/next proxy admin.
   */
  function adminPending() external ifAdmin returns (address) {
    return _adminPending();
  }

    /**
   * @dev Initiates a change of admin of the proxy.
   * Only the current admin can call this function.
   * @param newAdmin Address to transfer proxy administration to.
   */
  function changeAdminCautiously(address newAdmin) external ifAdmin {
    address currentAdmin = _admin();
    require(currentAdmin != newAdmin, 'Will not change the admin of a proxy to its current admin');
    emit AdminChangeInitiated(_admin(), newAdmin);
    _setAdminPending(newAdmin);
  }

  /**
   * @dev Changes the admin of the proxy to the pending admin.
   * Only the pending admin can call this function.
   */
  function _changeAdminConfirmed() internal {
    address newAdmin = _adminPending();
    emit AdminChanged(_admin(), newAdmin);
    _setAdmin(newAdmin);
  }

  /**
   * @dev Changes the admin of the proxy to the pending admin.
   * Only the pending admin can call this function.
   * Only accepts an argument to override parent.
   */
  function changeAdmin(address expectedNewAdmin) external ifAdminPending {
    require(msg.sender == expectedNewAdmin);
    _changeAdminConfirmed();
  }

  /**
   * @return The new admin slot.
   */
  function _adminPending() internal view returns (address newAdmin) {
    bytes32 slot = ADMIN_TRANSFER_SLOT;
    assembly {
      newAdmin := sload(slot)
    }
  }

  /**
   * @dev Sets the address of the new, pending proxy admin.
   * @param newAdmin Address of the new proxy admin.
   */
  function _setAdminPending(address newAdmin) internal {
    bytes32 slot = ADMIN_TRANSFER_SLOT;
    assembly {
      sstore(slot, newAdmin)
    }
  }

}