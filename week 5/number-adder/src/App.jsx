
import React, { useState } from 'react';
import './App.css';

import Header from './Header';
import Sidebar from './Sidebar';
import MainContent from './MainContent';

function App() {

  const [total, setTotal] = useState(0);
  const [history, setHistory] = useState([]);

  function handleAddOne() {
    setTotal(prev => prev + 1);
    setHistory(prev => [...prev, '+1']);
  }

  function handleAddTwo() {
    setTotal(prev => prev + 2);
    setHistory(prev => [...prev, '+2']);
  }

  function handleRemoveOne() {
    setTotal(prev => prev - 1);
    setHistory(prev => [...prev, '-1']);
  }

  function handleRemoveTwo() {
    setTotal(prev => prev - 2);
    setHistory(prev => [...prev, '-2']);
  }

  // Reset only the total
  function handleReset() {
    setTotal(0);
    setHistory(prev => [...prev, 'Reset']);
  }

  // Clear both total and history
  function handleClear() {
    setTotal(0);
    setHistory([]);
  }

  return (
    <div>
      <Header />

      <div id="main-content">

        <Sidebar
          total={total}
          history={history}
        />

        <MainContent
          onAddOne={handleAddOne}
          onAddTwo={handleAddTwo}
          onRemoveOne={handleRemoveOne}
          onRemoveTwo={handleRemoveTwo}
          onReset={handleReset}
          onClear={handleClear}
        />

      </div>
    </div>
  );
}

export default App;
