import { PavingType, TilesResult, IStartPoint, TileCell, YLocationEnum } from './tilestypedef';
import { Polygon } from '../../geometry/brep/polygon';
import { Loop } from '../../geometry/brep/loop';
import { XY } from '../../math/xy';
import { Vector2 } from '../../math/vector2';
import { Box2 } from '../../math/box2';
import { Line2d } from '../../geometry/line2d';
import { MathUtil } from '../../util/math_util';
import { BoolOperate2d, CalculatDistance, CalculateIntersect, PositionJudge, PtLoopPositonType, LoopLoopPositonType } from '../../algorithm';
import { ErrorSystem } from '../../math/error_system';

export class TilePavingBuilder {
    public areaPaths: Polygon;
    public start: Vector2;
    public tileSize: XY;
    public tileSize1: XY;
    public gap: number;
    public rotation: number;
    public yDir!: XY;
    public type: PavingType;
    public result: TilesResult;
    public vIncrement: number;
    public hIncrement: number;
    public vIncrement1: number;
    public hIncrement1: number;
    public vDir: Vector2;
    public hDir: Vector2;
    public boundary: Box2;
    public stairOffset: number;
    public cellLessThan: number;
    // public outerIndex: number;

    /**
     * Creates an instance of TilePavingBuilder.
     * @param {Polygon} areaPaths 铺砖的多边形区域
     * @param {PointLike} start 起铺点
     * @param {PointLike} tileSize 砖的尺寸
     * @param {number} [gap=0] 砖缝宽度
     * @param {number} [rotation=0] 旋转角度
     * @param {number} [stairOffset=0] 每一层梯度偏移
     * @param {PavingType} [type=PavingType.ContinuePav] 铺贴方式`连续铺贴`,`工字铺`,`旋转铺`,`风车铺-大小铺`
     * @memberof TilePavingBuilder
     */
    constructor(areaPaths: XY[][], startPt: IStartPoint, tileSizes: XY[], gap = 0, rotation = 0,
                type = PavingType.ContinuePav , stairOffset = 0, cellLessThan = 1 / 3) {
        this.areaPaths = new Polygon(areaPaths);
        this.boundary = this.areaPaths.getBoundingBox();
        this.areaPaths = new Polygon(areaPaths);
        this.tileSize = tileSizes[0];
        this.tileSize1 = {x : 0, y : 0};

        if (PavingType.WindmilPav === type && tileSizes.length > 1) {
            this.tileSize1 = tileSizes[1];
        }

        this.gap = gap;
        this.rotation = rotation;
        this.type = type;

        this.hIncrement = this.tileSize.x + this.gap;
        this.vIncrement = this.tileSize.y + this.gap;

        this.hIncrement1 = this.tileSize1.x + this.gap;
        this.vIncrement1 = this.tileSize1.y + this.gap;
        // this.outerIndex = this._getOuterIndexNumber(this.areaPaths);
        this.vDir = this.getVerticalDirection(-this.rotation);
        this.hDir = this.getHorizontalDirection(-this.rotation);

        this.start = this._getStartPoint(startPt);

        this.result = {
            cells: [],
            start: this.start
        };

        this.stairOffset  = stairOffset;
        this.cellLessThan = cellLessThan;
    }

