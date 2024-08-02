Palkeoramix decompiler. 

const proxyType = 2

def storage:
  stor99 is mapping of struct at storage 99
  stor546D is uint128 at storage 0x546d617469632e6e6574776f726b2e70726f78792e696d706c656d656e746174696f offset 160
  implementationAddress is address at storage 0x546d617469632e6e6574776f726b2e70726f78792e696d706c656d656e746174696f
  stor546D is uint256 at storage 0x546d617469632e6e6574776f726b2e70726f78792e696d706c656d656e746174696f

def proxyOwner(): # not payable
  return address(stor[sha3('matic.network.proxy.owner')].field_0)

def implementation(): # not payable
  return implementationAddress

#
#  Regular functions
#

def _fallback(?) payable: # default function
  delegate uint256(stor546D.field_0) with:
     funct call.data[0 len 4]
       gas gas_remaining - 10000 wei
      args call.data[4 len calldata.size - 4]
  if not delegate.return_code:
      revert with ext_call.return_data[0 len return_data.size]
  return ext_call.return_data[0 len return_data.size]

def transferProxyOwnership(address newOwner): # not payable
  require calldata.size - 4 >= 32
  if address(stor[sha3('matic.network.proxy.owner')].field_0) != caller:
      revert with 0, 'NOT_OWNER'
  if not newOwner:
      revert with 0, 'ZERO_ADDRESS'
  log ProxyOwnerUpdate(
        address _new=address(newOwner),
        address _old=address(stor[sha3('matic.network.proxy.owner')].field_0))
  address(stor[sha3('matic.network.proxy.owner')].field_0) = newOwner
  Mask(96, 0, stor[sha3('matic.network.proxy.owner')].field_160) = 0

def updateImplementation(address _newProxyTo): # not payable
  require calldata.size - 4 >= 32
  if address(stor[sha3('matic.network.proxy.owner')].field_0) != caller:
      revert with 0, 'NOT_OWNER'
  if not _newProxyTo:
      revert with 0, 'INVALID_PROXY_ADDRESS'
  if ext_code.size(_newProxyTo) <= 0:
      revert with 0x8c379a000000000000000000000000000000000000000000000000000000000, 
                  32,
                  37,
                  0xfe44455354494e4154494f4e5f414444524553535f49535f4e4f545f415f434f4e54524143,
                  mem[201 len 27]
  log ProxyUpdated(
        address _new=_newProxyTo,
        address _old=implementationAddress)
  implementationAddress = _newProxyTo
  Mask(96, 0, stor546D.field_160) = 0

