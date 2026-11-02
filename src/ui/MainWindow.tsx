import './MainWindow.css';

/* tslint:disable:no-void-expression */
/* tslint:disable:no-null-keyword */
import * as React from 'react';

import { ActionManager } from '../action/actionmanager';
import { ExtrudeShellCommand } from '../action/extrude_commond.1';
import { AlignCommand } from '../action/align_command';
import { ConvexHullCommand } from '../action/convex_hull_commond';
import { DefaultCommand } from '../action/default_action';
import { DeleteCommand } from '../action/delete_command';
import { DrawLineCommand } from '../action/draw_line_action';
import { DrawRectCommand } from '../action/draw_rect_action';
import { ExtrudeCommand } from '../action/extrude_commond';
import { LoopCommand } from '../action/loop_command';
import { MesureDistanceCommand } from '../action/mesure_distance_action';
import { MouseHouseCommand } from '../action/mesure_house_cmd';
import { EnMouseEventType } from '../action/mouse_event_type';
import { MoveCommand } from '../action/move_action';
import { OffsetCommand } from '../action/offset_commond';
import { ParalellCommand } from '../action/paralell_command';
import { PtLoopPositonJudgeCmd } from '../action/pt_to_loop_pj';
import { ReverseCommand } from '../action/reverse_commond';
import { SaveCommand } from '../action/save_cmd';
import { ScaleCommand } from '../action/scale_command';
import { UndoRedoCommand } from '../action/undo_redo_command';
import { GeoDocChangedObserver, GeoDocEventHandler } from '../event_handler/geo_changed_handler';
import { KeyBoardEventHandler } from '../event_handler/key_board_event_handler';
import {
    SelectionChangedHandler, SelectionChangedObserver
} from '../event_handler/selection_changed_handler';
import { Geomtry } from '../geometry/geometry';
import { ReflectUtil } from '../geometry/reflect_util';
import { Vector2 } from '../math/vector2';
import { Vector3 } from '../math/vector3';
import { RenderMgr } from '../threejs/RenderMgr';
import { GeoDocument, GeomtryOrVector } from './geo_document';
import LeftPanel from './LeftPanel';
import TopMenu from './TopMenu';
import { DrawArcCommand } from '../action/draw_arc_action';

import * as xmath from '../xmath';
import { RenderObject } from '../algorithm/discrete/render_object';
import { BoolIntersectCommand } from '../action/bool_intersect_commond';
import { BoolSubtractCommand } from '../action/bool_subtract_commond';
import { BoolUnionCommand } from '../action/bool_union_commond';
import { MirrorCommand } from '../action/mirror_cmd';

// interface Props {
// }

interface State {
    // 提示信息
    info: string;
}

class MainWindow extends React.Component<{}, State> implements GeoDocChangedObserver, SelectionChangedObserver {
    public state: State = {
        info: ''
    };

    private canvasDom: any;
    private topMenu?: TopMenu;
    private leftPanel: LeftPanel | null = null;

    private dragOriginPos: Vector2 | undefined;

    public onCtrlV(e: any) {
        if (!e.clipboardData || !e.clipboardData.getData('Text')) { console.error('粘贴板错误'); }
        // 获取剪切板内容
        const txt: string = e.clipboardData.getData('Text');

        this._onCtrlV(txt);
    }

    public _onCtrlV(txt: string) {
        const geos = ReflectUtil.reflect(txt);

        for (const geo of geos) {
            if (geo instanceof Vector2 || geo instanceof Vector3) {
                GeoDocument.getInstance().add(geo);
            } else {
                GeoDocument.getInstance().add(geo);
            }
        }
    }

    public onGeoAdded(geos: GeomtryOrVector[]) {
        for (const g of geos) {
            this.showInView(g);
        }
    }

    public onGeoUpdate(geos: Geomtry[]) {
        for (const geo of geos) {
            RenderMgr.getInstance().replace(geo.toRenderObject(true));
        }
        if (this.leftPanel) {
            this.leftPanel.setData(GeoDocument.getInstance().getAllData().map((g) => {
                if (g instanceof xmath.Geomtry) {
                    return g.toRenderObject(true);
                }
                return undefined;
            }));
        }
    }

