import { XY } from '../../math/xy';
/**
 * @description 铺贴类型
 * @enum {number}
 */
export enum PavingType {
    /** `连续铺` 平铺 */
    ContinuePav = 1,
    /** `工字铺` 上下错开半块砖铺贴 */
    ITypePav,
    /** `旋转铺` 依据材质的数量，`单砖`或`双砖`旋转铺贴 */
    RotatePav,
    /** `波打线` 波打线铺砖. `单砖`或`双砖`波打线铺贴 */
    BorderLine,
    /** `大小铺-风车铺` 大砖小砖错开砖铺贴 */
    WindmilPav
}

export enum YLocationEnum {
    down = 1,
    middle = 2,
    up = 3
}

export interface TileCell {
    path: XY[];
    fullPath: XY[];
    uvPath: XY[];
    noRotationPath: XY[];
    noRotationFullPath: XY[];
    center: XY;
    noRotationTopLeft: XY;
    start: XY;
    rotation: number;
    invalid: boolean;
    yLocation?: YLocationEnum;
    materialIndex?: number;
}

export interface TilesResult {
    start: XY;
    cells: TileCell[][];
}

export interface IStartPoint {
    x: number;
    y: number;
    alignType: number;
    axisAngle: number;
    type: number;
}