    private _getStartPoint(startPoint: IStartPoint): Vector2 {
        const tileSize = this.tileSize;
        const gap = this.gap;
        const rotation = this.rotation;
        if (startPoint) {
            let start = {x: 0, y: 0};
            // base on left top equals(0.0)
            const t = -Math.PI * rotation / 180 || 0;
            const sin = Math.sin(t);
            const cos = Math.cos(t);
            const axisAngle = Math.round(startPoint.axisAngle);

            if (startPoint.type === 0) {
                // "L" type
                switch (axisAngle) {
                    case 0:
                        start = {
                            x: startPoint.x - tileSize.y * sin,
                            y: startPoint.y - tileSize.y * cos
                        };
                        break;
                    case 90:
                        start = {
                            x: startPoint.x - tileSize.y * sin - tileSize.x * cos,
                            y: startPoint.y - tileSize.y * cos + tileSize.x * sin
                        };
                        break;
                    case 180:
                        start = {
                            x: startPoint.x - tileSize.x * cos,
                            y: startPoint.y + tileSize.x * sin
                        };
                        break;
                    case -90:
                        start = {x: startPoint.x, y: startPoint.y};
                        break;
                    default:
                        break;
                }
            }

            if (startPoint.alignType === 1) {
                // align brick
                // always in the center
                if (startPoint.type === 1 || startPoint.type === 3) {
                    // "-"Type  /  "+" type
                    start = {
                        x: startPoint.x - tileSize.y / 2 * sin - tileSize.x / 2 * cos,
                        y: startPoint.y - tileSize.y / 2 * cos + tileSize.x / 2 * sin
                    };
                } else if (startPoint.type === 2) {
                    // 2-- "T" type
                    switch (axisAngle) {
                        case 0:
                            start = {
                                x: startPoint.x - tileSize.y * sin - tileSize.x / 2 * cos,
                                y: startPoint.y - tileSize.y * cos + tileSize.x / 2 * sin
                            };
                            break;
                        case 90:
                            start = {
                                x: startPoint.x - tileSize.y / 2 * sin - tileSize.x * cos,
                                y: startPoint.y - tileSize.y / 2 * cos + tileSize.x * sin
                            };
                            break;
                        case 180:
                            start = {
                                x: startPoint.x - tileSize.x / 2 * cos,
                                y: startPoint.y + tileSize.x / 2 * sin
                            };
                            break;
                        case -90:
                            start = {
                                x: startPoint.x - tileSize.y / 2 * sin,
                                y: startPoint.y - tileSize.y / 2 * cos
                            };
                            break;
                        default:
                            break;
                    }
                }
            } else {
                // align brick suture
                if (startPoint.type === 1 || startPoint.alignType === 2) {
                    // "-"Type
                    switch (axisAngle) {
                        case 0:
                            start = {
                                x: startPoint.x - tileSize.y / 2 * sin - (tileSize.x + gap / 2) * cos,
                                y: startPoint.y - tileSize.y / 2 * cos + (tileSize.x + gap / 2) * sin
                            };
                            break;
                        case 90:
                            start = {
                                x: startPoint.x - (tileSize.y + gap / 2) * sin - tileSize.x / 2 * cos,
                                y: startPoint.y - (tileSize.y + gap / 2) * cos + tileSize.x / 2 * sin
                            };
                            break;
                        default:
                            break;
                    }
                } else if (startPoint.type === 2) {
                    // 2-- "T" type
                    switch (axisAngle) {
                        case 0:
                            start = {
                                x: startPoint.x - tileSize.y * sin + gap / 2 * cos,
                                y: startPoint.y - tileSize.y * cos - gap / 2 * sin
                            };
                            break;
                        case 90:
                            start = {
                                x: startPoint.x - (tileSize.y + gap / 2) * sin - tileSize.x * cos,
                                y: startPoint.y - (tileSize.y + gap / 2) * cos + tileSize.x * sin
                            };
                            break;
                        case 180:
                            start = {
                                x: startPoint.x - (tileSize.x + gap / 2) * cos,
                                y: startPoint.y + (tileSize.x + gap / 2) * sin
                            };
                            break;
                        case -90:
                            start = {
                                x: startPoint.x + gap / 2 * sin,
                                y: startPoint.y + gap / 2 * cos
                            };
                            break;
                        default:
                            break;
                    }
                } else if (startPoint.type === 3) {
                    // 3-- "+" type
                    start = {
                        x: startPoint.x + gap / 2,
                        y: startPoint.y + gap / 2
                    };
                }
            }
            return new Vector2(start);
        } else {
            return this.boundary.getCenterPt().sub(this.hDir.clone().scale(this.tileSize.x / 2))
                .sub(this.vDir.clone().scale(this.tileSize.y / 2));
        }
    }

