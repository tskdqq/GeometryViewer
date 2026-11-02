import './TopMenu.css';

/* tslint:disable:no-void-expression */
/* tslint:disable:no-null-keyword */
import * as React from 'react';
import { Button, Modal } from 'react-bootstrap';

import { CommandString } from '../action/command_string';
import { RenderMgr } from '../threejs/RenderMgr';
import { AlgTest } from './algtest';
import PickColorButton from './ColorPicker';
import { GeoDocument } from './geo_document';
import { MainWindow } from './MainWindow';
import CmdBtn from './cmd_btn';

interface Props {
    mainWindow: MainWindow;
}

interface State {
    showModal: boolean;
}

class TopMenu extends React.Component<Props, State> {
    public state: State = {
        showModal: false
    };
    private pickColorBtn: PickColorButton | null = null;
    private topDiv: HTMLDivElement | null = null;

    public getColor() {
        if (this.pickColorBtn) {
            // 
            return this.pickColorBtn.getColor();
        }
        return '0xFF0000';
    }

    public getTopMenuHeight(): number {
        if (this.topDiv) { return this.topDiv.clientHeight; }
        console.error('无法获取高度');
        return -1;
    }

    public componentDidMount() {
        setTimeout(() => { this.onPasete(); }, 500);
    }

    public onPasete() {
        new AlgTest().test(this.props.mainWindow);
    }

