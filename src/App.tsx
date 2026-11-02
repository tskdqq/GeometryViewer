import './App.css';

import * as React from 'react';

import { MainWindow } from './ui/MainWindow';

class App extends React.Component {
  public render() {
    return (
      <div className='App'>
        <MainWindow />
      </div>
    );
  }
}

export default App;