    public buildTiles(): TilesResult {

        if (!this.areaPaths || this.areaPaths.loops.length === 0) {
            return this.result;
        }
        if (!this.tileSize || !this.tileSize.x || !this.tileSize.y) {
            return this.result;
        }

        const isAcute = (this.vDir.x > 0 || (MathUtil.isNearlyZero(this.vDir.x) && this.hDir.x > 0));

        const leftTop = new Vector2(this.boundary.min.x, this.boundary.max.y);
        const leftBot = new Vector2(this.boundary.min.x, this.boundary.min.y);
        const rightTop = new Vector2(this.boundary.max.x, this.boundary.max.y);
        const rightBot = new Vector2(this.boundary.max.x, this.boundary.min.y);

        const line0 = isAcute ? Line2d.createByOriginAndDir(leftBot, this.hDir) : Line2d.createByOriginAndDir(rightBot, this.hDir);
        const line1 = isAcute ? Line2d.createByOriginAndDir(rightBot, this.vDir) : Line2d.createByOriginAndDir(rightTop, this.vDir);
        const line2 = isAcute ? Line2d.createByOriginAndDir(rightTop, this.hDir) : Line2d.createByOriginAndDir(leftTop, this.hDir);
        const line3 = isAcute ? Line2d.createByOriginAndDir(leftTop, this.vDir) : Line2d.createByOriginAndDir(leftBot, this.vDir) ;

        const start = new Vector2(this.start);

        if (PavingType.WindmilPav !== this.type) { // 平铺 、 工字铺 、 旋转铺
            // find virtual start point
            const vNumber = Math.ceil(CalculatDistance.ptToCurve(start, line0, true) / this.vIncrement);
            const topPt = start.clone().sub(this.vDir.clone().scale(this.vIncrement).scale(vNumber));

            const hNumber = Math.ceil(CalculatDistance.ptToCurve(start, line3, true) / this.hIncrement);
            const leftPt = start.clone().sub(this.hDir.clone().scale(this.hIncrement).scale(hNumber));

            const ret = CalculateIntersect.curveCurve(
                new Line2d(leftPt, leftPt.clone().add(this.vDir)).extendDouble(ErrorSystem.MODEL_MAX_LENGTH),
                new Line2d(topPt, topPt.clone().add(this.hDir)).extendDouble(ErrorSystem.MODEL_MAX_LENGTH)
            );
            if (!ret || ret.length === 0) {
                console.error('[xmath]: line line not intersect when build tiles');
                return {
                    start: this.start,
                    cells: []
                };
            }

            const virtualStartPt = ret[0].point;

            // count bricks number
            const h2Number = Math.ceil(CalculatDistance.ptToCurve(start, line1, true) / this.hIncrement);
            const v2Number = Math.ceil(CalculatDistance.ptToCurve(start, line2, true) / this.vIncrement);

            // find possible points
            const possiblePts = this.findPossiblePoints(virtualStartPt, hNumber, h2Number, vNumber, v2Number);

            const possiblePaths = possiblePts.map(possPnt => this.brickFullPathFromPoint(possPnt.point));
            if (!possiblePaths || possiblePaths.length === 0) {
                return this.result;
            }

            // filter possiblePaths
            const cellsPath: TileCell[] = [];
            let cell: TileCell;
            let currentPath: Loop;
            let currentActualPath: Polygon;
            for (let m = 0; m < possiblePaths.length; m++) {
                currentPath = possiblePaths[m];
                let trotate = this.rotation;
                if (possiblePts[m].addRotate) {
                    trotate += possiblePts[m].addRotate!;
                }
                currentActualPath = BoolOperate2d.intersect([currentPath, this.areaPaths]);
                if (currentActualPath && currentActualPath.loops.length > 0) {
                    currentActualPath = new Polygon(this.splitPathIntoMorePolygon(currentActualPath));
                    currentActualPath.merge();

                    currentActualPath.loops.forEach((cPath) => {
                        if (cPath.toPath().length > 2) {
                            const area = cPath.calcArea();
                            if (Math.abs(area) < 1e-4) {
                                return;
                            }
                            cell = this.pathToCell(cPath, currentPath, trotate, this.boundary);
                            cellsPath.push(cell);
                        }
                    });
                }
            }
            return {cells: [cellsPath], start: start};

        } else { // 大小铺 - 风车铺

            // 查找间距范围
            const nMaxHLenCell = Math.ceil((this.boundary.max.x - this.boundary.min.x) / this.hIncrement) * 2;
            const nMaxVLenCell = Math.ceil((this.boundary.max.y - this.boundary.min.y) / this.vIncrement) * 2;

            // 直接开始判断，边铺边判断在不在Boundary内部

            // 一纵一纵铺 , 铺到格子不在Boundary内部

            //  从start开始往水平h+方向走nMaxHLenCell
                // 往v+上铺nMaxVLenCell
                // 往v-下铺nMaxVLenCell
                // 判断每一个cell ->cell 1 在不在 Boundary ， this.areaPaths内
                // cellsPath mtl 0 matl 1
            //  从start开始往水平h-方向走nMaxHLenCell
                // 往v+上铺nMaxVLenCell
                // 往v-下铺nMaxVLenCell
                // 判断每一个cell ->cell 1 在不在 Boundary ， this.areaPaths内
            const cellsPath: TileCell[] = [];
            for (let i0 = -nMaxHLenCell; i0 < nMaxHLenCell; i0++) {
                for (let j0 = -nMaxVLenCell; j0 < nMaxVLenCell; j0++) {
                   const  movePtH = this.moveWindmilCellPointH(this.start, i0);
                   const  movePtH2V = this.moveWindmilCellPointV(movePtH, j0);
                   const  movePtH2V2Size1 = this.getRefWindmilSamllCellPoint(movePtH2V);
                   const possiblePath = this.brickFullPathFromPoint(movePtH2V);
                   const possiblePathSize1 = this.brickFullPathFromPoint_Size1(movePtH2V2Size1);

                   // filter possiblePaths
                   let cell: TileCell;
                   let currentPath: Loop;
                   let currentActualPath: Polygon;

                   currentPath = possiblePath;
                   // let trotate = this.rotation;
                   // if (possiblePath.addRotate) {
                   //     trotate += possiblePts[m].addRotate!;
                   // }
                   currentActualPath = BoolOperate2d.intersect([currentPath, this.areaPaths]);
                   if (currentActualPath && currentActualPath.loops.length > 0) {
                       currentActualPath = new Polygon(this.splitPathIntoMorePolygon(currentActualPath));
                       currentActualPath.merge();

                       currentActualPath.loops.forEach((cPath) => {
                           if (cPath.toPath().length > 2) {
                               const area = cPath.calcArea();
                               if (Math.abs(area) < 1e-4) {
                                   return;
                               }
                               cell = this.pathToCell(cPath, currentPath, 0, this.boundary, 0);
                               cellsPath.push(cell);
                           }
                       });
                   }

                   currentPath = possiblePathSize1;
                   // let trotate = this.rotation;
                   // if (possiblePath.addRotate) {
                   //     trotate += possiblePts[m].addRotate!;
                   // }
                   currentActualPath = BoolOperate2d.intersect([currentPath, this.areaPaths]);
                   if (currentActualPath && currentActualPath.loops.length > 0) {
                       currentActualPath = new Polygon(this.splitPathIntoMorePolygon(currentActualPath));
                       currentActualPath.merge();

                       currentActualPath.loops.forEach((cPath) => {
                           if (cPath.toPath().length > 2) {
                               const area = cPath.calcArea();
                               if (Math.abs(area) < 1e-4) {
                                   return;
                               }
                               cell = this.pathToCell(cPath, currentPath, 0, this.boundary, 1);
                               cellsPath.push(cell);
                           }
                       });
                   }

                }
            }

            return {cells: [cellsPath], start: start};

        }

    }

