import * as ClipperLib from '../lib/clipperlib/clipperlib';
import { Vector3 } from '../math/vector3';
import { MainWindow } from '../ui/MainWindow';
import { ActionBase } from './actionbase';
import { Command } from './command';
import { CommandString } from './command_string';
import { PickupManager } from '../ui/pick_up_manager';
import { GeoDocument } from '../ui/geo_document';
import { Loop } from '../geometry/brep/loop';
import { ClipperFormatConverter } from '../util/clipper_format_converter';

/**
 * 画线Action
 */
class PtLoopPositonJudgeAction extends ActionBase {

    private oldPt: Vector3 | undefined;

    public initAction() {
        this.oldPt = undefined;
    }

    public onLButtonDown(view: MainWindow, pos: Vector3): boolean {
        const p = PickupManager.getInstance().getPickedPoints(pos, this.oldPt)[0];
        const loop = GeoDocument.getInstance().getAll(Loop)[0];
        const path = ClipperFormatConverter.loopToPath(loop);
        const result = ClipperLib.Clipper.PointInPolygon({ X: p.x, Y: p.y }, path);
        console.log(result);

        return true;
    }

    public onMouseMove(view: any, pos: Vector3): boolean {
        const p = PickupManager.getInstance().getPickedPoints(pos, this.oldPt)[0];
        if (this.oldPt) {
            this.clearTmp();
            this.drawTmpLine(this.oldPt, p);
        }
        return true;
    }

    public onRButtonDown(view: any, pos: Vector3): boolean {
        this.makeFinished();
        return true;
    }

    public onFinish() {
        return;
    }
}


class PtLoopPositonJudgeCmd extends Command {

    constructor() {
        super(CommandString.PT_LOOP_PJ);
    }

    public execute(): ActionBase | undefined {
        return new PtLoopPositonJudgeAction(GeoDocument.getInstance());
    }
}


export { PtLoopPositonJudgeCmd, PtLoopPositonJudgeAction };
