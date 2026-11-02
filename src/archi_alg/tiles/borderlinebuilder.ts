
import { TilesResult, TileCell } from './tilestypedef';
import { Polygon } from '../../geometry/brep/polygon';
import { Loop } from '../../geometry/brep/loop';
import { XY } from '../../math/xy';
import { Vector2 } from '../../math/vector2';
import { Matrix3 } from '../../math/matrix3';
import { Line2d } from '../../geometry/line2d';
import { MathUtil } from '../../util/math_util';
import { CalculatDistance } from '../../algorithm/calculate_distance';
import { BoolOperate2d } from '../../algorithm/bool_operate_2d';

/**
 * 波打线铺砖算法，包含双层（双砖波打线）和单层（单砖波打线）
 * 
 * @export
 * @class BorderLineBuilder
 */
export class BorderLineBuilder {
    public areaPaths: Polygon;
    public tileSizes: XY[];
    public gap: number;
    public innerLoop!: Loop;
    public outerLoop!: Loop;
    public sortedOuterPath: Vector2[] = [];
    public sortedInnerPath: Vector2[] = [];
    public sortedPaths: Vector2[][] = [];
    public isValid = true;

    public result: TilesResult = { cells: [[]], start: { x: 0, y: 0 } };

    private materialIndexes: number[];

    /**
     * Creates an instance of BorderLineBuilder.
     * @param {Polyline[]} areaPaths 波打线铺贴区域，如果是双层波打线，则是最内和最外的两条Polyline
     * @param {PointLike} tileSize 波打线瓷砖的尺寸，如果是双层，则对应外层的尺寸
     * @param {number} [gap=0] 砖缝宽度
     * @param {number} [innerDistance] 双层波打线内层的厚度，不能超出波打线的总宽度
     * @param {PointLike} [innerTileSize] 内存波打线的瓷砖尺寸
     * @memberof BorderLineBuilder
     */
    constructor(
        areaPaths: XY[][],
        gap: number = 0,
        tileSizes: XY[]
    ) {
        this.areaPaths = new Polygon(areaPaths);
        if (this.areaPaths.calcArea() < 0) {
            this.areaPaths.reverse();
        }
        this.tileSizes = tileSizes;
        this.gap = gap;

        this.materialIndexes = Array.from({length: tileSizes.length}).map((_, i) => i);

        // filter invalid tileSize
        while (tileSizes.length) {
            const index = tileSizes.findIndex(_ => !_ || !_.x || MathUtil.isNearlyZero(_.x) || !_.y || MathUtil.isNearlyZero(_.y));
            if (index >= 0) {
                tileSizes.splice(index, 1);
                this.materialIndexes.splice(index, 1);
            } else {
                break;
            }
        }

        if (!tileSizes.length) {
            this.isValid = false;
            return;
        }

        const distances = tileSizes.map(_ => _.y);

        if (this.areaPaths.loops.length === 2) {
            this.outerLoop = this.areaPaths.loops[0].clone();
            this.innerLoop = this.areaPaths.loops[1].clone();
            this.outerLoop.merge();
            this.innerLoop.merge();
            this.sortedOuterPath = this._getSortedPath(this.outerLoop);
            this.sortedInnerPath = this._getSortedPath(this.innerLoop);
            if (this.sortedOuterPath.length !== this.sortedInnerPath.length) {
                this.isValid = false;
                return;
            }

            if (!distances.find(_ => _ === undefined || _ <= 0)) {
                const distance = CalculatDistance.ptToCurve(this.sortedInnerPath[0], new Line2d(this.sortedOuterPath[0], this.sortedOuterPath[1]), true);
                if (MathUtil.isNearlyEqual(MathUtil.sum(distances), distance, 2e-4) || this.tileSizes.length === 1) {
                    if (distances.length > 1) {
                        for (let i = 0; i < distances.length - 1; i++) {
                            const loop = this.outerLoop.clone();
                            loop.offset(MathUtil.sum(distances.slice(0, i + 1)) * -1);
                            const paths = this._getSortedPath(loop);
                            if (paths.length > 2) {
                                this.sortedPaths.push(paths);
                            }
                        }
                    }
                    this.sortedPaths.splice(0, 0, this.sortedOuterPath.map(pt => pt.clone()));
                    this.sortedPaths.push(this.sortedInnerPath.map(pt => pt.clone()));
                } else {
                    this.isValid = false;
                }
            }
        }
    }

    public _generateCellFromPath(full: Loop, actual: Loop, materialIndex = 0) {
        const fullPath = full.toPath();
        const vecx = fullPath[1].clone().sub(fullPath[0]).normalize();
        const vecy = fullPath[3].clone().sub(fullPath[0]).normalize();
        const rotation = Math.atan2(vecx.y, vecx.x);

        const localMatrix = new Matrix3().copy(
            [
                [vecx.x, vecy.x, fullPath[0].x],
                [vecx.y, vecy.y, fullPath[0].y],
                [0, 0, 1]
            ]
        ).makeInverse();

        const center = fullPath[0].clone().add(fullPath[2]).multi(0.5);

        const rmatrix = new Matrix3();
        rmatrix.applyRotate(center, -rotation);

        const fpath = full.clone().applyTransform(rmatrix);
        const box = fpath.getBoundingBox();

        const topLeft = {x: box.min.x, y: box.max.y};

        const cell: TileCell = {
            path: actual.toPath().map(pt => pt.toXY()),
            fullPath: full.toPath().map(pt => pt.toXY()),
            rotation: MathUtil.radiusToDegree(rotation),
            center: center.toXY(),
            start: center.toXY(),
            invalid: false,
            uvPath: actual.toPath().map(pt => pt.applyTransform(localMatrix!)),
            noRotationFullPath: fpath.toPath().map(pt => pt.toXY()),
            noRotationPath: actual.clone().applyTransform(rmatrix).toPath().map(pt => pt.toXY()),
            noRotationTopLeft: topLeft,
            materialIndex: materialIndex
        };

        return cell;
    }

