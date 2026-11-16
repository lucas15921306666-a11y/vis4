
import React, {
  useState,
  useEffect,
  useCallback
} from 'react';

import useWebSocketImport, {
  ReadyState
} from 'react-use-websocket';

import './App.css';

import Header from './Header';
import Sidebar from './Sidebar';
import MainContent from './MainContent';

const useWebSocket =
  useWebSocketImport.default || useWebSocketImport;

function App() {
  const [total, setTotal] = useState(0);
  const [history, setHistory] = useState([]);

  const {
    sendMessage,
    lastMessage,
    readyState
  } = useWebSocket('ws://localhost:8080', {
    shouldReconnect: () => true,
  });

  // Shared actions for React and Arduino.
  const performAction = useCallback((action) => {
    switch (action) {
      case '+1':
        setTotal(prev => prev + 1);
        setHistory(prev => [...prev, '+1']);
        break;

      case '+2':
        setTotal(prev => prev + 2);
        setHistory(prev => [...prev, '+2']);
        break;

      case '-1':
        setTotal(prev => prev - 1);
        setHistory(prev => [...prev, '-1']);
        break;

      case '-2':
        setTotal(prev => prev - 2);
        setHistory(prev => [...prev, '-2']);
        break;

      case 'reset':
        setTotal(0);
        setHistory(prev => [...prev, 'Reset']);
        break;

      case 'clear':
        setTotal(0);
        setHistory([]);
        break;

      default:
        break;
    }
  }, []);

  // Arduino -> React
  useEffect(() => {
    if (!lastMessage) return;

    try {
      const data = JSON.parse(lastMessage.data);

      if (typeof data.button === 'string') {
        performAction(data.button);
      }
    } catch {
      // Ignore non-JSON messages.
    }
  }, [lastMessage, performAction]);

  // React -> Arduino
  useEffect(() => {
    if (readyState === ReadyState.OPEN) {
      sendMessage('TOTAL:' + total);
    }
  }, [total, readyState, sendMessage]);

  return (
    <div>
      <Header
        connected={readyState === ReadyState.OPEN}
      />

      <div id="main-content">
        <Sidebar
          total={total}
          history={history}
          onClear={() => performAction('clear')}
        />

        <MainContent
          onAddOne={() => performAction('+1')}
          onAddTwo={() => performAction('+2')}
          onRemoveOne={() => performAction('-1')}
          onRemoveTwo={() => performAction('-2')}
          onReset={() => performAction('reset')}
          onClear={() => performAction('clear')}
        />
      </div>
    </div>
  );
}

export default App;
