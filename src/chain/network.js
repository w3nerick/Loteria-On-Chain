// Red del historial: Asset Hub del Products Devnet (el Asset Hub de Paseo),
// la misma de Proof of Cam y testalk.
export const ASSET_HUB_GENESIS = '0xd6eec26135305a8ad257a20d003357284c8aa03d0bdb2b357ab0a22371e11ef2';
export const PUBLIC_WS = ['wss://asset-hub-paseo-rpc.n.dwellir.com', 'wss://sys.turboflakes.io/asset-hub-paseo'];

// People chain del devnet: de quién es cada username (para pagar con tu identidad .dot)
export const PEOPLE_GENESIS = '0xe6c30d6e148f250b887105237bcaa5cb9f16dd203bf7b5b9d4f1da7387cb86ec';
export const PEOPLE_WS = ['wss://people-paseo.gatotech.network', 'wss://rpc.interweb-it.com/people-paseo', 'wss://people-paseo.rotko.net'];

// LoteriaRegistry en pallet-revive. Vacío = sin desplegar: la app lo dice en
// pantalla en vez de fallar. Se llena con lo que deja `contract/deployments.json`.
export const REGISTRY_ADDRESS = '';

export const FAUCET_URL = 'https://faucet.polkadot.io';
