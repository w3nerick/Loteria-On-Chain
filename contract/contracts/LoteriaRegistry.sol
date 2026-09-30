// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title LoteriaRegistry: historial de rondas de Lotería en Cadena
/// @notice Por cada ronda guarda su cabecera (sala, semilla revelada, cartas
///         cantadas, ganadores) y el resultado de cada jugador: apodo, tabla,
///         casillas marcadas y la firma sr25519 con la que aprobó ese resultado.
/// @dev El contrato solo guarda bytes; el formato lo define la app
///      (src/chain/record.js) y la verificación se hace fuera de la cadena:
///      semilla contra compromiso, orden de la baraja, firma de cada jugador y
///      tablas contra cartas cantadas. Un registro con firma falsa no valida en
///      ningún verificador.
///
///      El id de la ronda es sha256("loteria-en-cadena/v1|<sala>|<ronda>|<compromiso>"),
///      lo calcula la app. Lo primero que se sella gana y nada se sobrescribe:
///      solo el cantor que selló la ronda puede agregarle jugadores (una sala
///      grande no cabe en una sola transacción).
contract LoteriaRegistry {
    struct Ronda {
        address cantor;
        uint64 bloque;
        uint64 fecha;
        uint32 jugadores;
        bytes cabecera;
    }

    /// La cabecera más grande (54 cartas, 3 ganadores, nombre de 24 letras con acentos) ronda 210 bytes.
    uint256 public constant MAX_CABECERA = 512;
    /// Unos 100 jugadores por llamada; más no cabe en el peso de una transacción.
    uint256 public constant MAX_PARTE = 16384;
    uint32 public constant MAX_JUGADORES = 1000;

    mapping(bytes32 => Ronda) private rondas;
    mapping(bytes32 => bytes[]) private partes;
    bytes32[] private ids;

    event RondaSellada(bytes32 indexed id, address indexed cantor);
    event JugadoresAgregados(bytes32 indexed id, uint32 cuantos, uint32 total);

    error IdVacio();
    error YaSellada(bytes32 id);
    error NoExiste(bytes32 id);
    error SoloElCantor(address cantor);
    error CabeceraInvalida(uint256 length);
    error ParteInvalida(uint256 length);
    error DemasiadosJugadores(uint32 total);

    /// @param id        sha256 de la ronda (ver arriba)
    /// @param cabecera  sala, ronda, figura, compromiso, semilla, cartas y ganadores
    /// @param jugadores registros de jugadores concatenados (puede ir vacío)
    /// @param cuantos   cuántos registros van en `jugadores`
    function sellar(bytes32 id, bytes calldata cabecera, bytes calldata jugadores, uint32 cuantos) external {
        if (id == bytes32(0)) revert IdVacio();
        if (rondas[id].cantor != address(0)) revert YaSellada(id);
        if (cabecera.length == 0 || cabecera.length > MAX_CABECERA) revert CabeceraInvalida(cabecera.length);

        rondas[id] = Ronda({
            cantor: msg.sender,
            bloque: uint64(block.number),
            fecha: uint64(block.timestamp),
            jugadores: 0,
            cabecera: cabecera
        });
        ids.push(id);
        emit RondaSellada(id, msg.sender);
        if (jugadores.length > 0) _agregar(id, jugadores, cuantos);
    }

    /// @notice Más jugadores para una ronda ya sellada, solo desde la cuenta que la selló.
    function agregar(bytes32 id, bytes calldata jugadores, uint32 cuantos) external {
        address cantor = rondas[id].cantor;
        if (cantor == address(0)) revert NoExiste(id);
        if (cantor != msg.sender) revert SoloElCantor(cantor);
        _agregar(id, jugadores, cuantos);
    }

    function _agregar(bytes32 id, bytes calldata jugadores, uint32 cuantos) private {
        if (jugadores.length == 0 || jugadores.length > MAX_PARTE || cuantos == 0) revert ParteInvalida(jugadores.length);
        Ronda storage r = rondas[id];
        uint32 total_ = r.jugadores + cuantos;
        if (total_ > MAX_JUGADORES) revert DemasiadosJugadores(total_);
        r.jugadores = total_;
        partes[id].push(jugadores);
        emit JugadoresAgregados(id, cuantos, total_);
    }

    /// @notice Cabecera y registros de una ronda. `r.cantor == address(0)` significa que no existe.
    function ronda(bytes32 id) external view returns (Ronda memory r, bytes[] memory registros) {
        return (rondas[id], partes[id]);
    }

    function total() external view returns (uint256) {
        return ids.length;
    }

    /// @notice Rondas en orden de sellado, sin los registros de jugadores: para listar el historial.
    function pagina(uint256 desde, uint256 cuantas) external view returns (bytes32[] memory outIds, Ronda[] memory outRondas) {
        uint256 n = ids.length;
        if (desde >= n) return (new bytes32[](0), new Ronda[](0));
        uint256 hasta = desde + cuantas > n ? n : desde + cuantas;
        outIds = new bytes32[](hasta - desde);
        outRondas = new Ronda[](hasta - desde);
        for (uint256 i = desde; i < hasta; i++) {
            outIds[i - desde] = ids[i];
            outRondas[i - desde] = rondas[ids[i]];
        }
    }
}