    /**
     * 计算铺贴的最终结果，如果失败，结果中不包含cell
     *
     * @returns {TilesResult} 铺贴的结果，与TilePavingBuilder兼容
     * @memberof BorderLineBuilder
     */
    public buildBorderLineTiles() {
        if (this.areaPaths.loops.length !== 2 || !this.isValid) {
            return this.result;
        }

        if (this.sortedInnerPath.length !== this.sortedOuterPath.length) {
            return this.result;
        }


        const tileLength = Math.min(...this.tileSizes.map(xy => xy.x)) + this.gap;

        const tileWidths = this.tileSizes.map(_ => _.y + this.gap);

        const paths = this.sortedPaths.map(path => path.map(pt => pt.clone()));

        const cellPaths: { full: Loop; actual: Loop; materialIndex: number }[] = [];

        const outerPath0 = paths[0];

        for (let i = 0; i < paths.length - 1; i++) {
            const outerPath = paths[i];
            const innerPath = paths[i + 1];
            for (let j = 0; j < outerPath.length - 1; j++) {
                const p0 = outerPath[j];
                const p1 = outerPath[j + 1];
                const outerLine = new Line2d(p0, p1);

                const p0p = innerPath[j];
                const p1p = innerPath[j + 1];

                const p0pInter = new Vector2();
                const p1pInter = new Vector2();
                // 计算内部轮廓两端点垂足点
                const totolWidth = CalculatDistance.ptToCurve(p0p, outerLine, true, p0pInter);
                CalculatDistance.ptToCurve(p1p, outerLine, true, p1pInter);
                const yNum = Math.ceil(totolWidth / (tileWidths[i] + 0.0001));
                let xNum = Math.ceil(new Line2d(p0, p1).getLength() / tileLength);
                // 奇偶和最外圈对齐
                {
                    const p0outerPath0 = outerPath0[j];
                    const p1outerPath0 = outerPath0[j + 1];
                    const xNumouterPath0 = Math.ceil(new Line2d(p0outerPath0, p1outerPath0).getLength() / tileLength);
                    if (xNum % 2 !== xNumouterPath0 % 2) {
                        xNum += 1;
                    }
                }

                const centerPt = p0pInter.clone().add(p1pInter).multi(0.5);
                const normVec = p1pInter.clone().sub(p0pInter).normalize();

                const tileWidthVec = p0p.clone().sub(p0pInter).normalize().scale(tileWidths[i]);
                // 起铺点
                const startPt = centerPt.clone().add(normVec.clone().scale(-tileLength * xNum / 2));
                const areaPath = [outerPath[j].clone(), outerPath[j + 1].clone(), innerPath[j + 1].clone(), innerPath[j].clone()];
                const transVec = normVec.clone().scale(tileLength);
                for (let k = 0; k < xNum; k ++) {
                    const tileStart = new Vector2();
                    const tileNxt = new Vector2();
                    CalculatDistance.ptToCurve(
                        transVec.clone().scale(k).add(startPt),
                        outerLine,
                        true,
                        tileStart
                    );
                    CalculatDistance.ptToCurve(
                        transVec.clone().scale(k + 1).add(startPt),
                        outerLine,
                        true,
                        tileNxt
                    );

                    const fullCellPath: XY[][] = [];
                    for (let g = 0; g < yNum; g++) {
                        fullCellPath.push([
                            tileStart.clone().add(tileWidthVec.clone().scale(g)).toXY(),
                            tileNxt.clone().add(tileWidthVec.clone().scale(g)).toXY(),
                            tileNxt.clone().add(tileWidthVec.clone().scale(g + 1)).toXY(),
                            tileStart.clone().add(tileWidthVec.clone().scale(g + 1)).toXY()
                        ]);
                    }
                    fullCellPath.forEach((path) => {
                        const loop = new Loop(path);
                        const actual = BoolOperate2d.intersect([loop, new Loop(areaPath)]);
                        if (actual.loops.length === 1) {
                            if (this.gap > 0) {
                                const offsetLoop = loop.clone();
                                if (!(offsetLoop.offset(this.gap / 2 * -1) && actual.loops[0].offset(this.gap / 2 * -1))) {
                                    return;
                                }
                            }
                            cellPaths.push({ full: loop, actual: actual.loops[0], materialIndex: i });
                        }
                    });
                }
            }
        }
        this.result.cells = [
            cellPaths.map((_) => {
                return this._generateCellFromPath(_.full, _.actual, this.materialIndexes[_.materialIndex]);
            })
        ];

        return this.result;
    }

    private _getSortedPath(loop: Loop) {
        const path = loop.toPath();
        const box2d = loop.getBoundingBox();
        const clockWise = loop.calcArea() < 0;
        if (!clockWise) {
            path.reverse();
        }
        const index = path.findIndex(p => p.equals({x: box2d.min.x, y: box2d.max.y}, 1e-6));
        return [...path.slice(index), ...path.slice(0, index + 1)];
    }
}

