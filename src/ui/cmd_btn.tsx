/* tslint:disable:no-void-expression */
import * as React from 'react';
import { ActionManager } from '../action/actionmanager';

interface Props {
    cmdId: string;
    title: string;
    font: string;
    onDoubleClick?: React.MouseEventHandler;
}

class CmdBtn extends React.Component<Props> {
    public render() {
        return (
            <a
                className='btn'
                href='#'
                title={this.props.title}
                onDoubleClick={(e) => {
                    if (this.props.onDoubleClick) {
                        this.props.onDoubleClick(e);
                    }
                }}
                onClick={() => ActionManager.sendCommand(this.props.cmdId)}>
                <i className={`fa ${this.props.font}  fa-lg`} />
            </a>
        );
    }
}

export default CmdBtn;