    public createLine(pt: Vector2, dir: Vector2) {
        const tpt = pt.clone().add(dir.clone().scale(5));
        return new Line2d(pt, tpt);
    }

    public brickFullPathFromPoint(point: Vector2) {
        const pt0 = point.clone();
        const pt1 = point.clone().add(this.hDir.clone().scale(this.tileSize.x));
        const pt2 = point.clone().add(this.hDir.clone().scale(this.tileSize.x)).add(this.vDir.clone().scale(this.tileSize.y));
        const pt3 = point.clone().add(this.vDir.clone().scale(this.tileSize.y));
        return new Loop([pt0, pt1, pt2, pt3]);
    }

    public brickFullPathFromPoint_Size1(point: Vector2) {
        const pt0 = point.clone();
        const pt1 = point.clone().add(this.hDir.clone().scale(this.tileSize1.x));
        const pt2 = point.clone().add(this.hDir.clone().scale(this.tileSize1.x)).add(this.vDir.clone().scale(this.tileSize1.y));
        const pt3 = point.clone().add(this.vDir.clone().scale(this.tileSize1.y));
        return new Loop([pt0, pt1, pt2, pt3]);
    }

    public isLessThan(cell: TileCell) {
        const path = cell.path;
        const full = cell.fullPath;
        if (!path || !full) {
            return true;
        }
        let longestH = -100;
        let longestV = -100;
        path.forEach((p1, _, array) => {
            array.forEach((p2) => {
                const dir = new Vector2(p2).sub(p1);

                const hlength = Math.abs(dir.dot(this.hDir));
                const vlength = Math.abs(dir.dot(this.vDir));

                if (hlength > longestH) { longestH = hlength; }
                if (vlength > longestV) { longestV = vlength; }
            });
        });

        if (MathUtil.isNearlyEqual(longestH, this.tileSize.x * this.cellLessThan)
            || MathUtil.isNearlyEqual(longestV, this.tileSize.y * this.cellLessThan)) {
            return false;
        }

        if (longestH < this.tileSize.x * this.cellLessThan || longestV < this.tileSize.y  * this.cellLessThan) {
            return true;
        }

        return false;
    }