    public render() {
        const dialog = (
            <Modal show={this.state.showModal} onHide={() => this.setState({ showModal: false })}>
                <Modal.Header  >
                    <Modal.Title>关于-几何查看器</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <ol>
                        <li>使用方法
                            <p>拷贝几何的asString()字符串，在本页面ctrl+v即可可视化几何</p>
                            <p>例如二维直线：{'{"type":201,"origin":{"type":200,"x":0,"y":0},"dir":{"type":200,"x":-1,"y":0},"range":[0,400]}'}</p>
                        </li>
                        <li>快捷键：
                            <p>拷贝选中几何 ctrl+c</p>
                            <p>旋转视图 ctrl+中键</p>
                            <p>撤销 ctrl+z</p>
                            <p>回退 ctrl+y</p>
                            <p>结束当前命令 esc</p>
                            <p>del 删除选中</p>
                            <p>直线 L</p>
                            <p>矩形 G</p>
                            <p>偏移 O</p>
                            <p>反向 R</p>
                            <p>高亮上一个几何元素 up</p>
                            <p>高亮下一个几何元素 down</p>
                        </li>
                        <li>
                            <a href='http://116.62.100.239:8443/jtl3d-tools/GeometryViewer' target='_blank'>git地址</a>
                            <p> http://116.62.100.239:8443/jtl3d-tools/GeometryViewer</p>
                        </li>
                        <li>
                            todo
                            <ul>
                                <li>支持线宽</li>
                                <li>显示和隐藏选中的几何体</li>
                                <li>在树形结构上右键，然后asString,可将选中的几何体序列化为字符串，并拷贝到剪切板中</li>
                                <li>选中几何体可以在左下角显示更详细的信息</li>
                                <li>鼠标可以捕捉点，并显示点的坐标值</li>
                                <li>直线的方向箭头不随视图缩放而缩放</li>
                            </ul>
                        </li>
                    </ol>
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={() => this.setState({ showModal: false })}>取消</Button>
                </Modal.Footer>
            </Modal>);

        return (
            <div className='topMenu' ref={(div) => this.topDiv = div}>
                {dialog}

                <div>
                    <PickColorButton
                        parent={this}
                        ref={(btn) => this.pickColorBtn = btn}
                    />
                    <a className='btn' href='#' title='XY平面' onClick={() => RenderMgr.getInstance().lookAt('xy')}> XY </a>
                    {/* <a className='btn' href='#' title='XZ平面' onClick={() => RenderMgr.getInstance().lookAt('xz')} > XZ</a> */}
                    <a className='btn' href='#' title='解锁旋转' onClick={() => {
                        RenderMgr.getInstance().toggleRotate();

                    }}>
                        <i color='red' className='fa fa-unlock-alt fa-lg' />
                    </a>

                    <a className='btn' href='#' title='网格' onClick={() => RenderMgr.getInstance().showOrHideGrid()}>
                        <i className='fa fa-th fa-lg' />
                    </a>

                    <a className='btn' href='#' title='调试' onClick={() => this.onPasete()}>
                        <i className='fa fa-bug fa-lg' />
                    </a>

                    {/* <CmdBtn title='删除选中' font='fa-remove' cmdId={CommandString.DELETE} /> */}
                    <a className='btn' href='#' title='清空所有' onClick={() => GeoDocument.getInstance().clear()}>
                        <i color='red' className='fa fa-trash-o fa-lg' />
                    </a>
                    {/* <a className='btn' href='#' title='撤销(Ctrl+Z)'
                        onClick={() => {
                            ActionManager.sendCommand(CommandString.UNDO_REDO, true);
                        }}>
                        <i className='fa fa-undo fa-lg' />
                    </a>

                    <a className='btn' href='#' title='回退(Ctrl+Y)'
                        onClick={() => {
                            ActionManager.sendCommand(CommandString.UNDO_REDO);
                        }}>
                        <i className='fa fa-repeat fa-lg' />
                    </a> */}
                    <CmdBtn title='保存所有几何到剪切板(ctrl+s)' font='fa-save' cmdId={CommandString.SAVE} />
                    <CmdBtn title='直线 (L)' font='fa-arrows-h' cmdId={CommandString.DRAW_LINE_ACTION} />
                    <CmdBtn title='矩形 (G)' font='fa-square-o' cmdId={CommandString.DRAW_RECT_ACTION} />
                    <CmdBtn title='弧形' font='fa-circle-o-notch' cmdId={CommandString.DRAW_ARC_ACTION} />
                    <CmdBtn title='拉伸体' font='fa-cube' cmdId={CommandString.EXTRUDE} />
                    <CmdBtn title='拉伸shell' font='fa-dropbox' cmdId={CommandString.EXTRUDE_SHELL} />
                    <CmdBtn title='测距' font='fa-arrows-h' cmdId={CommandString.MESURE_DISTANCE} />
                    <CmdBtn title='移动' font='fa-arrows' cmdId={CommandString.MOVE} />
                    {/* <CmdBtn title='旋转' font='fa-arrows' cmdId={CommandString.ROTATE} /> */}
                    <CmdBtn title='缩放' font='fa-arrows-alt' cmdId={CommandString.SCALE} />
                    <CmdBtn title='对称' font='fa-balance-scale' cmdId={CommandString.MIRROR} />
                    <CmdBtn title='量房' font='fa-home' cmdId={CommandString.MESURE_HOUSE} />
                    <CmdBtn title='点与loop位置关系' font='fa-home' cmdId={CommandString.PT_LOOP_PJ} />
                    <CmdBtn
                        title='凸包（以视图中的二维直线作为输入，计算凸包）'
                        font='fa-connectdevelop'
                        cmdId={CommandString.CONVEX_HULL} />
                    {/* <CmdBtn title='构造polygon' font='fa-object-group' cmdId={CommandString.REVERSE} /> */}
                    <CmdBtn title='成环/分解' font='fa-object-ungroup' cmdId={CommandString.LOOP} />
                    <CmdBtn title='反向(r)' font='fa-exchange' cmdId={CommandString.REVERSE} />
                    <CmdBtn title='布尔交' font='fa-plus' cmdId={CommandString.BOOLINTERSECT} />
                    <CmdBtn title='布尔并' font='fa-circle' cmdId={CommandString.BOOLUNION} />
                    <CmdBtn title='布尔差' font='fa-plus-circle' cmdId={CommandString.BOOLSUBTRACT} />

                    <a className='btn' href='#' title='关于' onClick={() => this.setState({ showModal: true })} >
                        <i className='fa fa-info fa-lg' />
                    </a>

                </div>
            </div >
        );
    }
}

export default TopMenu;

