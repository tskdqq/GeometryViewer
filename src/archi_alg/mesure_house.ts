import { Line1ProjectToLine2 } from '../algorithm/project/line_line_project';
import { SearchGraph } from '../algorithm/search_graph';
import { Coedge } from '../geometry/brep/coedge';
import { Loop } from '../geometry/brep/loop';
import { Curve2d } from '../geometry/curve2d';
import { Line2d } from '../geometry/line2d';
import { MathUtil } from '../util/math_util';
import { ExtendEveryLine } from './mesure_house_dir/extend_every_line';
import { WallStruct } from './wall_struct';
import { ErrorSystem } from '../math/error_system';
import { DebugWarn } from '../util/debug_warn';
import { PtToLineSignedDistance } from '../algorithm/distance/pt_to_line_signed_distance';
import { IntervalWidth } from './mesure_house_dir/i_interval_width';
import { GeometryType } from '../geometry/geometry_type';

/**
 *  类似'量房'的功能,输入loop的数组，返回每个房间的墙中线
 */
export class MeasureHouse {

    /**
     * 量房的功能
     * @param inputLoops  用来量房的所有的环
     * @param defaultWallWidth 墙的默认厚度
     * @param maxWallWidth  墙的最大厚度
     * @param angleTorlerance 用来判断平行或垂直的角度容差
     */
    public static execute(
        inputLoops: Loop[],
        defaultWallWidth: number,
        maxWallWidth: number,
        angleTorlerance: number): Loop[] {

        if (inputLoops.length < 1) {
            return [];
        }

        const allLoops = inputLoops.map(l => {
            const cl = l.clone();
            // 保证都是逆时针环
            if (!cl.isAnticlockwise()) {
                cl.reverse();
            }
            return cl;
        });
        return new MeasureHouse(allLoops, defaultWallWidth, maxWallWidth, angleTorlerance)._excute();
    }

    private constructor(
        private readonly allLoops: Loop[],
        private readonly defaultWallWidth: number,
        private readonly maxWallWidth: number,
        private readonly angleTorlerance: number) {

    }

    private _excute(): Loop[] {

        let maxOutterLoop: Loop | undefined;
        let innerLoops = this.allLoops;

        // 1.找到最大的环，外边界
        if (this.allLoops.length > 1) {
            const tree = SearchGraph.loopsToTree(this.allLoops);

            if (tree.children.length !== this.allLoops.length) {
                if (tree.children.length !== 1
                    || tree.children[0].children.length !== this.allLoops.length - 1) {
                    console.error('有包含关系时，只能有一个最大环');
                    return [];
                }
                maxOutterLoop = tree.children[0].data;
                if (maxOutterLoop) {
                    // logUtil.d(maxOutterLoop, '最大外环');
                }
                innerLoops = this.allLoops.filter(l => {
                    if (l === maxOutterLoop) {
                        return false;
                    }
                    return true;
                });
            }
        }
        // console.time('延长');
        const map = ExtendEveryLine.execute(maxOutterLoop, innerLoops, this.maxWallWidth, this.angleTorlerance);
        // console.timeEnd('延长');
        // for (const [, l2] of map) {
        //     .GeoDocument.getInstance().add(l2);
        // }
        // console.time('计算中线');
        const result: Loop[] = [];
        // 这样写方便调试
        const idx = -1;
        if (idx < 0) {
            for (const l of innerLoops) {
                const loop = this._computeARoom(false, l, this.allLoops, map);
                // console.log(loop);
                result.push(loop);
            }
            // 外线的中线
            if (maxOutterLoop) {
                const l = this._computeARoom(true, maxOutterLoop, this.allLoops, map);
                // console.log('外线\n', l.asString());
                result.push(l);
            }
        } else {
            const loop = this._computeARoom(false, this.allLoops[idx], this.allLoops, map);
            console.log(loop);
            result.push(loop);
        }

        // console.timeEnd('计算中线');
        return result;
    }

    // 计算一个房间的墙中线
    private _computeARoom(isMaxOutLoop: boolean, pRroom: Loop, allLoops: Loop[], extendMap: Map<Line2d, Line2d>): Loop {
        const room = pRroom.clone();

        // 一个coedge被拆成多个wallstruct
        const map = new Map<string, IntervalWidth[]>();
        // 找中线
        const coedges = room.getCoedges();
        const result = new Loop();

        const showSplit = false;

        const otherLoops = allLoops.filter(l => {
            return l !== pRroom;
        });

        for (const ce of coedges) {
            //  将room的边线在关键点处打断,打断信息放在map中
            this._splitCoedge(isMaxOutLoop, ce, otherLoops, map, extendMap, showSplit);

            const infos = map.get(ce.tag);
            if (!infos || infos.length < 1) {
                ce.curve.offset(this.defaultWallWidth / 2);
                result.addCurve(ce.curve);
            } else {
                const walls = this.infosToLine2ds(infos, ce.curve, this.defaultWallWidth);
                walls.forEach((w) => {
                    w.wallLine.offset(w.width / 2);
                    result.addCurve(w.wallLine);
                });
            }
        }

        // 闭合
        if (!showSplit) {
            result.makeStartEndConnected();
        }

        return result;
    }

