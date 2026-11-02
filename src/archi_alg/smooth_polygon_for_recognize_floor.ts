// import { DebugWarn } from '../util/debug_warn';
import { Loop } from '../geometry/brep/loop';
import { Polygon } from '../geometry/brep/polygon';
import { DebugWarn } from '../util/debug_warn';
import { Line2d } from '../geometry/line2d';
import { Vector2 } from '../math/vector2';

enum CurveAxisState {
    // 抽象类型
    parallelWithNone = 0,  // 不与任何轴平行
    parallelWithXAxis,     // 与X轴平行
    parallelWithYAxis      // 与Y轴平行
}

/**
 * 识别楼板前自动修复Polygon
 */
class SmoothPolygonForRecognizeFloor {

    // 1.去除polygon中过短的线
    // 2.polygon中的线如果与坐标轴接近平行，则调整至平行
    // 3.共线合并
    /**
     * @param inputPolygon      输入轮廓
     * @param resultPolygon     输出轮廓
     * @param noiseLength       短边的长度容差(小于该长度的边会被删除)
     * @param lengthEps         距离容差（用于判断是否与坐标轴平行、两线是否共线）
     * @returns 返回修正后的polygon
     */
    public static execute(inputPolygon: Polygon, noiseLength: number = 1e-3, lengthEps: number = 1e-4): Polygon {
        // LogUtil.d(inputPolygon, '输入的polygon：');

        const resultPolygon = new Polygon();
        if (!inputPolygon || inputPolygon.isEmpty()) {
            DebugWarn.warn(false, 'SmoothPolygonForRecognizeFloor:execute()中输入的Polygon不合法!');
            return resultPolygon;
        }
        if (!inputPolygon.isOnlyLines()) {
            DebugWarn.warn(false, 'SmoothPolygonForRecognizeFloor:execute()中输入的Polygon仅处理直线!');
            return resultPolygon;
        }


        // let curveDeleteCount = 0;
        // let curveToXYAxisCount = 0;
        // let beforeMergeColineCount = 0;
        // let afterMergeColineCount = 0;

        const originalLoops = inputPolygon.getLoops();
        for (const loop of originalLoops) {
            // todo:fixme  5e-3
            if (loop.isEmpty() || Math.abs(loop.calcArea()) < 5e-3) {
                continue;
            }

            // 去除polygon中过短的线
            const deleteNoiseCurves: Line2d[] = [];
            for (const cv of loop.getAllCurves()) {
                if (cv.getLength() < noiseLength) {
                    // curveDeleteCount++;
                    continue;
                } else {
                    deleteNoiseCurves.push(cv.clone() as Line2d);
                }
            }
            // LogUtil.d(deleteNoiseCurves, '删除短边后的边：');

            // 将与坐标轴近似平行的边，调整至平行,包含本来就与坐标轴平行的线
            // 如前后两条线均与X轴（或Y轴）平行，保证调整后两条线共线
            const alignAxisCurves: Line2d[] = [];
            let beforeCcurveAxisState: CurveAxisState = CurveAxisState.parallelWithNone;
            for (let index = 0; index < deleteNoiseCurves.length; index++) {
                if (Math.abs(deleteNoiseCurves[index].getStartPt().x - deleteNoiseCurves[index].getEndPt().x) < lengthEps) {
                    let basePt = deleteNoiseCurves[index].getStartPt();
                    if (beforeCcurveAxisState === CurveAxisState.parallelWithYAxis
                        && deleteNoiseCurves[(index - 1) % deleteNoiseCurves.length].getEndPt().distanceTo(deleteNoiseCurves[index].getStartPt()) < lengthEps) {
                        basePt = alignAxisCurves[alignAxisCurves.length - 1].getEndPt();
                    }

                    const newLine = new Line2d(basePt, new Vector2(basePt.x, deleteNoiseCurves[index].getEndPt().y));
                    beforeCcurveAxisState = CurveAxisState.parallelWithYAxis;
                    if (newLine.getLength() > noiseLength) {
                        alignAxisCurves.push(newLine);
                        // curveToXYAxisCount++;
                    }
                } else if (Math.abs(deleteNoiseCurves[index].getStartPt().y - deleteNoiseCurves[index].getEndPt().y) < lengthEps) {
                    let basePt = deleteNoiseCurves[index].getStartPt();
                    if (beforeCcurveAxisState === CurveAxisState.parallelWithXAxis
                        && deleteNoiseCurves[(index - 1) % deleteNoiseCurves.length].getEndPt().distanceTo(deleteNoiseCurves[index].getStartPt()) < lengthEps) {
                        basePt = alignAxisCurves[alignAxisCurves.length - 1].getEndPt();
                    }

                    beforeCcurveAxisState = CurveAxisState.parallelWithXAxis;
                    const newLine = new Line2d(basePt, new Vector2(deleteNoiseCurves[index].getEndPt().x, basePt.y));
                    if (newLine.getLength() > noiseLength) {
                        alignAxisCurves.push(newLine);
                        // curveToXYAxisCount++;
                    }
                } else {
                    beforeCcurveAxisState = CurveAxisState.parallelWithNone;
                    alignAxisCurves.push(deleteNoiseCurves[index].clone() as Line2d);
                }
            }
            // LogUtil.d(alignAxisCurves, '与坐标轴对其后的边：');

            if (alignAxisCurves.length < 1) {
                DebugWarn.warn(false, '环中边的数量为0 !');
                continue;
            } else {
                const tmpLoop = new Loop(alignAxisCurves);
                tmpLoop.makeStartEndConnected();
                if (!tmpLoop.isValid()) {
                    DebugWarn.assert(false, '无效的环 !');
                    continue;
                }

                // 共线合并
                const newLoopLines = tmpLoop.getAllCurves().map((cv) => {
                    return cv as Line2d;
                });

                // beforeMergeColineCount = newLoopLines.length;

                const newLoopCurves = this.mergeColinearAndConnectedCurve(newLoopLines, lengthEps);

                // afterMergeColineCount = newLoopCurves.length;
                // LogUtil.d(newLoopCurves, '共线处理后的边：');

                const newLoop = new Loop(newLoopCurves);
                newLoop.makeStartEndConnected();
                // LogUtil.d(newLoopCurves, '共线处理后的边：');

                if (!newLoop.isValid()) {
                    DebugWarn.assert(false, '无效的环 !');
                    continue;
                }
                resultPolygon.addLoop(newLoop);
            }
        }

        if (!resultPolygon.isValid()) {
            DebugWarn.assert(false, 'Smooth 后，Polygon不合法 !');
        }

        // LogUtil.d(resultPolygon, 'SmoothPolygon结果：');
        // console.log('删除短边的数量 = : ' + curveDeleteCount);
        // console.log('调整至坐标轴边的数量 = : ' + curveToXYAxisCount);
        // console.log('共线合并边的数量 = : ' + (beforeMergeColineCount - afterMergeColineCount));

        return resultPolygon;
    }

    private static mergeColinearAndConnectedCurve(inputLine2ds: Line2d[], lengthEps: number) {
        const resultLines: Line2d[] = [inputLine2ds[0]];
        for (let index = 1; index < inputLine2ds.length; index++) {
            if (inputLine2ds[index].isColinearWith(resultLines[resultLines.length - 1], lengthEps)) {
                const newLine = new Line2d(resultLines[resultLines.length - 1].getStartPt(), inputLine2ds[index].getEndPt());
                resultLines.splice(resultLines.length - 1, 1, newLine);
            } else {
                resultLines.push(inputLine2ds[index]);
            }
        }

        // 处理收尾共线
        if (resultLines[0].isColinearWith(resultLines[resultLines.length - 1], lengthEps)) {
            resultLines[0] = new Line2d(resultLines[resultLines.length - 1].getStartPt(), resultLines[0].getEndPt());
            resultLines.pop();
        }

        return resultLines;
    }
}

export { SmoothPolygonForRecognizeFloor };