    public computeYLocation(path: Loop, bound: Box2) {
        // 为了鸡嘴线区分砖在顶部还是底部
        const yLocationEnum = {
            down: 1,
            middle: 2,
            up: 3
        };
        let yLocation;
        const upY = bound.max.y;
        const downY = bound.min.y;
        let miny = 10000;
        let maxy = -10000;
        path.toPath().forEach((e) => {
            if (miny > e.y) { miny = e.y; }
            if (maxy < e.y) { maxy = e.y; }
        });
        if (MathUtil.isNearlyEqual(miny, downY) && maxy < upY) {
            // 底部砖
            yLocation = yLocationEnum.down;
        } else if (MathUtil.isNearlyEqual(maxy, upY) && miny > downY) {
            // 顶部砖
            yLocation = yLocationEnum.up;
        } else {
            // 中间砖
            yLocation = yLocationEnum.middle;
        }
        return yLocation;
    }

    public pathToCell(actual: Loop, full: Loop, totalRotation: number, boundary: Box2, forceMaterialIndex : number= -1) {
        const fullPath = full.toPath();
        const centerPt = fullPath[0].add(fullPath[2]).multi(0.5);
        const fullLoop = totalRotation ? full.clone().rotate(MathUtil.degreeToRadius(-totalRotation), centerPt) : full.clone();
        const actualLoop = totalRotation ? actual.clone().rotate(MathUtil.degreeToRadius(-totalRotation), centerPt) : actual.clone();
        const box2d = fullLoop.getBoundingBox();
        const topLeft = {x: box2d.min.x, y: box2d.max.y};
        const normalLoop = actualLoop.clone().translate(box2d.min.multi(-1));

        let materialIndex = 0;
        if (-1 === forceMaterialIndex) {
            if (totalRotation !== this.rotation) {
                materialIndex = 1;
            }
        } else {
            materialIndex = forceMaterialIndex;
        }

        const cell: TileCell = {
            path: actual.toPath(),
            fullPath: full.toPath(),
            uvPath: normalLoop.toPath(),
            noRotationPath: actualLoop.toPath(),
            noRotationFullPath: fullLoop.toPath(),
            center: centerPt,
            noRotationTopLeft: topLeft,
            start: this.start,
            rotation: totalRotation,
            invalid: false,
            yLocation: YLocationEnum.middle,
            materialIndex: materialIndex
        };

        // invalid = true 表明是一个小于1/3的砖
        if (this.isLessThan(cell)) { cell.invalid = true; }

        cell.yLocation = this.computeYLocation(actual, boundary);

        return cell;
    }