    /**
     * 将loop在关键点出打断,将coedge的打断信息绑定到coedge对应的curve上
     */
    private _splitCoedge(
        isMaxOutLoop: boolean,
        thisCE: Coedge,
        otherLoops: Loop[],
        map: Map<string, IntervalWidth[]>,
        extendMap: Map<Line2d, Line2d>,
        showSplitInfo: boolean = false) {

        DebugWarn.assert(thisCE.curve.getType() === GeometryType.enLine2D, '只支持直线');

        const thisLine = thisCE.curve as Line2d;
        const thisRange = thisLine.getRange();

        // 1.初步筛选
        const candidateCurves: Line2d[] = [];
        for (const loop of otherLoops) {

            const coedges = loop.getCoedges();
            let longestCurve: Line2d | undefined;

            for (const ce of coedges) {
                const thatLine = ce.curve as Line2d;
                // 只投影平行的线
                if (!thatLine.isParalellTo(thisLine, this.angleTorlerance)) {
                    continue;
                }

                // 只投外侧的线
                const width = PtToLineSignedDistance.ptToLine2d(thatLine.getOrigin(), thisLine);
                const check = isMaxOutLoop ? width < 0 : width > 0;
                if (!check) {
                    continue;
                }
                // 只投距离较小的线
                if (Math.abs(width) > this.maxWallWidth) {
                    continue;
                }

                const range = Line1ProjectToLine2.execute(thatLine, thisLine);
                const commonRange = range.intersect(thisRange)!;
                if (!commonRange) {
                    continue;
                }
                // GeoDocument.getInstance().add(line);
                if (commonRange.getLength() < ErrorSystem.LENGTH_EPS) {
                    continue;
                }

                if (!longestCurve || longestCurve.userData.width > Math.abs(width)) {
                    longestCurve = thatLine;
                    longestCurve.setUserData('width', Math.abs(width));
                }
            }
            if (longestCurve) {
                candidateCurves.push(longestCurve);
            }
        }

        // 2.标记打断点
        for (const l of candidateCurves) {

            let candidate;

            const offsetedLine = extendMap.get(l);
            if (offsetedLine) {
                candidate = offsetedLine.clone();
            } else {
                candidate = l.clone() as Line2d;
            }

            // 只投外侧的线
            const width = PtToLineSignedDistance.ptToLine2d(candidate.getOrigin(), thisLine);
            const check = isMaxOutLoop ? width < 0 : width > 0;
            if (!check) {
                continue;
            }
            // 只投距离较小的线
            if (Math.abs(width) > this.maxWallWidth) {
                continue;
            }

            const range = Line1ProjectToLine2.execute(candidate, thisLine);
            const commonRange = range.intersect(thisRange)!;
            if (!commonRange) {
                continue;
            }
            // GeoDocument.getInstance().add(line);
            if (commonRange.getLength() < ErrorSystem.LENGTH_EPS) {
                continue;
            }
            let value = map.get(thisCE.tag);
            if (!value) {
                value = [];
                map.set(thisCE.tag, value);
            }

            value.push({
                commonRange, width
            });
        }

        // 3.去重
        const arr = map.get(thisCE.tag);
        if (!arr || !arr.length) {
            return;
        }

        for (let i = 0; i < arr.length; i++) {
            for (let j = i + 1; j < arr.length; j++) {
                if (!arr[i].commonRange.intersect(arr[j].commonRange)) {
                    continue;
                }
                const range = arr[i].commonRange.intersect(arr[j].commonRange)!;
                if (range.getLength() < this.defaultWallWidth) {
                    continue;
                }
                if (arr[i].width > arr[j].width) {
                    arr[i] = arr[j];
                }
                arr.splice(j, 1);
                j--;
            }
        }

        // 显示打断信息
        if (showSplitInfo) {
            for (const r of arr) {
                const temp = thisCE.curve.clone();
                temp.setRange(r.commonRange.min, r.commonRange.max);
                temp.offset(r.width / 2);
                // GeoDocument.getInstance().add(temp);
            }
        }
    }

    public infosToLine2ds(infos: IntervalWidth[], curve: Curve2d, wallWidth: number): WallStruct[] {

        if (!infos || infos.length < 1) {
            return [];
        }

        if (infos.length === 1) {
            const wallLine = curve.clone() as Line2d;
            const width = infos[0].width;
            return [{
                wallLine, width
            }];
        }

        let ranges = [curve.getRange()];

        for (const info of infos) {
            const surplus = [];
            for (const thisRange of ranges) {
                const subs = thisRange.sub(info.commonRange);
                surplus.push(...subs);
            }
            ranges = surplus;
        }

        const result: WallStruct[] = [];

        // 添加围成的墙
        for (const r of infos) {
            const wallLine = curve.clone() as Line2d;
            wallLine.setRange(r.commonRange.min, r.commonRange.max);
            result.push({
                wallLine,
                width: r.width
            });
        }

        result.sort((w1, w2) => {
            return w1.wallLine.getRange().min - w2.wallLine.getRange().min;
        });

        // // // 厚薄墙
        for (let i = 0; i < result.length - 1; i++) {
            const wall = result[i];
            const next = result[i + 1];

            const sub = next.wallLine.getRange().min - wall.wallLine.getRange().max;
            if (MathUtil.isNearlyZero(sub)) { continue; }

            wall.wallLine.extend(sub / 2);
            next.wallLine.extend(sub / 2, false);
        }

        return result;
    }
}

