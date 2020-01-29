import { BigInt, BigDecimal, Bytes } from '@graphprotocol/graph-ts';

export function zeroBD(): BigDecimal {
  return BigDecimal.fromString('0');
}

export function zeroBI(): BigInt {
  return BigInt.fromI32(0);
}

export function zeroAddress(): Bytes {
  return Bytes.fromHexString('0x0000000000000000000000000000000000000000') as Bytes;
}

// @ts-ignore
export function exponentToBigDecimal(decimals: i32): BigDecimal {
  let bd = BigDecimal.fromString('1');
  let bd10 = BigDecimal.fromString('10');
  for (let i = 0; i < decimals; i++) {
    bd = bd.times(bd10);
  }
  return bd;
}

// @ts-ignore
export function exponentToBigInt(decimals: i32): BigInt {
  let bi = BigInt.fromI32(1);
  let bi10 = BigInt.fromI32(10);
  for (let i = 0; i < decimals; i++) {
    bi = bi.times(bi10);
  }
  return bi;
}
// @ts-ignore
export function convertTokenAmountToDecimals(amount: BigInt, decimals: i32): BigDecimal {
  return amount.toBigDecimal().div(exponentToBigDecimal(decimals));
}

export function convertValueFromRay(value: BigInt): BigDecimal {
  return convertTokenAmountToDecimals(value, 27);
}