    public findPossiblePoints(virtualStartPt: Vector2, hNumber: number, h2Number: number, vNumber: number, v2Number: number) {
        const possiblePts: {point: Vector2; addRotate?: number}[] = [];
        const vBricksNumber = vNumber + v2Number;
        const hBricksNumber = hNumber + h2Number;
        if (this.type === PavingType.ITypePav) { // 工字铺
            /* tslint:disable-next-line */
            // I - type
            // because [any][vNumber] should not modify value
            // if vNumber is even, [any][0] do not need to change
            let shouldModifyValue = (vNumber % 2 !== 0);
            for (let i = 0; i <= vBricksNumber; i++) {
                for (let j = 0; j <= hBricksNumber + 2; j++) {
                    const vdirInc = this.vDir.clone().scale(this.vIncrement * i);
                    if (shouldModifyValue) {
                        possiblePts.push({point: virtualStartPt.clone().add(this.hDir.clone().scale(this.hIncrement * (j - 1 / 2)).add(vdirInc))});
                    } else {
                        possiblePts.push({point: virtualStartPt.clone().add(this.hDir.clone().scale(this.hIncrement * j).add(vdirInc))});
                    }
                }
                shouldModifyValue = !shouldModifyValue;
            }
        } else { // 平铺 旋转铺
            // default Tile-type
            for (let i = 0; i <= vBricksNumber * 2; i++) {
                const _stairOffset : number = this.stairOffset * i;
                const _stairOffsetVec = this.hDir.clone().scale(_stairOffset);
                let numOffsetBrick = 0 ;
                if (this.tileSize.x > 0) {
                    numOffsetBrick = _stairOffset / this.tileSize.x;
                }
                for (let j = 0; j <= hBricksNumber * 2 + numOffsetBrick; j++) {
                    const vdirInc = this.vDir.clone().scale(this.vIncrement * i);
                    const pnt = virtualStartPt.clone().add(this.hDir.clone().scale(this.hIncrement * j).add(vdirInc).sub(_stairOffsetVec));
                    const possbPnt: {point: Vector2; addRotate?: number} = {point: pnt};
                    if ((this.type === PavingType.RotatePav) && ((i + j) % 2) === 1) {
                        possbPnt.addRotate = 90;
                    }
                    possiblePts.push(possbPnt);
                }
            }
        }

        return possiblePts;
    }

