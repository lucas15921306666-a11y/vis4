
import React from 'react';

function MainContent({
  onAddOne,
  onAddTwo,
  onReset,
  onRemoveOne,
  onRemoveTwo,
  onClear
}) {
  return (
    <div className="content">
      <h3>Control Center</h3>

      <div className="buttonControls">
        <button onClick={onRemoveTwo}>-2</button>
        <button onClick={onRemoveOne}>-1</button>
        <button onClick={onReset}>Reset</button>
        <button onClick={onAddOne}>+1</button>
        <button onClick={onAddTwo}>+2</button>
      </div>

      <button
        className="clearButton"
        onClick={onClear}
      >
        Clear History & Results
      </button>
    </div>
  );
}

export default MainContent;
