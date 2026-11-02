/* tslint:disable:no-void-expression */
import * as React from 'react';
import { TwitterPicker } from 'react-color';

import TopMenu from './TopMenu';

interface Props {
    parent: TopMenu;
}

interface State {
    displayColorPicker: boolean;
    color: string;
}

class PickColorButton extends React.Component<Props, State> {

    public state: State = {
        displayColorPicker: false,
        color: '#ff0103'
    };

    public colors = ['#ff0103', '#ff7e04', '#feff04', '#89fd06', '#07fd02', '#25ed82', '#10f8ff', '#0880f1', '#7d02ff', '#ff00ff', '#f8037c'];
    public colorIdx: number = 0;

    public getColor() {
        const curColor = this.colors[this.colorIdx];
        this.colorIdx = (this.colorIdx + 1) % this.colors.length;
        const c = this.colors[this.colorIdx];
        this.setState({ color: c });
        return curColor;
    }

    public onColorChanged = (e: any) => {
        if (e.hex) {
            this.setState({ color: e.hex });
        } else {
            console.error(e);
            console.error('没有获取到颜色值');
        }
    }

    public handleClick = () => {
        this.setState({ displayColorPicker: !this.state.displayColorPicker });
    }

    public handleClose = () => {
        this.setState({ displayColorPicker: false });
    }

    public render() {
        return (
            <span onClick={() => this.handleClick()} >
                <a className='btn btn-default' style={{ backgroundColor: this.state.color }} title='选择颜色'>
                    &nbsp;&nbsp;&nbsp;
                </a>

                {
                    this.state.displayColorPicker ?
                        <div style={{
                            position: 'absolute',
                            zIndex: 2
                        }}>
                            <div style={{
                                position: 'fixed',
                                top: 0,
                                right: 100,
                                bottom: 0,
                                left: 100
                            }} onClick={this.handleClose} />
                            <TwitterPicker
                                colors={this.colors}
                                onChangeComplete={this.onColorChanged} />
                        </div>
                        : undefined
                }
            </span>
        );
    }
}

export default PickColorButton;