    public splitPathIntoMorePolygon(currentActualPath: Polygon) {
        if (!currentActualPath || currentActualPath.loops.length === 0) {
            return [];
        } else if (currentActualPath.loops.length === 1) {
            // one path
            return currentActualPath.loops;
        } else if (currentActualPath.loops.length === 2) {
             // for triangle use method isPolylineInPolyLine()
            const outerPath = currentActualPath.loops[0];
            const innerPath = currentActualPath.loops[1];
            const outerPathClone = outerPath.clone();
            const innerPathClone = innerPath.clone();
            if (!outerPathClone.isAnticlockwise()) {
                outerPathClone.reverse();
            }
            if (!innerPathClone.isAnticlockwise()) {
                innerPathClone.reverse();
            }
            const positionType = PositionJudge.loopToLoop(innerPathClone, outerPathClone);
            // two paths
            if (positionType === LoopLoopPositonType.CONTAIN || positionType === LoopLoopPositonType.IN) {
                // dual rectangular shape type path .
                // split this area into two path. by outerPolygon[0] & innerCenter.
                let t: Vector2 = undefined as any;
                const path = innerPathClone.toPath();
                if (path.length === 3) {
                    t = path[0].add(path[2]).multi(0.5).add(path[1]).multi(0.5);
                } else {
                    for (let o = 0; o < path.length; o++) {
                        const tempMid = path[o].add(path[(o + 2) % path.length]).multi(0.5);
                        const posType = PositionJudge.ptToLoop(tempMid, innerPathClone);
                        if (posType === PtLoopPositonType.IN) {
                            t = tempMid;
                            break;
                        }
                    }
                }

                if (!t) {
                    console.error('cannot find a inner point in inner area');
                    return [];
                }

                const th = {x: t.x + this.hDir.x, y: t.y + this.hDir.y};
                const tv = {x: t.x + this.vDir.x, y: t.y + this.vDir.y};
                const ret: {
                    hCount: number;
                    hPoints: XY[];
                    hIndex: number[];
                    vCount: number;
                    vPoints: XY[];
                    vIndex: number[];
                } = {hCount: 0, hPoints: [], hIndex: [], vCount: 0, vPoints: [], vIndex: []};
                outerPath.toPath().forEach((point, index, array) => {
                    const nextPoint = array[(index + 1) % array.length];
                    const hCrossPoint = CalculateIntersect.curveCurve(new Line2d(t, th).extendDouble(ErrorSystem.MODEL_MAX_LENGTH), new Line2d(point, nextPoint));
                    const vCrossPoint = CalculateIntersect.curveCurve(new Line2d(t, tv).extendDouble(ErrorSystem.MODEL_MAX_LENGTH), new Line2d(point, nextPoint));
                    if (hCrossPoint && hCrossPoint.length && !hCrossPoint[0].isOverlap) {
                        ret.hCount++;
                        ret.hPoints.push(hCrossPoint[0].point);
                        ret.hIndex.push(index);
                    }
                    if (vCrossPoint && vCrossPoint.length && !vCrossPoint[0].isOverlap) {
                        ret.vCount++;
                        ret.vPoints.push(vCrossPoint[0].point);
                        ret.vIndex.push(index);
                    }
                });
                const pathBetweenTwoIndex: XY[] = [];
                const pathOther: XY[] = [];
                if (ret.hCount === 2) {
                    outerPath.toPath().forEach((point, index) => {
                        if (index === ret.hIndex[0]) {
                            pathOther.push(point);
                            pathOther.push(ret.hPoints[0]);
                            pathBetweenTwoIndex.push(ret.hPoints[0]);
                        } else if (index === ret.hIndex[1]) {
                            pathBetweenTwoIndex.push(point);
                            pathOther.push(ret.hPoints[1]);
                            pathBetweenTwoIndex.push(ret.hPoints[1]);
                        } else if (index > ret.hIndex[0] && index < ret.hIndex[1]) {
                            pathBetweenTwoIndex.push(point);
                        } else {
                            pathOther.push(point);
                        }
                    });
                } else if (ret.vCount === 2) {
                    outerPath.toPath().forEach((point, index) => {
                        if (index === ret.vIndex[0]) {
                            pathOther.push(point);
                            pathOther.push(ret.vPoints[0]);
                            pathBetweenTwoIndex.push(ret.vPoints[0]);
                        } else if (index === ret.vIndex[1]) {
                            pathBetweenTwoIndex.push(point);
                            pathOther.push(ret.vPoints[1]);
                            pathBetweenTwoIndex.push(ret.vPoints[1]);
                        } else if (index > ret.vIndex[0] && index < ret.vIndex[1]) {
                            pathBetweenTwoIndex.push(point);
                        } else {
                            pathOther.push(point);
                        }
                    });
                } else {
                    console.error('Cannot split this path');
                    return [];
                }
                return [BoolOperate2d.difference(new Loop(pathBetweenTwoIndex), [innerPath]).loops[0],
                        BoolOperate2d.difference(new Loop(pathOther), [innerPath]).loops[0]];
            }

                // return two path
            return currentActualPath.loops;
        }
            // many paths
        const temp = currentActualPath.loops.slice(0, currentActualPath.loops.length - 1);
        const diff = currentActualPath.loops[currentActualPath.loops.length - 1];
        const splitPaths = this.splitPathIntoMorePolygon(new Polygon(temp));
        let result: Loop[] = [];
        let innerDiff: boolean = false;
        splitPaths.forEach((splitPath) => {
            const diffClone = diff.clone();
            const splitPathClone = splitPath.clone();
            if (!diffClone.isAnticlockwise()) {
                diffClone.reverse();
            }
            if (!splitPathClone.isAnticlockwise()) {
                splitPathClone.reverse();
            }
            const posType = PositionJudge.loopToLoop(diffClone, splitPathClone);
            if (posType === LoopLoopPositonType.IN) {
                innerDiff = true;
                const diffPath = BoolOperate2d.difference(splitPath, [diff]);
                if (diffPath && diffPath.loops.length) {
                    result = result.concat(this.splitPathIntoMorePolygon(diffPath));
                }
            } else {
                result = result.concat([splitPath]);
            }
        });
        if (!innerDiff) {
            result.push(diff);
        }
        return result;
    }