def updateAndCall(address _newProxyTo, bytes data) payable: 
  require calldata.size - 4 >= 64
  require data <= unknown10000000()
  require data + 36 <= calldata.size
  require data.length <= unknown10000000() and data + data.length + 36 <= calldata.size
  mem[128 len data.length] = data[all]
  mem[data.length + 128] = 0
  if address(stor[sha3(Mask(200, -(8 * ceil32(data.length) + -data.length + 25) + 256, 0) >> 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff38 + (8 * -ceil32(data.length)) + (8 * data.length) + 256)].field_0) != caller:
      revert with 0, 'NOT_OWNER'
  if address(stor[sha3(Mask(200, -(8 * ceil32(data.length) + -data.length + 25) + 256, 0) >> 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff38 + (8 * -ceil32(data.length)) + (8 * data.length) + 256)].field_0) != caller:
      revert with 0, 'NOT_OWNER'
  if not _newProxyTo:
      revert with 0, 'INVALID_PROXY_ADDRESS'
  if ext_code.size(_newProxyTo) <= 0:
      revert with 0, 
                  32,
                  37,
                  0xfe44455354494e4154494f4e5f414444524553535f49535f4e4f545f415f434f4e54524143,
                  mem[ceil32(data.length) + 233 len 27]
  log ProxyUpdated(
        address _new=_newProxyTo,
        address _old=address(stor[Mask(8 * -data.length + ceil32(data.length) + 2, 0, 0x546d617469632e6e6574776f726b2e70726f78792e696d706c656d656e746174696f)][Mask(8 * -ceil32(data.length) + data.length + 32, 0, 0)].field_0))
  mem[ceil32(data.length) + 128 len 34] = 0x546d617469632e6e6574776f726b2e70726f78792e696d706c656d656e746174696f
  address(stor[Mask(8 * -data.length + ceil32(data.length) + 2, 0, 0x546d617469632e6e6574776f726b2e70726f78792e696d706c656d656e746174696f)][Mask(8 * -ceil32(data.length) + data.length + 32, 0, 0)].field_0) = _newProxyTo
  Mask(96, 0, stor[Mask(8 * -data.length + ceil32(data.length) + 2, 0, 0x546d617469632e6e6574776f726b2e70726f78792e696d706c656d656e746174696f)][Mask(8 * -ceil32(data.length) + data.length + 32, 0, 0)].field_160) = 0
  mem[ceil32(data.length) + 128 len floor32(data.length)] = call.data[data + 36 len floor32(data.length)]
  mem[ceil32(data.length) + floor32(data.length) + -(data.length % 32) + 160 len data.length % 32] = mem[-(data.length % 32) + floor32(data.length) + 160 len data.length % 32]
  call this.address with:
     funct Mask(32, -(8 * ceil32(data.length) + -data.length + 4) + 256, 0) >> -(8 * ceil32(data.length) + -data.length + 4) + 256
     value call.value wei
       gas gas_remaining wei
      args mem[ceil32(data.length) + 132 len data.length - 4]
  if ext_call.success:
      stop
  if return_data.size:
      mem[ceil32(data.length) + ceil32(return_data.size) + 197 len ceil32(return_data.size)] = ext_call.return_data[0 len return_data.size], Mask(8 * ceil32(return_data.size) - return_data.size, -(8 * ceil32(return_data.size) + -ceil32(return_data.size) + 27) + 256, 32) >> -(8 * ceil32(return_data.size) + -ceil32(return_data.size) + 27) + 256
      if not return_data.size % 32:
          revert with 0, 
                      32,
                      return_data.size,
                      Mask(8 * return_data.size, -(8 * return_data.size) + 256, ext_call.return_data[0 len return_data.size], Mask(8 * ceil32(return_data.size) - return_data.size, -(8 * ceil32(return_data.size) + -ceil32(return_data.size) + 27) + 256, 32) >> -(8 * ceil32(return_data.size) + -ceil32(return_data.size) + 27) + 256) << (8 * return_data.size) - 256
      mem[floor32(return_data.size) + ceil32(data.length) + ceil32(return_data.size) + 197] = mem[floor32(return_data.size) + ceil32(data.length) + ceil32(return_data.size) + -(return_data.size % 32) + 229 len return_data.size % 32]
      revert with 0, 
                  32,
                  return_data.size,
                  Mask(8 * ceil32(return_data.size), -(8 * ceil32(return_data.size)) + 256, ext_call.return_data[0 len return_data.size], Mask(8 * ceil32(return_data.size) - return_data.size, -(8 * ceil32(return_data.size) + -ceil32(return_data.size) + 27) + 256, 32) >> -(8 * ceil32(return_data.size) + -ceil32(return_data.size) + 27) + 256) << (8 * ceil32(return_data.size)) - 256,
                  mem[ceil32(data.length) + ceil32(return_data.size) + ceil32(return_data.size) + 197 len floor32(return_data.size) + -ceil32(return_data.size) + 32]
  mem[ceil32(data.length) + 128] = 0x8c379a000000000000000000000000000000000000000000000000000000000
  mem[ceil32(data.length) + 196 len ceil32(data.length)] = data[all], mem[data.length + 128 len ceil32(data.length) - data.length]
  if not data.length % 32:
      revert with 0, 
                  32,
                  data.length,
                  Mask(8 * data.length, -(8 * data.length) + 256, data[all], mem[data.length + 128 len ceil32(data.length) - data.length]) << (8 * data.length) - 256
  mem[floor32(data.length) + ceil32(data.length) + 196] = mem[floor32(data.length) + ceil32(data.length) + -(data.length % 32) + 228 len data.length % 32]
  revert with 0, 
              32,
              data.length,
              Mask(8 * ceil32(data.length), -(8 * ceil32(data.length)) + 256, data[all], mem[data.length + 128 len ceil32(data.length) - data.length]) << (8 * ceil32(data.length)) - 256,
              mem[(2 * ceil32(data.length)) + 196 len floor32(data.length) + -ceil32(data.length) + 32]

Decompilation generated by Panoramix.

Raw bytecode
