const { constants, expectEvent, expectRevert } = require('openzeppelin-test-helpers');
const { encodeCall } = require('../../src/helpers/encodeCall');

const { ZERO_ADDRESS } = constants;

const { padLeft } = web3.utils;

const CautiousAdminUpgradeabilityProxy = artifacts.require('CautiousAdminUpgradeabilityProxy');
const ImplV1 = artifacts.require('DummyImplementation');
const ImplV2 = artifacts.require('DummyImplementationV2');

const adminV1 = '0x0000000000000000000000000000000000000001';

contract('CautiousAdminUpgradeabilityProxy', function ([_, admin, newAdmin, other]) {

    before('set implementations', async function() {
        this.implementationV1 = await ImplV1.new();
        this.implementationV2 = await ImplV2.new();
      });

      beforeEach(async function() {
        const initializeData = Buffer.from('');
        this.proxy = await CautiousAdminUpgradeabilityProxy.new(
          this.implementationV1.address,
          admin,
          initializeData,
          { from: admin },
        );
      });

      describe('#getProxyAdmin', function() {
        it('delegates to implementation v1 when non-admin calls', async function() {
          const currentAdmin = await this.proxy.admin.call({from: other});
          expect(currentAdmin).to.equal(adminV1);
        });

        it('returns admin of the proxy if admin calls', async function() {
            const currentAdmin = await this.proxy.admin.call({from: admin});
            expect(currentAdmin).to.equal(admin);
          });
      });

      describe('#changeAdminCautiously', function() {
        it('fails to initiate proxy admin change if not called by the proxy admin', async function() {
          await expectRevert.unspecified(
            this.proxy.changeAdminCautiously(newAdmin, { from: other })
          );
        });

        it('initiates proxy admin change when admin calls', async function() {
            await this.proxy.changeAdminCautiously(newAdmin, { from: admin });
            const currentPendingAdmin = await this.proxy.adminPending.call({from: admin}); 
            expect(currentPendingAdmin).to.equal(newAdmin);
        });

        it('fails to initiate proxy admin change if new admin is same as old admin', async function() {
            await expectRevert(
              this.proxy.changeAdminCautiously(admin, { from: admin }),
              'Will not change the admin of a proxy to its current admin'
            );
          });

    });

    describe('#changeAdmin', function() {

        beforeEach(async function(){
            await this.proxy.changeAdminCautiously(newAdmin, { from: admin });
        });

        it('fails to complete proxy admin change if called by a non-admin', async function() {
            await expectRevert.unspecified(
                this.proxy.methods['changeAdmin(address)'](newAdmin, { from: other })
            );
        });

        it('fails to complete proxy admin change if called by the proxy admin', async function (){
        
            await expectRevert.unspecified(
                this.proxy.methods['changeAdmin(address)'](newAdmin, { from: admin })
            );
        });

        it('fails to complete proxy admin change if called by the new/pending proxy admin with incorrect address', async function() {
            await expectRevert.unspecified(
                this.proxy.methods['changeAdmin(address)'](other, { from: newAdmin })
            );
        });

        it('sets the new admin if called by the new/pending proxy admin with correct address', async function() {
            await this.proxy.methods['changeAdmin(address)'](newAdmin, { from: newAdmin })
            const currentAdmin = await this.proxy.admin.call({ from: newAdmin });            
            expect(currentAdmin).to.equal(newAdmin);
        });

    });

    describe('#getProxyImplementation', function() {
        it('returns proxy implementation address if user is admin', async function() {
          const implementationAddress = await this.proxy.implementation.call({from: admin});
          expect(implementationAddress).to.equal(this.implementationV1.address);
        });
      });

      describe('#upgrade', function() {
        context('with non-admin account', function() {
          it('fails to upgrade', async function() {
            await expectRevert.unspecified(
              this.proxy.upgradeTo(this.implementationV2.address, {from: other})
            );
          });
        });
    
        context('with admin account', function() {
          it('upgrades implementation', async function() {
            await this.proxy.upgradeTo(this.implementationV2.address, { from: admin });
            const implementationAddress = await this.proxy.implementation.call({from: admin});
            expect(implementationAddress).to.equal(this.implementationV2.address);
          });
        });

      });

      describe('#upgradeAndCall', function() {
        context('with non-admin account', function() {
          it('fails to upgrade', async function() {
            const callData = encodeCall(
              'initializeNonPayable',
              ['uint256'],
              [1337],
            );
            await expectRevert.unspecified(
              this.proxy.methods['upgradeToAndCall(address,bytes)']
                (
                  this.implementationV2.address,
                  callData,
                  { from: other }
                )
            );
          });
        });
    
        context('with admin account', function() {
          context('with invalid callData', function() {
            it('fails to upgrade', async function() {
              const callData = encodeCall('meesaNoExist', ['uint256'], [1337]);
              await expectRevert.unspecified(
                this.proxy.methods['upgradeToAndCall(address,bytes)'](
                    this.implementationV2.address,
                    callData,
                    {from: admin}
                  )
              );
            });
          });
    
          context('with valid callData', function() {
            it('upgrades implementation', async function() {
              const callData = encodeCall(
                'initializeNonPayable',
                ['uint256'],
                [1337],
              );
              await this.proxy
                .upgradeToAndCall(
                  this.implementationV2.address,
                  callData,
                  { from: admin }
                );
              const implementationAddress = await this.proxy.implementation.call({from: admin});
              expect(implementationAddress).to.equal(this.implementationV2.address);
            });
          });

        });
      });

});