    // make sure v direction is positive
    public getVerticalDirection(rotation: number) {
        const ret = new Vector2(0, 1);
        if (rotation) {
            ret.rotate(MathUtil.degreeToRadius(-rotation));
        }

        if (ret.y < 0 && !MathUtil.isNearlyZero(ret.y)) {
            ret.multi(-1);
        }

        if (MathUtil.isNearlyZero(ret.y) && ret.x < 0) {
            ret.copy({x: 1, y: 0});
        }
        return ret;
    }

    public getHorizontalDirection(rotation: number) {
        return this.getVerticalDirection(rotation).rotate(MathUtil.degreeToRadius(-90));
    }

    /**
     *  查找风车铺四周相邻的砖的左下角顶点
     *  纵向查找
     *  @curCellPt 当前点
     *  @tileSize1 小砖的尺寸
     *  @nCell     纵向移动的(大)砖格子的个数 - 横向移动一小砖
     */
    public  moveWindmilCellPointV(curCellPt: Vector2, nCell : number) {
        return new Vector2(curCellPt.x + nCell * this.vIncrement1 * this.hDir.clone().x, curCellPt.y + nCell * this.vIncrement * this.vDir.clone().y);
    }

    /**
     *  查找风车铺四周相邻的砖的左下角顶点
     *  横向查找
     *  @curCellPt 当前点
     *  @tileSize1 小砖的尺寸
     *  @nCell     横向移动的(大)砖格子的个数 - 纵向移动一小砖
     */
    public  moveWindmilCellPointH(curCellPt: Vector2, nCell : number) {
        return new Vector2(curCellPt.x + nCell * this.hIncrement * this.hDir.clone().x , curCellPt.y - nCell * this.vIncrement1 * this.vDir.clone().y);
    }

    /**
     * 获取相邻小砖左下角顶点起点
     */
    public getRefWindmilSamllCellPoint(curCellPt: Vector2) {
        return new Vector2(curCellPt.x - this.hIncrement1 * this.hDir.clone().x , curCellPt.y);
    }

}