    public onGeoClear() {
        RenderMgr.getInstance().clearAllGeometries();
        RenderMgr.getInstance().clearHighLight();
        if (this.leftPanel) {
            this.leftPanel.setData([]);
        }
    }

    public onGeoDeleted(geos: Geomtry[]) {
        // 
        if (this.leftPanel) {
            this.leftPanel.setData(GeoDocument.getInstance().getAllData().map((g) => {
                if (g instanceof xmath.Geomtry) {
                    return g.toRenderObject(true);
                }
                return undefined;
            }));
        }

        geos.forEach((g) => {
            RenderMgr.getInstance().deleteRenderObjById((g as any).refId);
        });
    }

    // 选择集变化的事件
    public onSelectAdded(geoIds: number[]) {
        RenderMgr.getInstance().highLightById(...geoIds);
    }

    public onSelectDeleted(geoIds: number[]) {
        this.onSelectClear();
    }

    public onSelectClear() {
        RenderMgr.getInstance().clearHighLight();
    }

    // 离散并显示数据
    public showInView(geo: GeomtryOrVector) {
        let renderObject: RenderObject;
        if (geo instanceof Vector2 || geo instanceof Vector3) {
            renderObject = geo.discrete();
        } else {
            renderObject = geo.toRenderObject(true);
        }

        if (this.leftPanel) {
            this.leftPanel.addData(renderObject);
        }

        let color;
        if (this.topMenu) {
            color = this.topMenu.getColor();
        } else {
            color = '0xFF0000';
        }
        RenderMgr.getInstance().addRenderObject(renderObject, color);
    }

    public onResize() {
        if (!this.topMenu) { return; }
        const WIDTH = window.innerWidth * 5 / 6;
        const HEIGHT = window.innerHeight - this.topMenu.getTopMenuHeight();
        RenderMgr.getInstance().onWindowResize(WIDTH, HEIGHT);
    }

    public componentDidMount() {
        (window as any).xmath = xmath;
        (window as any).three = RenderMgr.getInstance();
        (window as any).doc = GeoDocument.getInstance();
        if (!this.topMenu) { return; }
        const WIDTH = window.innerWidth * 5 / 6;
        const HEIGHT = window.innerHeight - this.topMenu.getTopMenuHeight();
        RenderMgr.getInstance().initScene(this.canvasDom, WIDTH, HEIGHT);

        document.addEventListener('paste', this.onCtrlV.bind(this));
        window.addEventListener('resize', this.onResize.bind(this));

        // 目前先在此注册
        ActionManager.registerCommand(new DefaultCommand());
        ActionManager.registerCommand(new DrawLineCommand());
        ActionManager.registerCommand(new DrawRectCommand());
        ActionManager.registerCommand(new DrawArcCommand());
        ActionManager.registerCommand(new UndoRedoCommand());
        ActionManager.registerCommand(new DeleteCommand());
        ActionManager.registerCommand(new OffsetCommand());
        ActionManager.registerCommand(new ReverseCommand());
        ActionManager.registerCommand(new ExtrudeCommand());
        ActionManager.registerCommand(new MouseHouseCommand());
        ActionManager.registerCommand(new SaveCommand());
        ActionManager.registerCommand(new LoopCommand());
        ActionManager.registerCommand(new ParalellCommand());
        ActionManager.registerCommand(new ExtrudeShellCommand());
        ActionManager.registerCommand(new ConvexHullCommand());
        ActionManager.registerCommand(new MesureDistanceCommand());
        ActionManager.registerCommand(new MoveCommand());
        ActionManager.registerCommand(new AlignCommand());
        ActionManager.registerCommand(new ScaleCommand());
        ActionManager.registerCommand(new PtLoopPositonJudgeCmd());
        ActionManager.registerCommand(new BoolIntersectCommand());
        ActionManager.registerCommand(new BoolUnionCommand());
        ActionManager.registerCommand(new BoolSubtractCommand());
        ActionManager.registerCommand(new MirrorCommand());


        // 注册观察者
        GeoDocEventHandler.getInstance().register(this);
        SelectionChangedHandler.getInstance().register(this);

        // 绑定键盘事件
        KeyBoardEventHandler.getInstance().bind();

        // 检测键盘是否按下
        /* 
            keyCode 16 = Shift_L
            keyCode 17 = Control_L
            keyCode 18 = Alt_L
        */
        document.onkeydown = (event) => {
            const e = event || window.event;
            if (16 === e.keyCode) {
                KeyBoardEventHandler.getInstance().shift = true;
            } else if (17 === e.keyCode) {
                KeyBoardEventHandler.getInstance().ctrl = true;
            }
        };
        document.onkeyup = (event) => {
            const e = event || window.event;
            if (16 === e.keyCode) {
                KeyBoardEventHandler.getInstance().shift = false;
            } else if (17 === e.keyCode) {
                KeyBoardEventHandler.getInstance().ctrl = false;
            }
        };


        const storage = window.localStorage;
        const str = storage.getItem('doc');
        this._onCtrlV(str + '');
    }

