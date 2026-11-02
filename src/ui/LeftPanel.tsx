import 'antd/dist/antd.css';
import './LeftPanel.css';

import { Tree } from 'antd';
import * as ClipboardJS from 'clipboard';
import * as React from 'react';

/* tslint:disable:max-line-length  */
import { Selection } from '../action/selection';
import { RenderObject } from '../algorithm/discrete/render_object';
import { RenderMgr } from '../threejs/RenderMgr';
import { LogUtil } from '../util/log_util';
import { GeoDocument } from './geo_document';
import { KeyBoardEventHandler } from '../event_handler/key_board_event_handler';

// import { LogUtil } from '../util/log_util';

const { TreeNode } = Tree;

// interface Props {
//     //
// }

interface State {
    allRenderObjects: RenderObject[];
}

class LeftPanel extends React.Component<{}, State> {
    public state: State = {
        allRenderObjects: []
    };

    public clipboardJS?: ClipboardJS;
    public span?: HTMLSpanElement;

    public onClearAll() {
        this.setState({ allRenderObjects: [] });
        RenderMgr.getInstance().clearAllGeometries();
    }

    public addData(geo: RenderObject) {
        const { allRenderObjects: all } = this.state;
        all.push(geo);
        this.setState({ allRenderObjects: all });
    }

    public setData(geos: (RenderObject | undefined)[]) {
        this.setState({
            allRenderObjects: geos.filter(g => {
                return g !== undefined;
            }) as any
        });
    }

    public onTreeNodeSelect(idTreeNode: string[]) {
        if (idTreeNode.length < 1) {
            Selection.getInstance().clear();
            return;
        }
        const id = this.keyToId(idTreeNode[0]);
        if (KeyBoardEventHandler.getInstance().ctrl) {
            // 按住Ctrl，支持多选
            Selection.getInstance().add(id);
        } else {
            Selection.getInstance().reset(id);
        }
    }

    public componentDidMount() {
        /* tslint:disable:no-unused-expression  */
        new ClipboardJS(
            '#copyCurGeoBtn', {
                text: () => {
                    const allGeos = Selection.getInstance().getSelectedIds();
                    if (allGeos && allGeos.length > 0) {
                        const geos = GeoDocument.getInstance().getGeoById(allGeos[0]);
                        if (geos) {
                            const s = LogUtil.asString(geos);
                            return s;
                        }
                    }
                    return '';
                }
            });

        new ClipboardJS(
            '#copyAllStringBtn',
            {
                text: () => {
                    const allGeos = GeoDocument.getInstance().getAllData();
                    const s = LogUtil.asString(allGeos);
                    return s;
                }
            });
        /* tslint:enable:no-unused-expression  */
    }

    public componentWillUnmount() {
        if (this.clipboardJS) { this.clipboardJS.destroy(); }
    }

    public renderObjectToTreeNode(render: RenderObject) {
        return (
            <TreeNode title={render.name} key={this.idToKey(render.geoId)} >
                {
                    (render.children !== undefined && render.children.length > 0) ?
                        render.children.map((r) => {
                            return this.renderObjectToTreeNode(r);
                        })
                        : []
                }
            </TreeNode>
        );
    }

    public render() {
        const { allRenderObjects } = this.state;

        return (
            <div className='col-md-2 leftPanel noselect'
                tabIndex={0}

                onClick={() => {
                    Selection.getInstance().clear();
                    return 1;
                }} >
                <div className='geoPanel'
                    style={{ height: window.innerHeight * 0.6 }}>

                    <Tree defaultExpandAll={false}
                        onClick={(ev) => {
                            ev.stopPropagation();
                            ev.preventDefault();
                        }}
                        onSelect={(str) => {
                            this.onTreeNodeSelect(str);
                        }}>

                        {
                            allRenderObjects.map((render) => {
                                return this.renderObjectToTreeNode(render);
                            })
                        }

                    </Tree>
                </div >
                <div style={{ height: window.innerHeight * 0.4 }}
                    className='infoPanel'>
                    <button id='copyCurGeoBtn' className='hide' >保存选择集到剪切板</button>
                    <button id='copyAllStringBtn' className='hide'>全部保存到剪切板</button>
                </div>
            </div >
        );
    }

    private idToKey(id: number) {
        return id + '.TreeNode';
    }

    private keyToId(key: string): number {
        return parseInt(key, 10);
    }
}

export default LeftPanel;

