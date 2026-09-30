// Pruebas de lógica de LoteriaRegistry en una EVM local (@ethereumjs/vm).
//
// El destino real es pallet-revive (PolkaVM, compilado con resolc). Esto cubre
// la lógica del contrato: primero gana, solo el cantor agrega jugadores,
// límites, getters y paginado. El bytecode PolkaVM se prueba aparte con
// `npm run simulate` contra el devnet.
import { readFileSync } from 'node:fs';
import { createVM } from '@ethereumjs/vm';
import { createBlock } from '@ethereumjs/block';
import { createAddressFromString, hexToBytes, bytesToHex } from '@ethereumjs/util';
import { encodeFunctionData, decodeFunctionResult, decodeErrorResult, toHex } from 'viem';
import assert from 'node:assert/strict';

const abi = JSON.parse(readFileSync(new URL('../out-evm/LoteriaRegistry.abi', import.meta.url)));
const bin = '0x' + readFileSync(new URL('../out-evm/LoteriaRegistry.bin', import.meta.url), 'utf8').trim();

const vm = await createVM();
const block = createBlock({ header: { number: 13_900_000n, timestamp: 1_790_100_000n, gasLimit: 30_000_000n } }, { common: vm.common });
const cantor = createAddressFromString('0x' + '11'.repeat(20));
const otro = createAddressFromString('0x' + '22'.repeat(20));

const deploy = await vm.evm.runCall({ data: hexToBytes(bin), gasLimit: 10_000_000n, caller: cantor, block });
assert.equal(deploy.execResult.exceptionError, undefined, 'deploy');
const to = deploy.createdAddress;

async function call(fn, args, caller = cantor) {
  const r = await vm.evm.runCall({ to, caller, data: hexToBytes(encodeFunctionData({ abi, functionName: fn, args })), gasLimit: 25_000_000n, block });
  const ret = bytesToHex(r.execResult.returnValue);
  if (r.execResult.exceptionError) {
    const err = ret !== '0x' ? decodeErrorResult({ abi, data: ret }) : { errorName: String(r.execResult.exceptionError.error) };
    return { reverted: err.errorName, args: err.args };
  }
  return { value: ret === '0x' ? undefined : decodeFunctionResult({ abi, functionName: fn, data: ret }) };
}

const id1 = '0x' + 'a1'.repeat(32);
const id2 = '0x' + 'b2'.repeat(32);
const ZERO32 = '0x' + '00'.repeat(32);
const cab = toHex(new Uint8Array(210).fill(7));
const jug = (n) => toHex(new Uint8Array(n * 110).fill(9));
let passed = 0;
const ok = (name) => {
  passed++;
  console.log('  ✓', name);
};

console.log('LoteriaRegistry');

assert.deepEqual((await call('total', [])).value, 0n);
ok('empieza vacío');

let r = await call('sellar', [id1, cab, jug(4), 4]);
assert.equal(r.reverted, undefined);
ok('sella una ronda con 4 jugadores');

r = await call('ronda', [id1]);
const [ronda, partes] = r.value;
assert.equal(ronda.cantor.toLowerCase(), cantor.toString());
assert.equal(ronda.bloque, 13_900_000n);
assert.equal(ronda.fecha, 1_790_100_000n);
assert.equal(ronda.jugadores, 4);
assert.equal(ronda.cabecera, cab);
assert.deepEqual(partes, [jug(4)]);
ok('guarda cantor, bloque, fecha, cabecera y registros');

assert.equal((await call('sellar', [id1, cab, '0x', 0])).reverted, 'YaSellada');
ok('lo primero que se sella gana');

assert.equal((await call('agregar', [id1, jug(2), 2], otro)).reverted, 'SoloElCantor');
ok('nadie más le agrega jugadores');

assert.equal((await call('agregar', [id1, jug(96), 96])).reverted, undefined);
r = await call('ronda', [id1]);
assert.equal(r.value[0].jugadores, 100);
assert.equal(r.value[1].length, 2);
ok('el cantor agrega más jugadores por partes (100 en total)');

assert.equal((await call('agregar', [id2, jug(1), 1])).reverted, 'NoExiste');
ok('no se agregan jugadores a una ronda que no existe');

assert.equal((await call('sellar', [ZERO32, cab, '0x', 0])).reverted, 'IdVacio');
assert.equal((await call('sellar', [id2, '0x', '0x', 0])).reverted, 'CabeceraInvalida');
assert.equal((await call('sellar', [id2, toHex(new Uint8Array(513)), '0x', 0])).reverted, 'CabeceraInvalida');
assert.equal((await call('agregar', [id1, '0x', 0])).reverted, 'ParteInvalida');
assert.equal((await call('agregar', [id1, toHex(new Uint8Array(16385)), 1])).reverted, 'ParteInvalida');
assert.equal((await call('agregar', [id1, jug(1), 0])).reverted, 'ParteInvalida');
ok('rechaza id vacío, cabecera vacía o grande y partes inválidas');

assert.equal((await call('agregar', [id1, jug(1), 901])).reverted, 'DemasiadosJugadores');
ok('tope de 1000 jugadores por ronda');

assert.equal((await call('sellar', [id2, cab, '0x', 0], otro)).reverted, undefined);
assert.deepEqual((await call('total', [])).value, 2n);
r = await call('pagina', [0n, 10n]);
assert.deepEqual(r.value[0], [id1, id2]);
assert.equal(r.value[1][1].cantor.toLowerCase(), otro.toString());
assert.equal(r.value[1][1].jugadores, 0);
r = await call('pagina', [1n, 10n]);
assert.deepEqual(r.value[0], [id2]);
r = await call('pagina', [5n, 10n]);
assert.deepEqual(r.value[0], []);
ok('pagina en orden de sellado, sin registros de jugadores');

r = await call('ronda', ['0x' + 'cc'.repeat(32)]);
assert.match(r.value[0].cantor, /^0x0{40}$/);
ok('una ronda inexistente vuelve con cantor cero');

console.log(`\n${passed} pruebas pasaron`);