    public componentWillUnmount() {
        document.removeEventListener('paste', this.onCtrlV.bind(this));
        window.removeEventListener('resize', this.onResize.bind(this));

        // 解除注册观察者
        GeoDocEventHandler.getInstance().unregister(this);
        SelectionChangedHandler.getInstance().unregister(this);

        // 解绑键盘事件
        KeyBoardEventHandler.getInstance().unbind();
    }

    public showInfo(info: string) {
        this.setState({ info });
    }

    public eventToWorldPos(e: React.MouseEvent<HTMLDivElement>): Vector2 {
        if (!this.topMenu) {
            return Vector2.zero();
        }
        const x = e.clientX - window.innerWidth / 6;
        const y = e.clientY - this.topMenu.getTopMenuHeight();
        return new Vector2(x, y);
    }

    public onMouseDown(e: React.MouseEvent<HTMLDivElement>) {
        // TODO MouseEvent封装了ctrl + alt + shift，使用MouseEvent代替
        const pos = this.eventToWorldPos(e);
        let ok = false;
        if (e.button === 2) {
            ok = ActionManager.processMouseEvent(this, EnMouseEventType.RButtonDown, pos);
        } else if (e.button === 0) {
            this.dragOriginPos = pos.clone();
            ok = ActionManager.processMouseEvent(this, EnMouseEventType.LButtonDown, pos);
        }

        if (ok) {
            e.stopPropagation();
        }
    }

    public onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
        const pos = this.eventToWorldPos(e);
        let ok = false;
        if (this.dragOriginPos) {
            ok = ActionManager.processMouseEvent(this, EnMouseEventType.LButtonDrag, this.dragOriginPos.clone(), pos);
            this.dragOriginPos = pos.clone();
        } else {
            ok = ActionManager.processMouseEvent(this, EnMouseEventType.MouseMove, pos);
        }

        if (ok) {
            e.stopPropagation();
        }
        const p = RenderMgr.getInstance().screenPtToWorld3d(pos.x, pos.y);
        this.showInfo(`${Math.round(p.x)},${Math.round(p.y)}`);
    }

    public onMouseUp(e: React.MouseEvent<HTMLDivElement>) {
        this.dragOriginPos = undefined;

        const pos = this.eventToWorldPos(e);
        let ok = false;
        if (e.button === 2) {
            ok = ActionManager.processMouseEvent(this, EnMouseEventType.RButtonUp, pos);
        } else if (e.button === 0) {
            ok = ActionManager.processMouseEvent(this, EnMouseEventType.LButtonUp, pos);
        }

        if (ok) {
            e.stopPropagation();
        }
    }

    public render() {
        const { info } = this.state;
        return (
            <div>
                <TopMenu mainWindow={this} ref={(topMenu) => this.topMenu = topMenu as TopMenu} />

                <div className='col-md-12 mainWindow' >
                    <LeftPanel ref={(ref) => this.leftPanel = ref} />

                    <div className='col-md-10 canvas'
                        ref={(div) => { this.canvasDom = div; }}
                        onMouseDown={(e) => this.onMouseDown(e)}
                        onMouseMove={(e) => this.onMouseMove(e)}
                        onMouseUp={(e) => this.onMouseUp(e)}
                    />
                </div>

                <div className='bottomInfo'>
                    <div id='pageup' style={{ display: 'inline - block' }}>{info}</div>
                </div>
            </div >
        );
    }
}

export { MainWindow };
