import { BorderLineBuilder } from './borderlinebuilder';
import { TilePavingBuilder } from './tilesbuilder';
import { PavingType, TilesResult, TileCell, IStartPoint } from './tilestypedef';
import { XY } from '../../math/xy';

export interface IPavingTileOption {
    areaPaths: XY[][];
    start: IStartPoint;
    tileSizes: XY[];
    gap?: number;
    rotation?: number;
    stairOffset?: number;
    cellLessThan?: number;
}
export interface IBorderTileOption {
    areaPaths: XY[][];
    gap: number;
    tileSizes: XY[];
}

/**
 * @description 获取铺贴之后的tile cells
 * @export
 * @param {PavingType} type 
 * @param {(IPavingTileOption | IBorderTileOption)} data 
 * @returns  {TilesResult}
 */
export function buildPavingTile(type: PavingType, data: IPavingTileOption | IBorderTileOption): TilesResult {
    const isPaving = (t: PavingType, _: IPavingTileOption | IBorderTileOption): _ is IPavingTileOption => {
        if (t === PavingType.ContinuePav ||
            t === PavingType.ITypePav ||
            t === PavingType.RotatePav ||
            t === PavingType.WindmilPav) {
            return true;
        }
        return false;
    };
    const isBorderLine = (t: PavingType, _: IPavingTileOption | IBorderTileOption): _ is IBorderTileOption => {
        if (t === PavingType.BorderLine) {
            return true;
        }
        return false;
    };

    if (isPaving(type, data)) {
        const tilePaving =
            new TilePavingBuilder(data.areaPaths, data.start, data.tileSizes, data.gap, data.rotation, type , data.stairOffset, data.cellLessThan);
        return tilePaving.buildTiles();
    }

    if (isBorderLine(type, data)) {
        const borderPaving =
            new BorderLineBuilder(data.areaPaths, data.gap, data.tileSizes);
        return borderPaving.buildBorderLineTiles();
    }

    return { cells: [[]], start: { x: 0, y: 0 } };
}

export { BorderLineBuilder, TilePavingBuilder, PavingType };
export type { TilesResult, TileCell, IStartPoint };

