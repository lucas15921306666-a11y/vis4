import React from 'react';

function Header({ connected }) {
  return (
    <div id="navbar">
      <h1>Lucas Number Adder</h1>
      <h4>Item 1</h4>
      <h4>Item 2</h4>
      <h4 style={{ color: connected ? 'var(--lime)' : 'var(--gray)' }}>
        Device: {connected ? 'connected' : 'not connected'}
      </h4>
    </div>
  );
}

export default Header;
